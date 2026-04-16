import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const MODELS = {
  demucs: "25a173108cff36ef9f80f854c162d01df9e6528be175794b81158fa03836d953",
  whisper: "8099696689d249cf8b122d833c36ac3f75505c666a395ca40ef26f68e7d3d16e",
};

function sanitizeLyriaPrompt(prompt: string) {
  return prompt
    .replace(/reference\s+(?:artists?|producers?)(?:\/(?:artists?|producers?))?\s*:.*$/gim, "")
    .replace(/(?:artists?|producers?)\s+reference\s*:.*$/gim, "")
    .replace(/\b(?:inspired by|in the style of|similar to|like|à la)\b[^.\n]*/gim, "")
    .replace(/\b(?:The 1975|Billie Eilish|Finneas|Louis Bell)\b/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---------- Replicate helpers ----------

async function checkPrediction(predictionId: string) {
  const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
    headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Failed to check prediction: ${await res.text()}`);
  return await res.json();
}

async function startPrediction(version: string, input: Record<string, unknown>) {
  console.log("Starting prediction:", { version: version.slice(0, 12), inputKeys: Object.keys(input) });
  const res = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ version, input }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Replicate failed (${res.status}): ${body}`);
  const data = JSON.parse(body);
  console.log("Prediction started:", data.id);
  return data;
}

async function startOfficialModelPrediction(modelOwner: string, modelName: string, input: Record<string, unknown>) {
  console.log("Starting official model:", `${modelOwner}/${modelName}`);
  const res = await fetch(`https://api.replicate.com/v1/models/${modelOwner}/${modelName}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Official model failed (${res.status}): ${body}`);
  const data = JSON.parse(body);
  console.log("Official model prediction:", data.id, data.status);
  return data;
}

// ---------- Storage helper ----------

async function storeToStorage(url: string, userId: string, projectId: string, filename: string): Promise<string> {
  try {
    console.log("Storing:", filename);
    const res = await fetch(url);
    if (!res.ok) return url;
    const arrayBuffer = await res.arrayBuffer();
    const contentType = filename.endsWith(".mp3") ? "audio/mpeg" : "audio/wav";
    const path = `${userId}/${projectId}/${filename}`;
    const { error } = await supabaseAdmin.storage
      .from("vocal-projects")
      .upload(path, new Uint8Array(arrayBuffer), { contentType, upsert: true });
    if (error) { console.error("Upload error:", error); return url; }
    const { data: { publicUrl } } = supabaseAdmin.storage.from("vocal-projects").getPublicUrl(path);
    return publicUrl;
  } catch (e) {
    console.error("Storage error:", e);
    return url;
  }
}

// ---------- URL extraction helper ----------

function extractAudioUrl(output: unknown): string {
  if (typeof output === "string") return output;
  if (output && typeof output === "object" && "url" in (output as Record<string, unknown>))
    return (output as Record<string, string>).url;
  if (Array.isArray(output) && output.length > 0) {
    if (typeof output[0] === "string") return output[0];
    if (output[0]?.url) return output[0].url;
  }
  const urlMatch = JSON.stringify(output).match(/https?:\/\/[^\s"\\]+\.(wav|mp3|mp4|ogg|flac|webm)/i);
  return urlMatch ? urlMatch[0] : "";
}

// ---------- Main handler ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) throw new Error("Unauthorized");

    const { projectId } = await req.json();
    if (!projectId) throw new Error("projectId required");

    const { data: project, error: fetchErr } = await supabaseAdmin
      .from("vocal_projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (fetchErr || !project) throw new Error("Project not found");
    if (project.user_id !== user.id) throw new Error("Unauthorized");

    console.log("Poll:", project.status, "pred:", project.current_prediction_id?.slice(0, 12));

    // If done/error, return as-is
    if (project.status === "done" || project.status === "error") {
      return new Response(JSON.stringify({ success: true, project }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!project.current_prediction_id) {
      return new Response(JSON.stringify({ success: true, project }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prediction = await checkPrediction(project.current_prediction_id);
    console.log("Prediction status:", prediction.status);

    if (prediction.status === "processing" || prediction.status === "starting") {
      return new Response(JSON.stringify({
        success: true, project,
        predictionStatus: prediction.status,
        message: `Step "${project.status}" is ${prediction.status}...`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (prediction.status === "failed" || prediction.status === "canceled") {
      const errorMsg = prediction.error || `Step "${project.status}" failed`;
      await supabaseAdmin.from("vocal_projects").update({
        status: "error", error_message: errorMsg, current_prediction_id: null,
      }).eq("id", projectId);
      const { data: updated } = await supabaseAdmin.from("vocal_projects").select("*").eq("id", projectId).single();
      return new Response(JSON.stringify({ success: true, project: updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== SUCCEEDED — advance pipeline ==========
    const output = prediction.output;
    console.log("Succeeded, output type:", typeof output, Array.isArray(output) ? `[${output.length}]` : "");

    switch (project.status) {

      // ─── STEP 1: Vocal Cleaning (Demucs) → Whisper ───
      case "cleaning": {
        let cleanVocalUrl = "";
        if (typeof output === "object" && output !== null && !Array.isArray(output)) {
          cleanVocalUrl = (output as Record<string, string>).vocals || (output as Record<string, string>).Vocals || "";
        } else {
          cleanVocalUrl = extractAudioUrl(output);
        }
        if (!cleanVocalUrl) {
          const urlMatch = JSON.stringify(output).match(/https?:\/\/[^\s"\\]+/);
          cleanVocalUrl = urlMatch ? urlMatch[0] : (project.original_vocal_url || "");
        }

        const storedUrl = await storeToStorage(cleanVocalUrl, user.id, projectId, "clean_vocal.wav");

        const whisperPred = await startPrediction(MODELS.whisper, {
          audio: storedUrl, language: "auto", translate: false, transcription: "plain text",
        });

        await supabaseAdmin.from("vocal_projects").update({
          status: "analyzing", clean_vocal_url: storedUrl,
          current_prediction_id: whisperPred.id,
          analysis_data: { stage: "whisper" },
        }).eq("id", projectId);
        break;
      }

      // ─── STEP 2: Analysis (Whisper → Llama → Lyria) ───
      case "analyzing": {
        const analysisData = (project.analysis_data as Record<string, unknown>) || {};
        const substage = (analysisData.stage as string) || "whisper";

        if (substage === "whisper") {
          let transcription = "";
          if (typeof output === "object" && output !== null) {
            transcription = (output as Record<string, string>).transcription || (output as Record<string, string>).text || JSON.stringify(output);
          } else {
            transcription = String(output || "");
          }
          console.log("Transcription:", transcription.slice(0, 100));

          const userDesc = project.description || "";
          const userGenre = project.genre || "";

          const llmPrompt = `You are a world-class music producer. A singer has recorded raw vocals. Your job is to create a prompt for Google Lyria 3 Pro to generate a PROFESSIONAL INSTRUMENTAL BACKING TRACK — NO VOCALS, NO SINGING, PURELY INSTRUMENTAL.

${transcription ? `LYRICS (for rhythm/mood reference only): "${transcription.slice(0, 1500)}"` : "Vocal recording available but no clear lyrics detected."}
${userGenre ? `REQUESTED GENRE: ${userGenre}` : "GENRE: Detect the best genre from the vocal style and mood"}
${userDesc ? `ARTIST'S VISION: ${userDesc}` : ""}

Create an instrumental-only Lyria 3 Pro prompt that specifies:
- "INSTRUMENTAL ONLY. NO VOCALS. NO SINGING. NO HUMMING."
- Genre and sub-genre
- Tempo (BPM) matching the vocal rhythm
- Key signature if detectable
- Specific instruments (drums, bass, synths, guitars, etc.)
- Production style and energy level
- Song structure (intro, verse groove, chorus build, bridge, outro)

CRITICAL RULES:
- Do NOT mention any real artist names, band names, or producer names anywhere in the prompt.
- Do NOT use "REFERENCE ARTISTS" or "REFERENCE PRODUCERS" sections.
- Instead, describe the sonic style directly (e.g., "dreamy indie synth-pop" instead of naming an artist).
- Lyria will reject prompts containing real artist/producer names.

Output ONLY the Lyria prompt text. No explanations.`;

          const llamaPred = await startOfficialModelPrediction("meta", "meta-llama-3-70b-instruct", {
            prompt: llmPrompt,
            max_tokens: 1200,
            temperature: 0.7,
            top_p: 0.95,
            system_prompt: "You are an expert music producer who creates detailed instrumental production prompts.",
          });

          await supabaseAdmin.from("vocal_projects").update({
            current_prediction_id: llamaPred.id,
            analysis_data: { ...analysisData, stage: "llama", transcription },
          }).eq("id", projectId);

        } else if (substage === "llama") {
          let generatedPrompt = "";
          if (Array.isArray(output)) {
            generatedPrompt = output.join("");
          } else if (typeof output === "string") {
            generatedPrompt = output;
          } else {
            generatedPrompt = String(output || "");
          }
          console.log("Llama prompt length:", generatedPrompt.length);

          const userGenre = project.genre || "";

          if (!generatedPrompt || generatedPrompt.length < 20) {
            const g = userGenre || "pop";
            generatedPrompt = `INSTRUMENTAL ONLY. NO VOCALS. Professional ${g} backing track. 120 BPM. Modern production with drums, bass, synths, and melodic elements. Dynamic arrangement with intro, verse groove, chorus build, bridge breakdown, and outro. Radio-ready quality.`;
          }

          // Strip artist/producer references that Lyria flags as sensitive
          generatedPrompt = sanitizeLyriaPrompt(generatedPrompt);

          if (!generatedPrompt.toLowerCase().includes("instrumental")) {
            generatedPrompt = "INSTRUMENTAL ONLY. NO VOCALS. NO SINGING.\n\n" + generatedPrompt;
          }

          const detectedGenre = userGenre || generatedPrompt.match(/\b(pop|rap|rock|r&b|afro|afrobeats|amapiano|jazz|soul|electronic|trap|hiphop|hip-hop|country|reggae|latin|lofi|indie|folk|punk|metal|gospel|blues|dancehall|kpop|drill)\b/i)?.[1] || "pop";

          // Start Lyria 3 Pro — Beat 1
          const lyria1 = await startOfficialModelPrediction("google", "lyria-3-pro", {
            prompt: generatedPrompt,
          });

          await supabaseAdmin.from("vocal_projects").update({
            status: "generating",
            current_prediction_id: lyria1.id,
            generated_prompt: generatedPrompt,
            genre: detectedGenre,
            analysis_data: { ...analysisData, stage: "beat_1", prompt: generatedPrompt },
          }).eq("id", projectId);
        }
        break;
      }

      // ─── STEP 3: Beat Generation (Lyria 3 Pro × 3) → Done ───
      case "generating": {
        const analysisData = (project.analysis_data as Record<string, unknown>) || {};
        const stage = (analysisData.stage as string) || "beat_1";
        const beatUrls = (project.beat_urls as string[]) || [];
        const prompt = project.generated_prompt || "";

        const beatUrl = extractAudioUrl(output);
        if (!beatUrl) {
          await supabaseAdmin.from("vocal_projects").update({
            status: "error",
            error_message: "Lyria 3 Pro returned no audio. Output: " + JSON.stringify(output).slice(0, 200),
            current_prediction_id: null,
          }).eq("id", projectId);
          break;
        }

        const storedBeat = await storeToStorage(beatUrl, user.id, projectId, `beat_${beatUrls.length + 1}.wav`);
        const newBeatUrls = [...beatUrls, storedBeat];

        if (stage === "beat_1") {
          const lyria2 = await startOfficialModelPrediction("google", "lyria-3-pro", {
            prompt: prompt + "\n\nVariation: More energetic, stronger drums and bass, higher intensity, festival-ready.",
          });
          await supabaseAdmin.from("vocal_projects").update({
            beat_urls: newBeatUrls,
            current_prediction_id: lyria2.id,
            analysis_data: { ...analysisData, stage: "beat_2" },
          }).eq("id", projectId);
        } else if (stage === "beat_2") {
          const lyria3 = await startOfficialModelPrediction("google", "lyria-3-pro", {
            prompt: prompt + "\n\nVariation: Softer, intimate, acoustic elements, gentle rhythm, stripped-back.",
          });
          await supabaseAdmin.from("vocal_projects").update({
            beat_urls: newBeatUrls,
            current_prediction_id: lyria3.id,
            analysis_data: { ...analysisData, stage: "beat_3" },
          }).eq("id", projectId);
        } else if (stage === "beat_3") {
          // All 3 beats done → Pipeline complete!
          console.log("All 3 beats generated. Pipeline complete!");

          // Final URLs = beat URLs (user's clean vocal is played alongside on frontend)
          await supabaseAdmin.from("vocal_projects").update({
            beat_urls: newBeatUrls,
            status: "done",
            final_urls: newBeatUrls,
            current_prediction_id: null,
            analysis_data: { ...analysisData, stage: "complete" },
          }).eq("id", projectId);
        }
        break;
      }

      default: {
        console.error("Unknown status:", project.status);
        await supabaseAdmin.from("vocal_projects").update({
          status: "error",
          error_message: `Unknown pipeline status: ${project.status}`,
        }).eq("id", projectId);
      }
    }

    // Return updated project
    const { data: updated } = await supabaseAdmin.from("vocal_projects").select("*").eq("id", projectId).single();
    return new Response(JSON.stringify({ success: true, project: updated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("vocal-to-song-poll error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
