import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Correct latest model versions from Replicate (verified via API)
const MODELS = {
  demucs: "25a173108cff36ef9f80f854c162d01df9e6528be175794b81158fa03836d953",
  whisper: "8099696689d249cf8b122d833c36ac3f75505c666a395ca40ef26f68e7d3d16e",
  musicgen: "671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb",
};

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
  if (!res.ok) {
    console.error("Replicate error:", body);
    throw new Error(`Replicate failed (${res.status}): ${body}`);
  }
  const data = JSON.parse(body);
  console.log("Prediction started:", data.id);
  return data;
}

// Store file from URL to Supabase Storage
async function storeToStorage(url: string, userId: string, projectId: string, filename: string): Promise<string> {
  try {
    console.log("Storing to storage:", filename);
    const res = await fetch(url);
    if (!res.ok) {
      console.error("Fetch failed for storage:", res.status);
      return url;
    }
    const arrayBuffer = await res.arrayBuffer();
    const path = `${userId}/${projectId}/${filename}`;
    const { error } = await supabaseAdmin.storage
      .from("vocal-projects")
      .upload(path, new Uint8Array(arrayBuffer), { contentType: "audio/wav", upsert: true });
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

    // Fetch project using service role (bypasses RLS)
    const { data: project, error: fetchErr } = await supabaseAdmin
      .from("vocal_projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (fetchErr || !project) {
      console.error("Project fetch error:", fetchErr);
      throw new Error("Project not found");
    }

    // Verify ownership
    if (project.user_id !== user.id) throw new Error("Unauthorized");

    console.log("Project status:", project.status, "prediction:", project.current_prediction_id?.slice(0, 12));

    // If already done or error, just return status
    if (project.status === "done" || project.status === "error") {
      return new Response(JSON.stringify({ success: true, project }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check current prediction
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
        message: `Step "${project.status}" is ${prediction.status}...`
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

    // prediction.status === "succeeded" — advance to next step
    const output = prediction.output;
    console.log("Prediction succeeded, output type:", typeof output, Array.isArray(output) ? `array[${output.length}]` : "");

    switch (project.status) {
      case "cleaning": {
        // Demucs output: object with stem URLs like { vocals: "url", other: "url", ... }
        let cleanVocalUrl = "";
        if (typeof output === "object" && output !== null && !Array.isArray(output)) {
          // Object with named stems
          cleanVocalUrl = output.vocals || output.Vocals || "";
          console.log("Demucs output keys:", Object.keys(output));
        } else if (typeof output === "string") {
          cleanVocalUrl = output;
        } else if (Array.isArray(output)) {
          cleanVocalUrl = output[0] || "";
        }

        if (!cleanVocalUrl) {
          // Try to extract any URL from the output
          const urlMatch = JSON.stringify(output).match(/https?:\/\/[^\s"\\]+/);
          cleanVocalUrl = urlMatch ? urlMatch[0] : "";
        }

        if (!cleanVocalUrl) {
          // If still no vocal URL, use original as fallback
          console.warn("No vocal URL found in Demucs output, using original");
          cleanVocalUrl = project.original_vocal_url || "";
        }

        console.log("Clean vocal URL:", cleanVocalUrl.slice(0, 60));

        // Store cleaned vocal
        const storedUrl = await storeToStorage(cleanVocalUrl, user.id, projectId, "clean_vocal.wav");

        // Start analysis with Whisper
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

      case "analyzing": {
        const analysisData = (project.analysis_data as Record<string, unknown>) || {};
        const stage = (analysisData.stage as string) || "whisper";

        if (stage === "whisper") {
          // Whisper output
          let transcription = "";
          if (typeof output === "object" && output !== null) {
            transcription = output.transcription || output.text || JSON.stringify(output);
          } else {
            transcription = String(output || "");
          }
          
          console.log("Transcription length:", transcription.length, "preview:", transcription.slice(0, 100));

          // Use Lovable AI to build a production prompt from the transcription
          const userDescription = project.description || "";
          const userGenre = project.genre || "";
          
          const llmPrompt = `You are a world-class music producer. A singer has recorded raw vocals (no beat, no instruments). Based on their vocal recording analysis below, create a detailed instrumental production prompt.

${transcription ? `LYRICS/VOCALS: "${transcription.slice(0, 1000)}"` : "The vocal recording could not be transcribed clearly."}
${userGenre ? `REQUESTED GENRE: ${userGenre}` : "GENRE: Detect the best genre from the vocal style, mood, and lyrics"}
${userDescription ? `ARTIST'S VISION: ${userDescription}` : ""}

Create a music production prompt that includes:
- Genre and sub-genre (auto-detected from vocals if not specified)
- Tempo (BPM) that matches the vocal rhythm
- Key signature that complements the singing
- Mood, energy level, and emotional tone
- Specific instruments and sounds to use
- Song structure (intro, verse, pre-chorus, chorus, bridge, outro)
- Production style references (e.g., "sounds like a mix of Drake and The Weeknd")

Output ONLY the production prompt as a single detailed paragraph. No explanations, no bullet points. Make it specific enough for an AI music generator to create a professional beat.`;

          const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
          let generatedPrompt = "";

          if (LOVABLE_API_KEY) {
            try {
              console.log("Calling Lovable AI for prompt generation...");
              const llmRes = await fetch("https://ai.lovable.dev/api/v1/chat/completions", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${LOVABLE_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "google/gemini-2.5-flash",
                  messages: [{ role: "user", content: llmPrompt }],
                  max_tokens: 600,
                }),
              });
              
              if (llmRes.ok) {
                const llmData = await llmRes.json();
                generatedPrompt = llmData.choices?.[0]?.message?.content || "";
                console.log("Generated prompt length:", generatedPrompt.length);
              } else {
                console.error("LLM response not ok:", llmRes.status, await llmRes.text());
              }
            } catch (e) {
              console.error("LLM error:", e);
            }
          } else {
            console.warn("No LOVABLE_API_KEY available");
          }

          if (!generatedPrompt) {
            const detectedGenre = userGenre || "pop";
            generatedPrompt = `Professional ${detectedGenre} instrumental beat, 120 BPM, modern production, emotional and dynamic, radio-ready mix with rich arrangement including drums, bass, synths, and atmospheric pads. Structure: 8-bar intro, verse, pre-chorus build, powerful chorus, second verse, chorus, bridge breakdown, final chorus, outro. Suitable for a vocal performance, 3 minutes long.`;
          }

          // Start beat generation with MusicGen — Variation 1 (full 3 min)
          const beatPrediction = await startPrediction(MODELS.musicgen, {
            prompt: generatedPrompt,
            duration: 30, // MusicGen max is usually 30s, we'll work with this
            model_version: "stereo-melody-large",
            output_format: "wav",
            normalization_strategy: "loudness",
            temperature: 1.0,
          });

          const detectedGenre = userGenre || generatedPrompt.match(/\b(pop|rap|rock|r&b|afro|amapiano|jazz|soul|electronic|trap|hiphop|country|reggae|latin|lofi)\b/i)?.[1] || "pop";

          await supabaseAdmin.from("vocal_projects").update({
            status: "generating",
            current_prediction_id: beatPrediction.id,
            generated_prompt: generatedPrompt,
            genre: detectedGenre,
            analysis_data: {
              ...analysisData,
              stage: "beat_1",
              transcription,
              prompt: generatedPrompt,
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

        // Extract beat URL from output
        let beatUrl = "";
        if (typeof output === "string") {
          beatUrl = output;
        } else if (Array.isArray(output) && output.length > 0) {
          beatUrl = output[0];
        }

        console.log("Beat generated:", stage, "url:", beatUrl?.slice(0, 60));

        const storedBeatUrl = await storeToStorage(beatUrl, user.id, projectId, `beat_${beatUrls.length + 1}.wav`);
        const newBeatUrls = [...beatUrls, storedBeatUrl];

        if (stage === "beat_1") {
          // Start beat 2 with energetic variation
          const beatPrediction = await startPrediction(MODELS.musicgen, {
            prompt: prompt + " More energetic variation with stronger drums and bassline, higher energy.",
            duration: 30,
            model_version: "stereo-melody-large",
            output_format: "wav",
            normalization_strategy: "loudness",
            temperature: 1.1,
            seed: 42,
          });

          await supabaseAdmin.from("vocal_projects").update({
            beat_urls: newBeatUrls,
            current_prediction_id: beatPrediction.id,
            analysis_data: { ...analysisData, stage: "beat_2" },
          }).eq("id", projectId);
        } else if (stage === "beat_2") {
          // Start beat 3 — mellow variation
          const beatPrediction = await startPrediction(MODELS.musicgen, {
            prompt: prompt + " Softer, more intimate arrangement with acoustic elements and gentle rhythm.",
            duration: 30,
            model_version: "stereo-melody-large",
            output_format: "wav",
            normalization_strategy: "loudness",
            temperature: 0.9,
            seed: 123,
          });

          await supabaseAdmin.from("vocal_projects").update({
            beat_urls: newBeatUrls,
            current_prediction_id: beatPrediction.id,
            analysis_data: { ...analysisData, stage: "beat_3" },
          }).eq("id", projectId);
        } else if (stage === "beat_3") {
          // All 3 beats generated — mark as done
          console.log("All 3 beats generated! Completing project.");
          
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
      JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
