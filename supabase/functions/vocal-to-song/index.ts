import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.1/cors";

const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function startReplicatePrediction(model: string, version: string, input: Record<string, unknown>) {
  const res = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ version, input }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Replicate ${model} failed: ${err}`);
  }
  return await res.json();
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
    const { vocalUrl, genre, description } = body;

    if (!vocalUrl) throw new Error("vocalUrl is required");
    if (!genre) throw new Error("genre is required");

    // Create project row
    const { data: project, error: insertError } = await supabaseAdmin
      .from("vocal_projects")
      .insert({
        user_id: user.id,
        status: "cleaning",
        original_vocal_url: vocalUrl,
        genre,
        description: description || null,
        is_paid: false, // TODO: check subscription
      })
      .select("id")
      .single();

    if (insertError) throw new Error(`DB insert failed: ${insertError.message}`);

    // Step 1: Start vocal cleaning with Demucs
    // Using cjwbw/demucs htdemucs model
    const prediction = await startReplicatePrediction(
      "demucs",
      "25a173108cff36ef9f80f854c162d01df9e6528be175794b81571f6c6c65f18b",
      {
        audio: vocalUrl,
        model: "htdemucs",
        stem: "vocals",
      }
    );

    // Save prediction ID for polling
    await supabaseAdmin
      .from("vocal_projects")
      .update({
        current_prediction_id: prediction.id,
        status: "cleaning",
      })
      .eq("id", project.id);

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
