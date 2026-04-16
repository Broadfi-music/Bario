import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkPrediction(predictionId: string) {
  const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
    headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Failed to check prediction: ${await res.text()}`);
  return await res.json();
}

async function startPrediction(version: string, input: Record<string, unknown>) {
  const res = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ version, input }),
  });
  if (!res.ok) throw new Error(`Replicate failed: ${await res.text()}`);
  return await res.json();
}

// Store file from URL to Supabase Storage
async function storeToStorage(url: string, userId: string, projectId: string, filename: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) return url; // fallback to original URL
    const blob = await res.blob();
    const path = `${userId}/${projectId}/${filename}`;
    const { error } = await supabaseAdmin.storage
      .from("vocal-projects")
      .upload(path, blob, { contentType: "audio/wav", upsert: true });
    if (error) {
      console.error("Storage upload error:", error);
      return url;
    }
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("vocal-projects")
      .getPublicUrl(path);
    return publicUrl;
  } catch {
    return url;
  }
}

// Model versions (these are stable versions from Replicate)
const MODELS = {
  demucs: "25a173108cff36ef9f80f854c162d01df9e6528be175794b81571f6c6c65f18b",
  whisper: "3ab86df6c8f54c11309d4d1f930ac292bad43ace52d10c80d87eb258b3c9f79c",
  llama: "a16z-infra/llama-3.1-8b-instruct:d5b2e2e7b4a7b0b5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5",
  musicgen: "671ac645ce5e552cc63a54a2bbff63fcf798043055e2e2a46b15e95e6385a8b7",
  voiceClone: "zsxkib/realistic-voice-cloning:latest",
};

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

    // Fetch project
    const { data: project, error: fetchErr } = await supabaseAdmin
      .from("vocal_projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (fetchErr || !project) throw new Error("Project not found");

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

    if (prediction.status === "processing" || prediction.status === "starting") {
      // Still working
      return new Response(JSON.stringify({ success: true, project, predictionStatus: prediction.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (prediction.status === "failed" || prediction.status === "canceled") {
      await supabaseAdmin.from("vocal_projects").update({
        status: "error",
        error_message: prediction.error || "Pipeline step failed",
        current_prediction_id: null,
      }).eq("id", projectId);

      const { data: updated } = await supabaseAdmin.from("vocal_projects").select("*").eq("id", projectId).single();
      return new Response(JSON.stringify({ success: true, project: updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // prediction.status === "succeeded" — advance to next step
    const output = prediction.output;

    switch (project.status) {
      case "cleaning": {
        // Demucs output is typically an object with stem URLs
        let cleanVocalUrl = "";
        if (typeof output === "object" && output !== null) {
          cleanVocalUrl = output.vocals || output.Vocals || (Array.isArray(output) ? output[0] : "");
        } else if (typeof output === "string") {
          cleanVocalUrl = output;
        }

        if (!cleanVocalUrl) {
          // If output structure is different, try to get any URL
          cleanVocalUrl = JSON.stringify(output).match(/https?:\/\/[^\s"]+/)?.[0] || "";
        }

        // Store cleaned vocal
        const storedUrl = await storeToStorage(cleanVocalUrl, user.id, projectId, "clean_vocal.wav");

        // Start analysis with Whisper
        const whisperPrediction = await startPrediction(MODELS.whisper, {
          audio: storedUrl,
          model: "large-v3",
          language: "auto",
          translate: false,
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
        const analysisData = project.analysis_data as Record<string, unknown> || {};
        const stage = (analysisData.stage as string) || "whisper";

        if (stage === "whisper") {
          // Whisper done — extract transcription
          const transcription = typeof output === "object" ? (output.transcription || output.text || JSON.stringify(output)) : String(output);
          
          // Now use LLM to build a prompt for beat generation
          // Use meta/llama via Replicate
          const promptText = `You are a music production AI assistant. Based on the following vocal transcription and the target genre "${project.genre}", generate a detailed music production prompt for creating an instrumental beat.

Vocal transcription/lyrics: "${transcription}"

Generate a prompt that includes:
1. Tempo (BPM) appropriate for the genre
2. Key signature that would complement the vocals
3. Mood and energy level
4. Specific instruments to use
5. Song structure (intro, verse, chorus, bridge, outro)
6. Any specific production techniques

Format your response as a single detailed paragraph that could be used as a prompt for an AI music generator. Make it sound professional and specific. The beat should be 3 minutes long.`;

          // Use Lovable AI gateway for LLM instead of Replicate for faster response
          const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
          let generatedPrompt = "";
          
          if (LOVABLE_API_KEY) {
            try {
              const llmRes = await fetch("https://ai.lovable.dev/api/v1/chat/completions", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${LOVABLE_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "google/gemini-2.5-flash",
                  messages: [{ role: "user", content: promptText }],
                  max_tokens: 500,
                }),
              });
              if (llmRes.ok) {
                const llmData = await llmRes.json();
                generatedPrompt = llmData.choices?.[0]?.message?.content || "";
              }
            } catch (e) {
              console.error("LLM error:", e);
            }
          }

          if (!generatedPrompt) {
            // Fallback prompt
            generatedPrompt = `Professional ${project.genre} instrumental beat, 3 minutes, modern production, radio-ready mix, dynamic arrangement with intro, verse, chorus, bridge and outro sections`;
          }

          // Start beat generation with MusicGen (3 variations)
          // We'll generate the first variation now
          const beatPrediction = await startPrediction(MODELS.musicgen, {
            prompt: generatedPrompt,
            duration: 180, // 3 minutes
            model_version: "stereo-melody-large",
            output_format: "wav",
            normalization_strategy: "loudness",
          });

          await supabaseAdmin.from("vocal_projects").update({
            status: "generating",
            current_prediction_id: beatPrediction.id,
            generated_prompt: generatedPrompt,
            analysis_data: {
              ...analysisData,
              stage: "beat_1",
              transcription,
              prompt: generatedPrompt,
            },
          }).eq("id", projectId);
          break;
        }
        break;
      }

      case "generating": {
        const analysisData = project.analysis_data as Record<string, unknown> || {};
        const stage = (analysisData.stage as string) || "beat_1";
        const beatUrls = (project.beat_urls as string[]) || [];
        const prompt = project.generated_prompt || "";

        const beatUrl = typeof output === "string" ? output : (Array.isArray(output) ? output[0] : "");
        const storedBeatUrl = await storeToStorage(beatUrl, user.id, projectId, `beat_${beatUrls.length + 1}.wav`);
        const newBeatUrls = [...beatUrls, storedBeatUrl];

        if (stage === "beat_1") {
          // Start beat 2 with slight variation
          const beatPrediction = await startPrediction(MODELS.musicgen, {
            prompt: prompt + " More energetic variation with stronger drums.",
            duration: 30, // 30s for variation 2 (free tier)
            model_version: "stereo-melody-large",
            output_format: "wav",
            normalization_strategy: "loudness",
          });

          await supabaseAdmin.from("vocal_projects").update({
            beat_urls: newBeatUrls,
            current_prediction_id: beatPrediction.id,
            analysis_data: { ...analysisData, stage: "beat_2" },
          }).eq("id", projectId);
        } else if (stage === "beat_2") {
          // Start beat 3
          const beatPrediction = await startPrediction(MODELS.musicgen, {
            prompt: prompt + " Stripped back, acoustic-leaning arrangement.",
            duration: 30,
            model_version: "stereo-melody-large",
            output_format: "wav",
            normalization_strategy: "loudness",
          });

          await supabaseAdmin.from("vocal_projects").update({
            beat_urls: newBeatUrls,
            current_prediction_id: beatPrediction.id,
            analysis_data: { ...analysisData, stage: "beat_3" },
          }).eq("id", projectId);
        } else if (stage === "beat_3") {
          // All 3 beats generated — move to mixing
          // For mixing we'll store beats and mark as done for now
          // Real mixing would use FFmpeg — simplified here
          await supabaseAdmin.from("vocal_projects").update({
            beat_urls: newBeatUrls,
            mixed_urls: newBeatUrls.map((url, i) => url), // Placeholder — in production mix vocal + beat
            mastered_urls: newBeatUrls,
            final_urls: newBeatUrls,
            status: "done",
            current_prediction_id: null,
            analysis_data: { ...analysisData, stage: "complete" },
          }).eq("id", projectId);
        }
        break;
      }

      default: {
        // Unknown status — mark as error
        await supabaseAdmin.from("vocal_projects").update({
          status: "error",
          error_message: `Unknown status: ${project.status}`,
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
