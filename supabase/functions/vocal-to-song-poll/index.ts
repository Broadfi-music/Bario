// Polling orchestrator for the rewritten pipeline.
//
// Statuses:
//   cleaning   → Demucs vocal isolation
//   analyzing  → vocal-analyze (BPM/key/energy)
//   generating → 3 parallel engines (MusicGen-Melody, MusicGen-Stereo, Stable Audio)
//   mastering  → RoEx mix+master per finished variation
//   done       → all 3 mastered_urls present (or partial after timeout)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const DEMUCS_VERSION = "25a173108cff36ef9f80f854c162d01df9e6528be175794b81158fa03836d953";

// Engines (Replicate model owner/name + version-aware launch)
const ENGINES = [
  { name: "musicgen-melody", model: "meta/musicgen", melody: true },
  { name: "musicgen-stereo", model: "meta/musicgen", melody: false },
  { name: "stable-audio-2.5", model: "stability-ai/stable-audio-2.5", melody: false },
] as const;

async function checkPrediction(predictionId: string) {
  const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
    headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Check prediction failed: ${await res.text()}`);
  return await res.json();
}

async function startOfficialModel(modelOwner: string, modelName: string, input: Record<string, unknown>) {
  const res = await fetch(`https://api.replicate.com/v1/models/${modelOwner}/${modelName}/predictions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Replicate ${modelOwner}/${modelName} failed (${res.status}): ${text.slice(0, 240)}`);
  return JSON.parse(text);
}

async function startVersion(version: string, input: Record<string, unknown>) {
  const res = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ version, input }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Replicate version ${version.slice(0, 12)} failed (${res.status}): ${text.slice(0, 240)}`);
  return JSON.parse(text);
}

function extractAudioUrl(output: unknown): string {
  if (typeof output === "string") return output;
  if (Array.isArray(output) && output.length > 0) {
    if (typeof output[0] === "string") return output[0];
    if (output[0] && typeof output[0] === "object" && "url" in output[0]) {
      return String((output[0] as Record<string, unknown>).url || "");
    }
  }
  if (output && typeof output === "object" && "url" in (output as Record<string, unknown>)) {
    return String((output as Record<string, unknown>).url || "");
  }
  const m = JSON.stringify(output).match(/https?:\/\/[^\s"\\]+\.(wav|mp3|mp4|ogg|flac|webm)/i);
  return m ? m[0] : "";
}

function getContentType(filename: string) {
  if (filename.endsWith(".mp3")) return "audio/mpeg";
  if (filename.endsWith(".ogg")) return "audio/ogg";
  if (filename.endsWith(".flac")) return "audio/flac";
  if (filename.endsWith(".webm")) return "audio/webm";
  return "audio/wav";
}

async function storeToStorage(url: string, userId: string, projectId: string, filename: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) return url;
    const buf = await res.arrayBuffer();
    const path = `${userId}/${projectId}/${filename}`;
    const { error } = await supabaseAdmin.storage
      .from("vocal-projects")
      .upload(path, new Uint8Array(buf), { contentType: getContentType(filename), upsert: true });
    if (error) return url;
    const { data: { publicUrl } } = supabaseAdmin.storage.from("vocal-projects").getPublicUrl(path);
    return publicUrl;
  } catch {
    return url;
  }
}

function buildBeatPrompt(userPrompt: string | null, genre: string | null, bpm: number, key: string): string {
  const parts: string[] = [];
  parts.push("instrumental only, no vocals");
  if (genre) parts.push(`${genre} production`);
  parts.push(`${bpm} BPM`);
  parts.push(`key of ${key}`);
  if (userPrompt) parts.push(userPrompt.replace(/[^\w\s,.\-]/g, "").slice(0, 180));
  parts.push("clean modern mix, professional arrangement");
  return parts.join(", ").slice(0, 320);
}

async function invokeEdgeFunction(name: string, body: unknown, authHeader: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
      apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${name} failed: ${text.slice(0, 200)}`);
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) throw new Error("Unauthorized");

    const { projectId } = await req.json();
    if (!projectId) throw new Error("projectId required");

    const { data: project, error: fetchErr } = await supabaseAdmin
      .from("vocal_projects").select("*").eq("id", projectId).single();
    if (fetchErr || !project) throw new Error("Project not found");
    if (project.user_id !== user.id) throw new Error("Unauthorized");

    console.log("Poll", projectId, "status", project.status);

    if (project.status === "done" || project.status === "error") {
      return new Response(JSON.stringify({ success: true, project }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== STAGE: cleaning (Demucs) =====
    if (project.status === "cleaning") {
      if (!project.current_prediction_id) {
        return new Response(JSON.stringify({ success: true, project }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const pred = await checkPrediction(project.current_prediction_id);
      if (pred.status === "starting" || pred.status === "processing") {
        return new Response(JSON.stringify({ success: true, project }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (pred.status === "failed" || pred.status === "canceled") {
        await supabaseAdmin.from("vocal_projects").update({
          status: "error",
          error_message: pred.error || "Vocal cleaning failed",
          current_prediction_id: null,
        }).eq("id", projectId);
        const { data: updated } = await supabaseAdmin.from("vocal_projects")
          .select("*").eq("id", projectId).single();
        return new Response(JSON.stringify({ success: true, project: updated }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Demucs returns { vocals: url, ... }
      const out = pred.output;
      let cleanUrl = "";
      if (out && typeof out === "object" && !Array.isArray(out)) {
        cleanUrl = (out as Record<string, string>).vocals || (out as Record<string, string>).Vocals || "";
      }
      if (!cleanUrl) cleanUrl = extractAudioUrl(out) || project.original_vocal_url;
      const storedClean = await storeToStorage(cleanUrl, user.id, projectId, "clean_vocal.wav");

      await supabaseAdmin.from("vocal_projects").update({
        clean_vocal_url: storedClean,
        status: "analyzing",
        current_prediction_id: null,
      }).eq("id", projectId);

      // Kick off analysis right away (synchronous edge call — fast)
      try {
        const analysis = await invokeEdgeFunction("vocal-analyze", { audioUrl: storedClean }, authHeader);
        const a = analysis.analysis || {};
        const bpm = Math.max(60, Math.min(180, Number(a.bpm) || 100));
        const key = String(a.key || "C minor");
        const energy = Number(a.energy) || 0.1;
        const duration = Math.max(8, Math.min(60, Number(a.duration) || 30));

        // Launch all 3 generators in parallel
        const userPrompt = project.user_prompt || project.description || "";
        const genreHint = project.genre || "";
        const beatPrompt = buildBeatPrompt(userPrompt, genreHint, bpm, key);
        console.log("Beat prompt:", beatPrompt);

        const launches = await Promise.allSettled([
          // V1: MusicGen-Melody (vocal as reference)
          startOfficialModel("meta", "musicgen", {
            model_version: "stereo-melody-large",
            prompt: beatPrompt,
            input_audio: storedClean,
            duration: Math.min(30, duration),
            continuation: false,
            normalization_strategy: "peak",
            output_format: "wav",
          }),
          // V2: MusicGen-Stereo (no melody ref)
          startOfficialModel("meta", "musicgen", {
            model_version: "stereo-large",
            prompt: beatPrompt + ", different arrangement, alternative vibe",
            duration: Math.min(30, duration),
            normalization_strategy: "peak",
            output_format: "wav",
          }),
          // V3: Stable Audio fallback
          startOfficialModel("stability-ai", "stable-audio-2.5", {
            prompt: beatPrompt + ", energetic version",
            duration: Math.min(45, duration + 5),
            steps: 8,
            cfg_scale: 6,
          }),
        ]);

        const variationIds = launches.map((l, i) => {
          if (l.status === "fulfilled") {
            console.log(`Engine ${i} launched:`, l.value.id);
            return l.value.id;
          }
          console.error(`Engine ${i} failed to launch:`, l.reason);
          return "";
        });
        const variationStatuses = launches.map((l) => l.status === "fulfilled" ? "generating" : "failed");

        await supabaseAdmin.from("vocal_projects").update({
          status: "generating",
          vocal_bpm: bpm,
          vocal_key: key,
          vocal_energy: energy,
          vocal_duration_seconds: duration,
          generated_prompt: beatPrompt,
          variation_prediction_ids: variationIds,
          variation_statuses: variationStatuses,
          beat_urls: [],
          mastered_urls: [],
        }).eq("id", projectId);
      } catch (e) {
        console.error("Analysis/launch failed:", e);
        await supabaseAdmin.from("vocal_projects").update({
          status: "error",
          error_message: (e as Error).message,
        }).eq("id", projectId);
      }

      const { data: updated } = await supabaseAdmin.from("vocal_projects")
        .select("*").eq("id", projectId).single();
      return new Response(JSON.stringify({ success: true, project: updated }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== STAGE: generating + mastering (per-variation) =====
    if (project.status === "generating" || project.status === "mastering") {
      const variationIds: string[] = (project.variation_prediction_ids || []) as string[];
      const variationStatuses: string[] = (project.variation_statuses || []) as string[];
      const beatUrls: string[] = (project.beat_urls || []) as string[];
      const masteredUrls: string[] = (project.mastered_urls || []) as string[];

      let mutated = false;
      for (let i = 0; i < variationIds.length; i += 1) {
        const status = variationStatuses[i];
        if (status === "done" || status === "failed") continue;

        // Generation phase
        if (status === "generating" && variationIds[i]) {
          const pred = await checkPrediction(variationIds[i]);
          if (pred.status === "starting" || pred.status === "processing") continue;
          if (pred.status === "failed" || pred.status === "canceled") {
            console.log(`Variation ${i} failed:`, pred.error);
            variationStatuses[i] = "failed";
            mutated = true;
            continue;
          }
          // Succeeded — store the beat
          const beatUrl = extractAudioUrl(pred.output);
          if (!beatUrl) {
            variationStatuses[i] = "failed";
            mutated = true;
            continue;
          }
          const storedBeat = await storeToStorage(
            beatUrl, user.id, projectId, `beat_v${i + 1}.wav`,
          );
          beatUrls[i] = storedBeat;

          // Kick off RoEx mix+master synchronously (fire and don't await — slow)
          variationStatuses[i] = "mastering";
          mutated = true;

          // Run mastering in background using EdgeRuntime.waitUntil
          const ctx = (globalThis as unknown as { EdgeRuntime?: { waitUntil: (p: Promise<unknown>) => void } }).EdgeRuntime;
          const masterTask = (async () => {
            try {
              const masterRes = await invokeEdgeFunction("roex-mix-master", {
                vocalUrl: project.clean_vocal_url,
                instrumentalUrl: storedBeat,
                projectId,
                variationIndex: i,
                referenceUrl: project.reference_track_url || null,
                musicalStyle: (project.genre || "POP").toUpperCase().replace(/[^A-Z]/g, "_"),
              }, authHeader);

              const finalMastered = masterRes.masteredUrl || storedBeat;
              const { data: cur } = await supabaseAdmin.from("vocal_projects")
                .select("variation_statuses, mastered_urls").eq("id", projectId).single();
              const curStatuses = [...((cur?.variation_statuses || []) as string[])];
              const curMastered = [...((cur?.mastered_urls || []) as string[])];
              while (curMastered.length <= i) curMastered.push("");
              curStatuses[i] = "done";
              curMastered[i] = finalMastered;
              const allDone = curStatuses.every((s) => s === "done" || s === "failed");
              await supabaseAdmin.from("vocal_projects").update({
                variation_statuses: curStatuses,
                mastered_urls: curMastered,
                ...(allDone ? { status: "done", final_urls: curMastered.filter(Boolean) } : {}),
              }).eq("id", projectId);
              console.log(`Variation ${i} mastered`, finalMastered);
            } catch (e) {
              console.error(`Mastering ${i} failed, falling back to raw beat:`, e);
              const { data: cur } = await supabaseAdmin.from("vocal_projects")
                .select("variation_statuses, mastered_urls, beat_urls").eq("id", projectId).single();
              const curStatuses = [...((cur?.variation_statuses || []) as string[])];
              const curMastered = [...((cur?.mastered_urls || []) as string[])];
              const curBeats = [...((cur?.beat_urls || []) as string[])];
              while (curMastered.length <= i) curMastered.push("");
              curStatuses[i] = "done";
              curMastered[i] = curBeats[i] || "";
              const allDone = curStatuses.every((s) => s === "done" || s === "failed");
              await supabaseAdmin.from("vocal_projects").update({
                variation_statuses: curStatuses,
                mastered_urls: curMastered,
                ...(allDone ? { status: "done", final_urls: curMastered.filter(Boolean) } : {}),
              }).eq("id", projectId);
            }
          })();
          if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(masterTask);
        }
      }

      if (mutated) {
        await supabaseAdmin.from("vocal_projects").update({
          variation_statuses: variationStatuses,
          beat_urls: beatUrls,
        }).eq("id", projectId);
      }

      // Check if everything is done or failed
      const { data: cur } = await supabaseAdmin.from("vocal_projects").select("*").eq("id", projectId).single();
      const curStatuses = (cur?.variation_statuses || []) as string[];
      const allTerminal = curStatuses.length > 0 && curStatuses.every((s) => s === "done" || s === "failed");
      if (allTerminal && cur?.status !== "done") {
        const masteredUrls = ((cur?.mastered_urls || []) as string[]).filter(Boolean);
        const beatUrls = ((cur?.beat_urls || []) as string[]).filter(Boolean);
        const finals = masteredUrls.length > 0 ? masteredUrls : beatUrls;
        await supabaseAdmin.from("vocal_projects").update({
          status: finals.length > 0 ? "done" : "error",
          error_message: finals.length === 0 ? "All variations failed to generate." : null,
          final_urls: finals,
        }).eq("id", projectId);
      }

      const { data: updated } = await supabaseAdmin.from("vocal_projects")
        .select("*").eq("id", projectId).single();
      return new Response(JSON.stringify({ success: true, project: updated }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Default: return current state
    return new Response(JSON.stringify({ success: true, project }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("vocal-to-song-poll error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
