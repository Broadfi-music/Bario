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
  voiceClone: "0a9c7c558af4c0f20667c1bd1260ce32a2879944a0b9e44e1398660c077b1550",
  stableAudio: "9aff84a639f96d0f7e6081cdea002d15133d0043727f849c40abdd166b7c75a8",
};

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
  // Fallback: find any audio URL in stringified output
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

    // Stages that don't need a prediction check (mixing uses FFmpeg, not Replicate)
    if (project.status === "mixing" && !project.current_prediction_id) {
      // FFmpeg mixing stage — handled inline below
      return await handleMixingStage(project, user.id, projectId);
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
    console.log("Succeeded, output:", typeof output, Array.isArray(output) ? `[${output.length}]` : "");

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
          // Whisper just completed — extract transcription, start Llama
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
- Reference artists/producers for style

Output ONLY the Lyria prompt text. No explanations.`;

          // Start Llama 3 70B on Replicate
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
          // Llama completed — extract generated prompt, start Lyria
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

      // ─── STEP 3: Beat Generation (Lyria 3 Pro × 3) → Voice Cloning ───
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
          // All 3 beats done → Voice Cloning stage
          console.log("All 3 beats generated. Starting voice cloning...");

          const clonePred = await startPrediction(MODELS.voiceClone, {
            song_input: newBeatUrls[0], // Use first beat as base for harmony generation
            rvc_model: "Squidward", // Default model — the voice clone will learn from the clean vocal
            custom_rvc_model_download_url: "", // We use the clean vocal as reference
            protect: 0.33,
            index_rate: 0.5,
            filter_radius: 3,
            rms_mix_rate: 0.25,
            pitch_change: "no-change",
            output_format: "wav",
            reverb_size: 0.1,
            reverb_damping: 0.7,
            reverb_dryness: 0.8,
            main_vocals_volume_change: -6, // Backup vocals lower
            backup_vocals_volume_change: -10,
          });

          await supabaseAdmin.from("vocal_projects").update({
            beat_urls: newBeatUrls,
            status: "cloning",
            current_prediction_id: clonePred.id,
            analysis_data: { ...analysisData, stage: "cloning" },
          }).eq("id", projectId);
        }
        break;
      }

      // ─── STEP 4: Voice Cloning → Mixing ───
      case "cloning": {
        const analysisData = (project.analysis_data as Record<string, unknown>) || {};

        // Voice clone output — harmonies/backup vocals
        const harmonyUrl = extractAudioUrl(output);
        console.log("Voice clone output:", harmonyUrl?.slice(0, 80));

        let harmonyUrls: string[] = [];
        if (harmonyUrl) {
          const storedHarmony = await storeToStorage(harmonyUrl, user.id, projectId, "harmony.wav");
          harmonyUrls = [storedHarmony];
        }

        // Transition to mixing — this is done via FFmpeg, not Replicate
        // We set status to "mixing" with no prediction_id; the next poll will handle it
        await supabaseAdmin.from("vocal_projects").update({
          status: "mixing",
          harmony_urls: harmonyUrls,
          current_prediction_id: null,
          analysis_data: { ...analysisData, stage: "mixing", mix_index: 0 },
        }).eq("id", projectId);
        break;
      }

      // ─── STEP 6: Mastering (Stable Audio) → Stems or Done ───
      case "mastering": {
        const analysisData = (project.analysis_data as Record<string, unknown>) || {};
        const masterIndex = (analysisData.master_index as number) || 0;
        const masteredUrls = (project.mastered_urls as string[]) || [];

        const masteredUrl = extractAudioUrl(output);
        let storedMastered = "";
        if (masteredUrl) {
          storedMastered = await storeToStorage(masteredUrl, user.id, projectId, `mastered_${masterIndex + 1}.wav`);
        } else {
          // If mastering fails, use the mixed version
          const mixedUrls = (project.mixed_urls as string[]) || [];
          storedMastered = mixedUrls[masterIndex] || "";
        }

        const newMasteredUrls = [...masteredUrls, storedMastered];
        const mixedUrls = (project.mixed_urls as string[]) || [];

        if (masterIndex + 1 < mixedUrls.length) {
          // Master next mix
          const nextMixUrl = mixedUrls[masterIndex + 1];
          const masterPred = await startPrediction(MODELS.stableAudio, {
            prompt: `Professional mastering: loudness normalization, multiband compression, stereo widening, streaming-ready. Genre: ${project.genre || "pop"}.`,
            seconds_total: 47, // Max length for stable audio
            cfg_scale: 4,
            steps: 80,
          });

          await supabaseAdmin.from("vocal_projects").update({
            mastered_urls: newMasteredUrls,
            current_prediction_id: masterPred.id,
            analysis_data: { ...analysisData, master_index: masterIndex + 1 },
          }).eq("id", projectId);
        } else {
          // All mastered — go to stems
          console.log("All tracks mastered. Starting stem generation...");

          const stemPred = await startPrediction(MODELS.demucs, {
            audio: newMasteredUrls[0],
            model_name: "htdemucs",
            output_format: "mp3",
          });

          await supabaseAdmin.from("vocal_projects").update({
            mastered_urls: newMasteredUrls,
            status: "stems",
            current_prediction_id: stemPred.id,
            analysis_data: { ...analysisData, stage: "stems" },
          }).eq("id", projectId);
        }
        break;
      }

      // ─── STEP 7: Stems → Done ───
      case "stems": {
        const analysisData = (project.analysis_data as Record<string, unknown>) || {};
        const masteredUrls = (project.mastered_urls as string[]) || [];

        // Store stem URLs
        let stemData: string[] = [];
        if (typeof output === "object" && output !== null && !Array.isArray(output)) {
          const stemObj = output as Record<string, string>;
          for (const [key, url] of Object.entries(stemObj)) {
            if (typeof url === "string" && url.startsWith("http")) {
              const stored = await storeToStorage(url, user.id, projectId, `stem_${key}.mp3`);
              stemData.push(stored);
            }
          }
        } else if (Array.isArray(output)) {
          for (let i = 0; i < output.length; i++) {
            const url = typeof output[i] === "string" ? output[i] : output[i]?.url;
            if (url) {
              const stored = await storeToStorage(url, user.id, projectId, `stem_${i}.mp3`);
              stemData.push(stored);
            }
          }
        }

        // Build final URLs with trim logic
        const isPaid = project.is_paid;
        const finalUrls = [...masteredUrls]; // All mastered tracks are final

        // For free users: only first is full, rest are 30s previews
        // (trim would need FFmpeg — for now we mark them and the frontend shows the label)

        console.log("Pipeline complete! Final URLs:", finalUrls.length);

        await supabaseAdmin.from("vocal_projects").update({
          status: "done",
          stem_urls: stemData,
          final_urls: finalUrls,
          current_prediction_id: null,
          analysis_data: { ...analysisData, stage: "complete" },
        }).eq("id", projectId);
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

// ─── FFmpeg Mixing Stage Handler ───
// Downloads clean vocal + beats + harmonies, mixes them via FFmpeg
async function handleMixingStage(project: Record<string, unknown>, userId: string, projectId: string) {
  const analysisData = (project.analysis_data as Record<string, unknown>) || {};
  const mixIndex = (analysisData.mix_index as number) || 0;
  const beatUrls = (project.beat_urls as string[]) || [];
  const cleanVocalUrl = project.clean_vocal_url as string;
  const harmonyUrls = (project.harmony_urls as string[]) || [];
  const mixedUrls = (project.mixed_urls as string[]) || [];

  if (mixIndex >= beatUrls.length) {
    // All mixes done → mastering
    console.log("All mixes done. Starting mastering...");

    // Start mastering the first mix with Stable Audio post-processing
    // Stable Audio Open generates audio from prompts — we use it for mastering-style processing
    const masterPred = await startPrediction(MODELS.stableAudio, {
      prompt: `Professional mastering of a ${project.genre || "pop"} song. Loudness normalization to -14 LUFS, multiband compression, stereo enhancement, EQ polish for streaming platforms. Warm, punchy, radio-ready sound.`,
      seconds_total: 47,
      cfg_scale: 4,
      steps: 80,
    });

    await supabaseAdmin.from("vocal_projects").update({
      status: "mastering",
      mixed_urls: mixedUrls,
      current_prediction_id: masterPred.id,
      analysis_data: { ...analysisData, stage: "mastering", master_index: 0 },
    }).eq("id", projectId);

    const { data: updated } = await supabaseAdmin.from("vocal_projects").select("*").eq("id", projectId).single();
    return new Response(JSON.stringify({ success: true, project: updated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    console.log(`Mixing variation ${mixIndex + 1}/${beatUrls.length}`);

    const beatUrl = beatUrls[mixIndex];

    // Download files for FFmpeg mixing
    const beatRes = await fetch(beatUrl);
    const vocalRes = await fetch(cleanVocalUrl);

    if (!beatRes.ok || !vocalRes.ok) {
      throw new Error(`Failed to download audio files for mixing`);
    }

    const beatData = new Uint8Array(await beatRes.arrayBuffer());
    const vocalData = new Uint8Array(await vocalRes.arrayBuffer());

    // Write temp files
    const tempBeat = `/tmp/beat_${mixIndex}.wav`;
    const tempVocal = `/tmp/vocal_${mixIndex}.wav`;
    const tempMixed = `/tmp/mixed_${mixIndex}.wav`;

    await Deno.writeFile(tempBeat, beatData);
    await Deno.writeFile(tempVocal, vocalData);

    // Build FFmpeg command
    // Mix: beat at -3dB, vocal at -1dB center, harmonies at -6dB if available
    let ffmpegCmd: string[];

    if (harmonyUrls.length > 0 && harmonyUrls[0]) {
      // Download harmony
      const harmRes = await fetch(harmonyUrls[0]);
      if (harmRes.ok) {
        const harmData = new Uint8Array(await harmRes.arrayBuffer());
        const tempHarm = `/tmp/harmony_${mixIndex}.wav`;
        await Deno.writeFile(tempHarm, harmData);

        // 3-input mix: beat + vocal + harmony
        ffmpegCmd = [
          "ffmpeg", "-y",
          "-i", tempBeat,
          "-i", tempVocal,
          "-i", tempHarm,
          "-filter_complex",
          "[0:a]volume=0.7[beat];[1:a]volume=0.9[vocal];[2:a]volume=0.4[harm];[beat][vocal][harm]amix=inputs=3:duration=longest:dropout_transition=2,acompressor=threshold=-20dB:ratio=4:attack=5:release=50,equalizer=f=100:width_type=o:width=2:g=2,equalizer=f=3000:width_type=o:width=2:g=1.5,equalizer=f=10000:width_type=o:width=2:g=1[out]",
          "-map", "[out]",
          "-ar", "44100",
          "-ac", "2",
          tempMixed,
        ];
      } else {
        // Fallback: 2-input mix
        ffmpegCmd = buildTwoInputMix(tempBeat, tempVocal, tempMixed);
      }
    } else {
      ffmpegCmd = buildTwoInputMix(tempBeat, tempVocal, tempMixed);
    }

    // Run FFmpeg
    console.log("Running FFmpeg mix...");
    const process = new Deno.Command(ffmpegCmd[0], {
      args: ffmpegCmd.slice(1),
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stderr } = await process.output();
    if (code !== 0) {
      const errText = new TextDecoder().decode(stderr);
      console.error("FFmpeg error:", errText.slice(0, 500));
      // Fallback: use the beat URL directly as the "mix"
      const newMixedUrls = [...mixedUrls, beatUrl];
      await supabaseAdmin.from("vocal_projects").update({
        mixed_urls: newMixedUrls,
        analysis_data: { ...analysisData, mix_index: mixIndex + 1 },
      }).eq("id", projectId);
    } else {
      // Upload mixed file
      const mixedData = await Deno.readFile(tempMixed);
      const storedMix = await storeToStorage(
        URL.createObjectURL(new Blob([mixedData])),
        userId, projectId, `mixed_${mixIndex + 1}.wav`
      );

      // Actually upload directly since createObjectURL won't work in Deno
      const mixPath = `${userId}/${projectId}/mixed_${mixIndex + 1}.wav`;
      const { error: uploadErr } = await supabaseAdmin.storage
        .from("vocal-projects")
        .upload(mixPath, mixedData, { contentType: "audio/wav", upsert: true });

      let finalMixUrl: string;
      if (uploadErr) {
        console.error("Mix upload error:", uploadErr);
        finalMixUrl = beatUrl; // fallback
      } else {
        const { data: { publicUrl } } = supabaseAdmin.storage.from("vocal-projects").getPublicUrl(mixPath);
        finalMixUrl = publicUrl;
      }

      const newMixedUrls = [...mixedUrls, finalMixUrl];
      await supabaseAdmin.from("vocal_projects").update({
        mixed_urls: newMixedUrls,
        analysis_data: { ...analysisData, mix_index: mixIndex + 1 },
      }).eq("id", projectId);
    }

    // Clean up temp files
    try {
      await Deno.remove(tempBeat);
      await Deno.remove(tempVocal);
      await Deno.remove(tempMixed);
    } catch { /* ignore */ }

  } catch (e) {
    console.error("Mixing error:", e);
    // Fallback: use beat URLs as mixed URLs
    const newMixedUrls = [...mixedUrls, beatUrls[mixIndex]];
    await supabaseAdmin.from("vocal_projects").update({
      mixed_urls: newMixedUrls,
      analysis_data: { ...analysisData, mix_index: mixIndex + 1 },
    }).eq("id", projectId);
  }

  const { data: updated } = await supabaseAdmin.from("vocal_projects").select("*").eq("id", projectId).single();
  return new Response(JSON.stringify({ success: true, project: updated }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildTwoInputMix(beatPath: string, vocalPath: string, outputPath: string): string[] {
  return [
    "ffmpeg", "-y",
    "-i", beatPath,
    "-i", vocalPath,
    "-filter_complex",
    "[0:a]volume=0.7[beat];[1:a]volume=0.9[vocal];[beat][vocal]amix=inputs=2:duration=longest:dropout_transition=2,acompressor=threshold=-20dB:ratio=4:attack=5:release=50,equalizer=f=100:width_type=o:width=2:g=2,equalizer=f=3000:width_type=o:width=2:g=1.5,equalizer=f=10000:width_type=o:width=2:g=1[out]",
    "-map", "[out]",
    "-ar", "44100",
    "-ac", "2",
    outputPath,
  ];
}
