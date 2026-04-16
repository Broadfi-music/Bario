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

const GENERATOR_VARIATIONS = [
  "balanced studio arrangement, punchy drums, warm bass, wide synth pads, clean topline space",
  "higher energy, stronger drums, bigger bass motion, brighter hooks, wide stereo lift",
  "intimate arrangement, softer drums, warmer textures, airier pads, moody late-night atmosphere",
] as const;

function sanitizeGenerationPrompt(prompt: string) {
  return prompt
    .replace(/reference\s+(?:artists?|producers?)(?:\/(?:artists?|producers?))?\s*:.*$/gim, "")
    .replace(/(?:artists?|producers?)\s+reference\s*:.*$/gim, "")
    .replace(/\b(?:inspired by|in the style of|similar to|like|à la)\b[^.\n]*/gim, "")
    .replace(/\b(?:The 1975|Billie Eilish|Finneas|Louis Bell)\b/gi, "")
    .replace(/["“”']/g, "")
    .replace(/\b(?:lyrics?|verse|chorus|bridge|outro|intro|hook)\b\s*:?[A-Za-z0-9 ,.-]*/gim, "")
    .replace(/\b(?:genre|sub-genre|tempo|key signature|instruments|production style|energy level|song structure)\b\s*:?/gi, "")
    .replace(/[•*]/g, ",")
    .replace(/\n{2,}/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

function compressPrompt(prompt: string, maxLength = 320) {
  const normalized = prompt.replace(/\s+/g, " ").replace(/,\s*,+/g, ", ").trim();
  if (normalized.length <= maxLength) return normalized;
  return normalized.slice(0, maxLength).replace(/[,:;\-\s]+$/g, "").trim();
}

function detectGenre(text: string, fallback = "pop") {
  const match = text.match(/\b(pop|rap|rock|r&b|afro|afrobeats|amapiano|jazz|soul|electronic|trap|hiphop|hip-hop|country|reggae|latin|lofi|indie|folk|punk|metal|gospel|blues|dancehall|kpop|drill)\b/i)?.[1];
  return match || fallback;
}

function buildBaseInstrumentalPrompt(prompt: string, fallbackGenre: string) {
  const cleaned = sanitizeGenerationPrompt(prompt)
    .replace(/\b\d{2,3}\s?bpm\b/gi, "")
    .replace(/\b[a-g](?:#|b)?\s?(?:major|minor)\b/gi, "")
    .replace(/\s*,\s*/g, ", ");

  const bpmMatch = prompt.match(/\b(\d{2,3})\s?bpm\b/i);
  const genre = detectGenre(`${fallbackGenre} ${cleaned}`, fallbackGenre || "pop");

  return compressPrompt([
    "instrumental only",
    "no vocals",
    "no singing",
    `${genre} production`,
    bpmMatch ? `${bpmMatch[1]} BPM` : "",
    cleaned,
    "professional arrangement",
    "clean modern mix",
  ].filter(Boolean).join(", "), 320);
}

function buildVariationPrompt(basePrompt: string, variationIndex: number) {
  const variation = GENERATOR_VARIATIONS[variationIndex] || GENERATOR_VARIATIONS[0];
  return compressPrompt(`${basePrompt}, ${variation}`, 400);
}

function getAudioExtension(url: string, fallback = "wav") {
  const match = url.match(/\.(mp3|wav|ogg|flac|webm)(?:\?|$)/i);
  return match?.[1]?.toLowerCase() || fallback;
}

function getContentType(filename: string) {
  if (filename.endsWith(".mp3")) return "audio/mpeg";
  if (filename.endsWith(".ogg")) return "audio/ogg";
  if (filename.endsWith(".flac")) return "audio/flac";
  if (filename.endsWith(".webm")) return "audio/webm";
  return "audio/wav";
}

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

async function startInstrumentalPrediction(prompt: string) {
  console.log("Starting instrumental generator with prompt:", prompt.slice(0, 180));
  return await startOfficialModelPrediction("stability-ai", "stable-audio-2.5", {
    prompt,
    duration: 45,
    steps: 8,
    cfg_scale: 6,
  });
}

async function storeToStorage(url: string, userId: string, projectId: string, filename: string): Promise<string> {
  try {
    console.log("Storing:", filename);
    const res = await fetch(url);
    if (!res.ok) return url;
    const arrayBuffer = await res.arrayBuffer();
    const path = `${userId}/${projectId}/${filename}`;
    const { error } = await supabaseAdmin.storage
      .from("vocal-projects")
      .upload(path, new Uint8Array(arrayBuffer), { contentType: getContentType(filename), upsert: true });
    if (error) {
      console.error("Upload error:", error);
      return url;
    }
    const { data: { publicUrl } } = supabaseAdmin.storage.from("vocal-projects").getPublicUrl(path);
    return publicUrl;
  } catch (e) {
    console.error("Storage error:", e);
    return url;
  }
}

function extractAudioUrl(output: unknown): string {
  if (typeof output === "string") return output;
  if (output && typeof output === "object" && "url" in (output as Record<string, unknown>)) {
    return String((output as Record<string, unknown>).url || "");
  }
  if (Array.isArray(output) && output.length > 0) {
    if (typeof output[0] === "string") return output[0];
    if (output[0] && typeof output[0] === "object" && "url" in output[0]) {
      return String((output[0] as Record<string, unknown>).url || "");
    }
  }
  const urlMatch = JSON.stringify(output).match(/https?:\/\/[^\s"\\]+\.(wav|mp3|mp4|ogg|flac|webm)/i);
  return urlMatch ? urlMatch[0] : "";
}

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
        success: true,
        project,
        predictionStatus: prediction.status,
        message: `Step "${project.status}" is ${prediction.status}...`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (prediction.status === "failed" || prediction.status === "canceled") {
      const rawError = prediction.error || `Step "${project.status}" failed`;
      const errorMsg = /flagged as sensitive/i.test(rawError)
        ? "Generation was blocked by the current instrumental model. The pipeline has been updated with a safer generator — please retry this upload."
        : rawError;
      await supabaseAdmin.from("vocal_projects").update({
        status: "error",
        error_message: errorMsg,
        current_prediction_id: null,
      }).eq("id", projectId);
      const { data: updated } = await supabaseAdmin.from("vocal_projects").select("*").eq("id", projectId).single();
      return new Response(JSON.stringify({ success: true, project: updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const output = prediction.output;
    console.log("Succeeded, output type:", typeof output, Array.isArray(output) ? `[${output.length}]` : "");

    switch (project.status) {
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
          audio: storedUrl,
          language: "auto",
          translate: false,
          transcription: "plain text",
        });

        await supabaseAdmin.from("vocal_projects").update({
          status: "analyzing",
          clean_vocal_url: storedUrl,
          current_prediction_id: whisperPred.id,
          analysis_data: { stage: "whisper" },
        }).eq("id", projectId);
        break;
      }

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

          const llmPrompt = `You are a music producer writing a SAFE text-to-music brief for an instrumental generator.
VOCAL REFERENCE: Use the uploaded vocal only to infer cadence and energy. Never quote, restate, or paraphrase any lyrics from the vocal transcript.
${userGenre ? `REQUESTED GENRE: ${userGenre}` : "GENRE: infer a broad safe genre from the vocal cadence and tone"}
${userDesc ? `USER VISION: ${userDesc}` : "USER VISION: catchy modern arrangement that supports the lead vocal"}
Return ONLY one short line under 220 characters describing genre/sub-genre, BPM if likely, mood, and 4 to 6 instruments or textures.
STRICT RULES: instrumental only; no vocals, no lyrics, no humming, no vocal chops; no real artist, producer, band, or song names; no bullets, no markdown, no labels, no sections; no romance, body, violence, politics, religion, or copyrighted lyric references.`;

          const llamaPred = await startOfficialModelPrediction("meta", "meta-llama-3-70b-instruct", {
            prompt: llmPrompt,
            max_tokens: 220,
            temperature: 0.5,
            top_p: 0.9,
            system_prompt: "You write short, safe, production-ready instrumental prompts.",
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
          if (!generatedPrompt || generatedPrompt.length < 12) {
            generatedPrompt = userGenre
              ? `${userGenre} instrumental, clean drums, bass, synths, polished arrangement`
              : "pop instrumental, clean drums, bass, synths, polished arrangement";
          }

          const detectedGenre = userGenre || detectGenre(generatedPrompt, "pop");
          const safeBasePrompt = buildBaseInstrumentalPrompt(generatedPrompt, detectedGenre);
          const variationOnePrompt = buildVariationPrompt(safeBasePrompt, 0);
          const instrumentalPrediction = await startInstrumentalPrediction(variationOnePrompt);

          await supabaseAdmin.from("vocal_projects").update({
            status: "generating",
            current_prediction_id: instrumentalPrediction.id,
            generated_prompt: safeBasePrompt,
            genre: detectedGenre,
            analysis_data: {
              ...analysisData,
              stage: "beat_1",
              prompt: safeBasePrompt,
              variation_prompts: [variationOnePrompt],
              generator: "stable-audio-2.5",
            },
          }).eq("id", projectId);
        }
        break;
      }

      case "generating": {
        const analysisData = (project.analysis_data as Record<string, unknown>) || {};
        const stage = (analysisData.stage as string) || "beat_1";
        const beatUrls = (project.beat_urls as string[]) || [];
        const prompt = project.generated_prompt || "";
        const variationPrompts = Array.isArray(analysisData.variation_prompts)
          ? (analysisData.variation_prompts as string[])
          : [];

        const beatUrl = extractAudioUrl(output);
        if (!beatUrl) {
          await supabaseAdmin.from("vocal_projects").update({
            status: "error",
            error_message: "Instrumental generator returned no audio. Output: " + JSON.stringify(output).slice(0, 200),
            current_prediction_id: null,
          }).eq("id", projectId);
          break;
        }

        const extension = getAudioExtension(beatUrl, "mp3");
        const storedBeat = await storeToStorage(beatUrl, user.id, projectId, `beat_${beatUrls.length + 1}.${extension}`);
        const newBeatUrls = [...beatUrls, storedBeat];

        if (stage === "beat_1") {
          const variationTwoPrompt = buildVariationPrompt(prompt, 1);
          const instrumentalPrediction = await startInstrumentalPrediction(variationTwoPrompt);
          await supabaseAdmin.from("vocal_projects").update({
            beat_urls: newBeatUrls,
            current_prediction_id: instrumentalPrediction.id,
            analysis_data: {
              ...analysisData,
              stage: "beat_2",
              variation_prompts: [...variationPrompts, variationTwoPrompt],
            },
          }).eq("id", projectId);
        } else if (stage === "beat_2") {
          const variationThreePrompt = buildVariationPrompt(prompt, 2);
          const instrumentalPrediction = await startInstrumentalPrediction(variationThreePrompt);
          await supabaseAdmin.from("vocal_projects").update({
            beat_urls: newBeatUrls,
            current_prediction_id: instrumentalPrediction.id,
            analysis_data: {
              ...analysisData,
              stage: "beat_3",
              variation_prompts: [...variationPrompts, variationThreePrompt],
            },
          }).eq("id", projectId);
        } else if (stage === "beat_3") {
          console.log("All 3 beats generated. Pipeline complete!");
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
