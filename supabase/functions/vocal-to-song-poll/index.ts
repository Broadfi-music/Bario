import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Community models use version hashes
const MODELS = {
  demucs: "25a173108cff36ef9f80f854c162d01df9e6528be175794b81158fa03836d953",
  whisper: "8099696689d249cf8b122d833c36ac3f75505c666a395ca40ef26f68e7d3d16e",
};

// ---------- Replicate helpers ----------

async function checkPrediction(predictionId: string) {
  const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
    headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Failed to check prediction: ${await res.text()}`);
  return await res.json();
}

// Start prediction for community models (version hash)
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
  if (!res.ok) {
    console.error("Replicate error:", body);
    throw new Error(`Replicate failed (${res.status}): ${body}`);
  }
  const data = JSON.parse(body);
  console.log("Prediction started:", data.id);
  return data;
}

// Start prediction for official models (google/lyria-3-pro etc.)
async function startOfficialModelPrediction(modelOwner: string, modelName: string, input: Record<string, unknown>) {
  console.log("Starting official model prediction:", `${modelOwner}/${modelName}`, Object.keys(input));
  const res = await fetch(`https://api.replicate.com/v1/models/${modelOwner}/${modelName}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input }),
  });
  const body = await res.text();
  if (!res.ok) {
    console.error("Official model error:", body);
    throw new Error(`Official model failed (${res.status}): ${body}`);
  }
  const data = JSON.parse(body);
  console.log("Official model prediction started:", data.id, data.status);
  return data;
}

// ---------- Storage helper ----------

async function storeToStorage(url: string, userId: string, projectId: string, filename: string): Promise<string> {
  try {
    console.log("Storing to storage:", filename);
    const res = await fetch(url);
    if (!res.ok) {
      console.error("Fetch failed for storage:", res.status);
      return url;
    }
    const arrayBuffer = await res.arrayBuffer();
    const contentType = filename.endsWith(".mp3") ? "audio/mpeg" : "audio/wav";
    const path = `${userId}/${projectId}/${filename}`;
    const { error } = await supabaseAdmin.storage
      .from("vocal-projects")
      .upload(path, new Uint8Array(arrayBuffer), { contentType, upsert: true });
    if (error) {
      console.error("Storage upload error:", error);
      return url;
    }
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("vocal-projects")
      .getPublicUrl(path);
    console.log("Stored to:", publicUrl.slice(0, 60));
    return publicUrl;
  } catch (e) {
    console.error("Storage error:", e);
    return url;
  }
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

    console.log("Polling project:", projectId);

    const { data: project, error: fetchErr } = await supabaseAdmin
      .from("vocal_projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (fetchErr || !project) throw new Error("Project not found");
    if (project.user_id !== user.id) throw new Error("Unauthorized");

    console.log("Project status:", project.status, "prediction:", project.current_prediction_id?.slice(0, 12));

    // If already done or error, just return
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
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (prediction.status === "failed" || prediction.status === "canceled") {
      const errorMsg = prediction.error || `Pipeline step "${project.status}" failed`;
      console.error("Prediction failed:", errorMsg);
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

    // ========== prediction.status === "succeeded" — advance pipeline ==========
    const output = prediction.output;
    console.log("Prediction succeeded, output type:", typeof output, Array.isArray(output) ? `array[${output.length}]` : "");

    switch (project.status) {
      // ───────────────────────────────────────────────
      // STEP 1: Vocal Cleaning (Demucs) → Whisper
      // ───────────────────────────────────────────────
      case "cleaning": {
        let cleanVocalUrl = "";
        if (typeof output === "object" && output !== null && !Array.isArray(output)) {
          cleanVocalUrl = output.vocals || output.Vocals || "";
        } else if (typeof output === "string") {
          cleanVocalUrl = output;
        } else if (Array.isArray(output)) {
          cleanVocalUrl = output[0] || "";
        }
        if (!cleanVocalUrl) {
          const urlMatch = JSON.stringify(output).match(/https?:\/\/[^\s"\\]+/);
          cleanVocalUrl = urlMatch ? urlMatch[0] : (project.original_vocal_url || "");
        }

        console.log("Clean vocal URL:", cleanVocalUrl.slice(0, 60));
        const storedUrl = await storeToStorage(cleanVocalUrl, user.id, projectId, "clean_vocal.wav");

        // Start Whisper analysis
        const whisperPrediction = await startPrediction(MODELS.whisper, {
          audio: storedUrl,
          language: "auto",
          translate: false,
          transcription: "plain text",
        });

        await supabaseAdmin.from("vocal_projects").update({
          status: "analyzing",
          clean_vocal_url: storedUrl,
          current_prediction_id: whisperPrediction.id,
          analysis_data: { stage: "whisper" },
        }).eq("id", projectId);
        break;
      }

      // ───────────────────────────────────────────────
      // STEP 2: Analysis (Whisper) → LLM prompt → Lyria 3 Pro
      // ───────────────────────────────────────────────
      case "analyzing": {
        const analysisData = (project.analysis_data as Record<string, unknown>) || {};

        // Whisper output
        let transcription = "";
        if (typeof output === "object" && output !== null) {
          transcription = (output as Record<string, string>).transcription || (output as Record<string, string>).text || JSON.stringify(output);
        } else {
          transcription = String(output || "");
        }

        console.log("Transcription length:", transcription.length, "preview:", transcription.slice(0, 100));

        const userDescription = project.description || "";
        const userGenre = project.genre || "";

        // Build a rich production prompt using LLM
        const llmPrompt = `You are a world-class music producer. A singer has recorded raw vocals (no beat, no instruments). Based on their vocal recording analysis below, create a professional song prompt for Google Lyria 3 Pro AI music generator.

${transcription ? `LYRICS/VOCALS: "${transcription.slice(0, 1500)}"` : "The vocal recording could not be transcribed clearly."}
${userGenre ? `REQUESTED GENRE: ${userGenre}` : "GENRE: Detect the best genre from the vocal style, mood, and lyrics"}
${userDescription ? `ARTIST'S VISION: ${userDescription}` : ""}

Create a Lyria 3 Pro prompt that includes:
- The actual lyrics with [Verse 1], [Chorus], [Verse 2], [Bridge], [Outro] tags
- Genre and sub-genre specification
- Tempo (BPM) that matches the vocal rhythm
- Mood, energy level, and emotional tone
- Specific instruments and sounds
- Production style references

Output ONLY the Lyria prompt. Format lyrics with section tags like [Verse 1], [Chorus], etc. End with a single line: "Genre: X. Mood: Y. Tempo: Z BPM."
Do NOT add explanations.`;

        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        let generatedPrompt = "";

        if (LOVABLE_API_KEY) {
          try {
            console.log("Calling Lovable AI for Lyria prompt generation...");
            const llmRes = await fetch("https://ai.lovable.dev/api/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [{ role: "user", content: llmPrompt }],
                max_tokens: 1200,
              }),
            });

            if (llmRes.ok) {
              const llmData = await llmRes.json();
              generatedPrompt = llmData.choices?.[0]?.message?.content || "";
              console.log("Generated Lyria prompt length:", generatedPrompt.length);
            } else {
              console.error("LLM response not ok:", llmRes.status, await llmRes.text());
            }
          } catch (e) {
            console.error("LLM error:", e);
          }
        }

        if (!generatedPrompt) {
          const detectedGenre = userGenre || "pop";
          generatedPrompt = `[Verse 1]\n${transcription.slice(0, 500) || "La la la, singing my heart out"}\n\n[Chorus]\nFeel the rhythm, feel the beat\nMoving to the sound so sweet\n\n[Verse 2]\nEvery moment, every day\nMusic takes the pain away\n\nGenre: ${detectedGenre}. Mood: Emotional and dynamic. Tempo: 120 BPM.`;
        }

        const detectedGenre = userGenre || generatedPrompt.match(/\b(pop|rap|rock|r&b|afro|afrobeats|amapiano|jazz|soul|electronic|trap|hiphop|hip-hop|country|reggae|latin|lofi|indie|folk|punk|metal|gospel|blues|dancehall|kpop|drill)\b/i)?.[1] || "pop";

        // Start Lyria 3 Pro — Variation 1 (main beat)
        const lyriaPrediction = await startOfficialModelPrediction("google", "lyria-3-pro", {
          prompt: generatedPrompt,
        });

        await supabaseAdmin.from("vocal_projects").update({
          status: "generating",
          current_prediction_id: lyriaPrediction.id,
          generated_prompt: generatedPrompt,
          genre: detectedGenre,
          analysis_data: {
            ...analysisData,
            stage: "beat_1",
            transcription,
            prompt: generatedPrompt,
          },
        }).eq("id", projectId);
        break;
      }

      // ───────────────────────────────────────────────
      // STEP 3: Beat Generation (Lyria 3 Pro × 3 variations)
      // ───────────────────────────────────────────────
      case "generating": {
        const analysisData = (project.analysis_data as Record<string, unknown>) || {};
        const stage = (analysisData.stage as string) || "beat_1";
        const beatUrls = (project.beat_urls as string[]) || [];
        const prompt = project.generated_prompt || "";

        // Lyria 3 Pro returns a FileOutput URL
        let beatUrl = "";
        if (typeof output === "string") {
          beatUrl = output;
        } else if (output && typeof output === "object" && "url" in output) {
          beatUrl = (output as Record<string, string>).url;
        } else if (Array.isArray(output) && output.length > 0) {
          beatUrl = typeof output[0] === "string" ? output[0] : output[0]?.url || "";
        }
        // Fallback: try to find any URL
        if (!beatUrl) {
          const urlMatch = JSON.stringify(output).match(/https?:\/\/[^\s"\\]+\.(wav|mp3|mp4|ogg|flac|webm)/i);
          beatUrl = urlMatch ? urlMatch[0] : "";
        }

        console.log("Lyria beat generated:", stage, "url:", beatUrl?.slice(0, 80));

        if (!beatUrl) {
          console.error("No beat URL found in Lyria output:", JSON.stringify(output).slice(0, 300));
          await supabaseAdmin.from("vocal_projects").update({
            status: "error",
            error_message: "Lyria 3 Pro did not return an audio URL. Output: " + JSON.stringify(output).slice(0, 200),
            current_prediction_id: null,
          }).eq("id", projectId);
          break;
        }

        const storedBeatUrl = await storeToStorage(beatUrl, user.id, projectId, `beat_${beatUrls.length + 1}.wav`);
        const newBeatUrls = [...beatUrls, storedBeatUrl];

        if (stage === "beat_1") {
          // Variation 2 — more energetic
          const lyria2 = await startOfficialModelPrediction("google", "lyria-3-pro", {
            prompt: prompt + "\n\nStyle variation: More energetic, stronger drums and bassline, higher intensity, festival-ready drop.",
          });
          await supabaseAdmin.from("vocal_projects").update({
            beat_urls: newBeatUrls,
            current_prediction_id: lyria2.id,
            analysis_data: { ...analysisData, stage: "beat_2" },
          }).eq("id", projectId);
        } else if (stage === "beat_2") {
          // Variation 3 — softer/acoustic
          const lyria3 = await startOfficialModelPrediction("google", "lyria-3-pro", {
            prompt: prompt + "\n\nStyle variation: Softer, more intimate, acoustic elements, gentle rhythm, stripped-back arrangement.",
          });
          await supabaseAdmin.from("vocal_projects").update({
            beat_urls: newBeatUrls,
            current_prediction_id: lyria3.id,
            analysis_data: { ...analysisData, stage: "beat_3" },
          }).eq("id", projectId);
        } else if (stage === "beat_3") {
          // All 3 beats generated — mark as done
          // For the MVP, the Lyria output already includes vocals+beat mixed
          // Lyria 3 Pro generates full songs with the lyrics embedded
          console.log("All 3 Lyria beats generated! Completing project.");

          await supabaseAdmin.from("vocal_projects").update({
            beat_urls: newBeatUrls,
            final_urls: newBeatUrls,
            status: "done",
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
    const { data: updated } = await supabaseAdmin
      .from("vocal_projects")
      .select("*")
      .eq("id", projectId)
      .single();

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
