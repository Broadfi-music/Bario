// Polling orchestrator — staggered launch + MusicGen-Melody + MiniMax + Stereo fallback.
//
// Pipeline:
//   cleaning   → Demucs vocal isolation
//   analyzing  → BPM/key/duration extraction
//   generating → 3 engines launched 12s apart to dodge Replicate 429s
//                slot 0: MusicGen-Melody  (vocal as melody reference) ← KEY ENGINE
//                slot 1: MiniMax music-1.5 (instrumental, lyrics+style prompt)
//                slot 2: MusicGen-Stereo  (text-only fallback)
//   mastering  → RoEx mix+master per finished variation
//   done       → all 3 finalized

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Pinned versions for stability (avoids 404s on official-model endpoint)
const MUSICGEN_VERSION = "671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb"; // meta/musicgen
const STAGGER_MS = 12_000; // 12s between launches → stays under 6/min free tier limit

// ============ Replicate helpers ============
async function checkPrediction(predictionId: string) {
  const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
    headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Check prediction failed: ${await res.text()}`);
  return await res.json();
}

async function startVersion(version: string, input: Record<string, unknown>) {
  const res = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ version, input }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Replicate version failed (${res.status}): ${text.slice(0, 240)}`);
  return JSON.parse(text);
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
  const parts: string[] = ["instrumental only, no vocals, no lyrics, no singing"];
  if (genre) parts.push(`${genre} production`);
  parts.push(`${bpm} BPM`, `key of ${key}`);
  if (userPrompt) parts.push(userPrompt.replace(/[^\w\s,.\-]/g, "").slice(0, 180));
  parts.push("clean modern mix, professional arrangement");
  return parts.join(", ").slice(0, 320);
}

// Generate placeholder lyrics for MiniMax (it requires a lyrics field)
async function generateLyrics(genre: string, durationSeconds: number): Promise<string> {
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: "You write short song lyrics. Return ONLY the lyrics with [verse] and [chorus] tags. No commentary.",
          },
          {
            role: "user",
            content: `Write short ${genre || "pop"} lyrics for a ~${Math.round(durationSeconds)}s song. Use [verse] and [chorus] tags. 4-6 lines per section. Keep it simple and singable.`,
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Lovable AI ${res.status}`);
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || "";
    return text.trim() || "[verse]\nFeel the rhythm, hear the sound\n[chorus]\nWe're alive, we're alive";
  } catch (e) {
    console.warn("Lyrics generation failed, using fallback:", e);
    return "[verse]\nFeel the rhythm, hear the sound\nMoving forward, never down\n[chorus]\nWe're alive, we're alive\nFeel the music come to life";
  }
}

// ============ Engine launchers ============
async function launchMusicGenMelody(beatPrompt: string, vocalUrl: string, duration: number) {
  return await startVersion(MUSICGEN_VERSION, {
    model_version: "stereo-melody-large",
    prompt: beatPrompt,
    input_audio: vocalUrl,
    duration: Math.min(30, Math.max(8, Math.round(duration))),
    continuation: false,
    normalization_strategy: "peak",
    output_format: "wav",
  });
}

async function launchMiniMax(lyrics: string, genre: string, bpm: number) {
  // minimax/music-1.5 — instrumental song generation
  return await startOfficialModel("minimax", "music-1.5", {
    lyrics,
    song_file: undefined, // skip — we want fresh instrumental
    voice_id: "Instrumental",
    instrumental_id: "Instrumental",
    sample_rate: 44100,
    bitrate: 256000,
    format: "mp3",
    // MiniMax respects general style hints in lyrics, but we add a stylistic header
  }).catch(async () => {
    // Some versions of minimax/music-1.5 use a slightly different schema — fallback shape
    return await startOfficialModel("minimax", "music-1.5", {
      lyrics: `[style]${genre || "pop"}, ${bpm} BPM, instrumental, no vocals[/style]\n${lyrics}`,
      sample_rate: 44100,
      bitrate: 256000,
      format: "mp3",
    });
  });
}

async function launchMusicGenStereo(beatPrompt: string, duration: number) {
  return await startVersion(MUSICGEN_VERSION, {
    model_version: "stereo-large",
    prompt: beatPrompt + ", different arrangement, alternative vibe",
    duration: Math.min(30, Math.max(8, Math.round(duration))),
    normalization_strategy: "peak",
    output_format: "wav",
  });
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

// Try to launch a single slot, with up to 3 retries on 429
async function tryLaunchSlot(slotIdx: number, project: Record<string, unknown>): Promise<{ id: string; error: string }> {
  const beatPrompt = String(project.generated_prompt || "");
  const cleanVocal = String(project.clean_vocal_url || "");
  const duration = Number(project.vocal_duration_seconds) || 30;
  const bpm = Number(project.vocal_bpm) || 100;
  const genre = String(project.genre || "pop");

  let lastErr = "";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      let pred;
      if (slotIdx === 0) {
        pred = await launchMusicGenMelody(beatPrompt, cleanVocal, duration);
      } else if (slotIdx === 1) {
        const lyrics = await generateLyrics(genre, duration);
        pred = await launchMiniMax(lyrics, genre, bpm);
      } else {
        pred = await launchMusicGenStereo(beatPrompt, duration);
      }
      console.log(`Slot ${slotIdx} launched:`, pred.id);
      return { id: pred.id, error: "" };
    } catch (e) {
      lastErr = (e as Error).message;
      console.warn(`Slot ${slotIdx} attempt ${attempt + 1} failed:`, lastErr);
      if (lastErr.includes("429")) {
        await new Promise((r) => setTimeout(r, 11_000 * (attempt + 1)));
        continue;
      }
      break; // non-429 errors aren't worth retrying
    }
  }
  return { id: "", error: lastErr || "Unknown error" };
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

      const out = pred.output;
      let cleanUrl = "";
      if (out && typeof out === "object" && !Array.isArray(out)) {
        cleanUrl = (out as Record<string, string>).vocals || (out as Record<string, string>).Vocals || "";
      }
      if (!cleanUrl) cleanUrl = extractAudioUrl(out) || project.original_vocal_url;
      const storedClean = await storeToStorage(cleanUrl, user.id, projectId, "clean_vocal.wav");

      // Run analysis + set up staggered launch schedule
      let bpm = 100, key = "C minor", energy = 0.1, duration = 30;
      try {
        const analysis = await invokeEdgeFunction("vocal-analyze", { audioUrl: storedClean }, authHeader);
        const a = analysis.analysis || {};
        bpm = Math.max(60, Math.min(180, Number(a.bpm) || 100));
        key = String(a.key || "C minor");
        energy = Number(a.energy) || 0.1;
        duration = Math.max(8, Math.min(60, Number(a.duration) || 30));
      } catch (e) {
        console.warn("Analysis failed, using defaults:", e);
      }

      const userPrompt = project.user_prompt || project.description || "";
      const genreHint = project.genre || "";
      const beatPrompt = buildBeatPrompt(userPrompt, genreHint, bpm, key);

      // Set up 3 slots with staggered launch times (immediate, +12s, +24s)
      const now = Date.now();
      const launchAt = [
        new Date(now).toISOString(),
        new Date(now + STAGGER_MS).toISOString(),
        new Date(now + STAGGER_MS * 2).toISOString(),
      ];

      await supabaseAdmin.from("vocal_projects").update({
        clean_vocal_url: storedClean,
        status: "generating",
        current_prediction_id: null,
        vocal_bpm: bpm,
        vocal_key: key,
        vocal_energy: energy,
        vocal_duration_seconds: duration,
        generated_prompt: beatPrompt,
        variation_engines: ["musicgen-melody", "minimax-music-1.5", "musicgen-stereo"],
        variation_statuses: ["queued", "queued", "queued"],
        variation_prediction_ids: ["", "", ""],
        variation_errors: ["", "", ""],
        variation_launch_at: launchAt,
        beat_urls: [],
        mastered_urls: [],
      }).eq("id", projectId);

      const { data: updated } = await supabaseAdmin.from("vocal_projects")
        .select("*").eq("id", projectId).single();
      return new Response(JSON.stringify({ success: true, project: updated }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== STAGE: generating + mastering (per-variation) =====
    if (project.status === "generating" || project.status === "mastering") {
      const variationIds: string[] = [...((project.variation_prediction_ids || []) as string[])];
      const variationStatuses: string[] = [...((project.variation_statuses || []) as string[])];
      const variationErrors: string[] = [...((project.variation_errors || []) as string[])];
      const variationLaunchAt: string[] = (project.variation_launch_at || []) as string[];
      const beatUrls: string[] = [...((project.beat_urls || []) as string[])];
      // Ensure arrays are sized
      while (beatUrls.length < 3) beatUrls.push("");
      while (variationErrors.length < 3) variationErrors.push("");

      let mutated = false;
      const now = Date.now();

      for (let i = 0; i < 3; i += 1) {
        const status = variationStatuses[i];
        if (status === "done" || status === "failed") continue;

        // QUEUED → check launch time, then launch
        if (status === "queued") {
          const dueAt = variationLaunchAt[i] ? new Date(variationLaunchAt[i]).getTime() : 0;
          if (now < dueAt) continue; // not yet
          // Launch this slot now
          const result = await tryLaunchSlot(i, project);
          if (result.id) {
            variationIds[i] = result.id;
            variationStatuses[i] = "generating";
            variationErrors[i] = "";
          } else {
            variationStatuses[i] = "failed";
            variationErrors[i] = result.error.slice(0, 240);
          }
          mutated = true;
          continue;
        }

        // GENERATING → poll prediction
        if (status === "generating" && variationIds[i]) {
          const pred = await checkPrediction(variationIds[i]);
          if (pred.status === "starting" || pred.status === "processing") continue;
          if (pred.status === "failed" || pred.status === "canceled") {
            console.log(`Slot ${i} prediction failed:`, pred.error);
            variationStatuses[i] = "failed";
            variationErrors[i] = (pred.error || "Generation failed").toString().slice(0, 240);
            mutated = true;
            continue;
          }
          // Succeeded — store the beat
          const beatUrl = extractAudioUrl(pred.output);
          if (!beatUrl) {
            variationStatuses[i] = "failed";
            variationErrors[i] = "No audio in output";
            mutated = true;
            continue;
          }
          const ext = beatUrl.includes(".mp3") ? "mp3" : "wav";
          const storedBeat = await storeToStorage(
            beatUrl, user.id, projectId, `beat_v${i + 1}.${ext}`,
          );
          beatUrls[i] = storedBeat;
          variationStatuses[i] = "mastering";
          mutated = true;

          // Background mastering
          const ctx = (globalThis as unknown as { EdgeRuntime?: { waitUntil: (p: Promise<unknown>) => void } }).EdgeRuntime;
          const slotIdx = i;
          const masterTask = (async () => {
            try {
              const masterRes = await invokeEdgeFunction("roex-mix-master", {
                vocalUrl: project.clean_vocal_url,
                instrumentalUrl: storedBeat,
                projectId,
                variationIndex: slotIdx,
                referenceUrl: project.reference_track_url || null,
                musicalStyle: (project.genre || "POP").toUpperCase().replace(/[^A-Z]/g, "_"),
              }, authHeader);

              const finalMastered = masterRes.masteredUrl || storedBeat;
              const { data: cur } = await supabaseAdmin.from("vocal_projects")
                .select("variation_statuses, mastered_urls").eq("id", projectId).single();
              const curStatuses = [...((cur?.variation_statuses || []) as string[])];
              const curMastered = [...((cur?.mastered_urls || []) as string[])];
              while (curMastered.length <= slotIdx) curMastered.push("");
              curStatuses[slotIdx] = "done";
              curMastered[slotIdx] = finalMastered;
              const allDone = curStatuses.every((s) => s === "done" || s === "failed");
              await supabaseAdmin.from("vocal_projects").update({
                variation_statuses: curStatuses,
                mastered_urls: curMastered,
                ...(allDone ? { status: "done", final_urls: curMastered.filter(Boolean) } : {}),
              }).eq("id", projectId);
              console.log(`Slot ${slotIdx} mastered`, finalMastered);
            } catch (e) {
              console.error(`Mastering ${slotIdx} failed, using raw beat:`, e);
              const { data: cur } = await supabaseAdmin.from("vocal_projects")
                .select("variation_statuses, mastered_urls, beat_urls").eq("id", projectId).single();
              const curStatuses = [...((cur?.variation_statuses || []) as string[])];
              const curMastered = [...((cur?.mastered_urls || []) as string[])];
              const curBeats = [...((cur?.beat_urls || []) as string[])];
              while (curMastered.length <= slotIdx) curMastered.push("");
              curStatuses[slotIdx] = "done";
              curMastered[slotIdx] = curBeats[slotIdx] || "";
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
          variation_prediction_ids: variationIds,
          variation_errors: variationErrors,
          beat_urls: beatUrls,
        }).eq("id", projectId);
      }

      // Finalize if all terminal
      const { data: cur } = await supabaseAdmin.from("vocal_projects").select("*").eq("id", projectId).single();
      const curStatuses = (cur?.variation_statuses || []) as string[];
      const allTerminal = curStatuses.length > 0 && curStatuses.every((s) => s === "done" || s === "failed");
      if (allTerminal && cur?.status !== "done") {
        const finals = ((cur?.mastered_urls || []) as string[]).filter(Boolean);
        const beats = ((cur?.beat_urls || []) as string[]).filter(Boolean);
        const useUrls = finals.length > 0 ? finals : beats;
        await supabaseAdmin.from("vocal_projects").update({
          status: useUrls.length > 0 ? "done" : "error",
          error_message: useUrls.length === 0
            ? "All engines failed. Try again — the melody-matching engine may be at capacity."
            : null,
          final_urls: useUrls,
        }).eq("id", projectId);
      }

      const { data: updated } = await supabaseAdmin.from("vocal_projects")
        .select("*").eq("id", projectId).single();
      return new Response(JSON.stringify({ success: true, project: updated }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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
