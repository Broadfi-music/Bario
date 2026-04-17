// Vocal-to-Song orchestrator (rewritten).
//
// Pipeline:
//  1. Demucs cleans the vocal (htdemucs).
//  2. vocal-analyze extracts BPM, key, energy, duration.
//  3. Three engines launch in parallel, each conditioned on the cleaned vocal:
//      v1: MusicGen-Melody  (uses vocal as melody reference — best fit)
//      v2: MusicGen-Stereo  (high-quality stereo, prompt + BPM/key)
//      v3: Stable Audio 2.5 (fallback, prompt + BPM/key)
//  4. The poll function ingests each finished beat and triggers RoEx
//     mix+master against the cleaned vocal.

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

async function startReplicatePrediction(version: string, input: Record<string, unknown>) {
  const res = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ version, input }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Replicate failed (${res.status}): ${body.slice(0, 240)}`);
  return JSON.parse(body);
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

    const body = await req.json();
    const { vocalUrl, description, genre, referenceUrl } = body;
    if (!vocalUrl) throw new Error("vocalUrl is required");

    console.log("vocal-to-song START", user.id, vocalUrl.slice(0, 80));

    const { data: project, error: insertError } = await supabaseAdmin
      .from("vocal_projects")
      .insert({
        user_id: user.id,
        status: "cleaning",
        original_vocal_url: vocalUrl,
        genre: genre || null,
        description: description || null,
        user_prompt: description || null,
        reference_track_url: referenceUrl || null,
        is_paid: false,
        variation_engines: ["musicgen-melody", "musicgen-stereo", "stable-audio-2.5"],
        variation_statuses: ["pending", "pending", "pending"],
        variation_prediction_ids: ["", "", ""],
      })
      .select("id")
      .single();
    if (insertError) throw new Error(`DB insert: ${insertError.message}`);

    const prediction = await startReplicatePrediction(DEMUCS_VERSION, {
      audio: vocalUrl,
      model_name: "htdemucs",
      stem: "vocals",
      output_format: "wav",
    });

    await supabaseAdmin
      .from("vocal_projects")
      .update({ current_prediction_id: prediction.id, status: "cleaning" })
      .eq("id", project.id);

    console.log("Project created", project.id, "Demucs", prediction.id);

    return new Response(
      JSON.stringify({ success: true, projectId: project.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("vocal-to-song error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
