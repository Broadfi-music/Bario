import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Correct latest model versions from Replicate
const DEMUCS_VERSION = "25a173108cff36ef9f80f854c162d01df9e6528be175794b81158fa03836d953";

async function startReplicatePrediction(version: string, input: Record<string, unknown>) {
  console.log("Starting Replicate prediction:", { version: version.slice(0, 12), input: Object.keys(input) });
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
  console.log("Prediction started:", data.id, data.status);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { vocalUrl, description } = body;

    if (!vocalUrl) throw new Error("vocalUrl is required");

    console.log("Starting vocal-to-song for user:", user.id, "vocal:", vocalUrl.slice(0, 50));

    // Create project row — genre is optional, AI will detect it
    const { data: project, error: insertError } = await supabaseAdmin
      .from("vocal_projects")
      .insert({
        user_id: user.id,
        status: "cleaning",
        original_vocal_url: vocalUrl,
        genre: body.genre || null,
        description: description || null,
        is_paid: false,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("DB insert error:", insertError);
      throw new Error(`DB insert failed: ${insertError.message}`);
    }

    // Step 1: Start vocal cleaning with Demucs
    const prediction = await startReplicatePrediction(DEMUCS_VERSION, {
      audio: vocalUrl,
      model_name: "htdemucs",
      stem: "vocals",
      output_format: "wav",
    });

    // Save prediction ID for polling
    await supabaseAdmin
      .from("vocal_projects")
      .update({
        current_prediction_id: prediction.id,
        status: "cleaning",
      })
      .eq("id", project.id);

    console.log("Project created:", project.id, "Prediction:", prediction.id);

    return new Response(
      JSON.stringify({
        success: true,
        projectId: project.id,
        message: "Vocal processing started. Poll for status updates.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("vocal-to-song error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
