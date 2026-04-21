// Text-to-Music: generates TWO music variations in parallel via Google Lyria 3 Pro
// (Replicate) and TWO matching square cover artworks via Lovable AI Gateway
// (google/gemini-2.5-flash-image). Persists each result as a row in `tracks`
// so the user's projects list can render them.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const LYRIA_MODEL = "google/lyria-3-pro";

async function pollPrediction(id: string, maxAttempts = 90): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
    });
    const data = await res.json();
    if (data.status === "succeeded") {
      const out = data.output;
      return Array.isArray(out) ? out[0] : (out as string);
    }
    if (data.status === "failed" || data.status === "canceled") {
      throw new Error(`Generation failed: ${data.error || data.status}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Generation timed out");
}

async function generateOneTrack(prompt: string, negativePrompt: string, seed?: number): Promise<string> {
  const startRes = await fetch(
    `https://api.replicate.com/v1/models/${LYRIA_MODEL}/predictions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
        Prefer: "wait=5",
      },
      body: JSON.stringify({
        input: {
          prompt,
          ...(negativePrompt ? { negative_prompt: negativePrompt } : {}),
          ...(seed !== undefined ? { seed } : {}),
        },
      }),
    },
  );

  const startBody = await startRes.text();
  if (!startRes.ok) {
    console.error("Replicate start failed:", startRes.status, startBody);
    throw new Error(`Generator failed (${startRes.status})`);
  }

  const startData = JSON.parse(startBody);
  console.log("Prediction started:", startData.id);

  // If Replicate already returned an output (Prefer: wait=5 path), use it.
  if (startData.status === "succeeded" && startData.output) {
    const out = startData.output;
    return Array.isArray(out) ? out[0] : (out as string);
  }

  return await pollPrediction(startData.id);
}

async function generateCover(prompt: string, variantHint: string): Promise<string | null> {
  try {
    const visualPrompt = `Album cover art, square 1:1, high contrast, cinematic lighting, no text, no watermark. Vibe: ${prompt}. Style hint: ${variantHint}.`;
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: visualPrompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) {
      console.error("Cover generation failed:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const url = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    return typeof url === "string" ? url : null;
  } catch (err) {
    console.error("Cover error:", err);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) throw new Error("Unauthorized");
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const prompt: string = (body.prompt || "").toString().trim();
    const lyrics: string = (body.lyrics || "").toString().trim();
    const genre: string = (body.genre || "").toString().trim();
    const negativePrompt: string = (body.negativePrompt || "").toString().trim();

    if (!prompt && !lyrics) {
      return new Response(
        JSON.stringify({ success: false, error: "Provide a text prompt or lyrics." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const promptParts: string[] = [];
    if (genre) promptParts.push(`${genre} track`);
    if (prompt) promptParts.push(prompt);
    if (lyrics) {
      const trimmedLyrics = lyrics.slice(0, 600);
      promptParts.push(`with vocals singing: "${trimmedLyrics}"`);
    }
    const finalPrompt = promptParts.join(", ");

    console.log("text-to-music prompt:", finalPrompt.slice(0, 200));

    // Generate two music variations + two cover images IN PARALLEL.
    const seedA = Math.floor(Math.random() * 1_000_000);
    const seedB = (seedA + 7919) % 1_000_000;

    const [audioA, audioB, coverA, coverB] = await Promise.all([
      generateOneTrack(finalPrompt, negativePrompt, seedA),
      generateOneTrack(`${finalPrompt}, alternate arrangement, different energy`, negativePrompt, seedB),
      generateCover(finalPrompt, "warm cinematic"),
      generateCover(finalPrompt, "bold neon stylized"),
    ]);

    console.log("Both tracks done:", audioA, audioB);

    const baseTitle = (prompt || "AI Track").slice(0, 60);

    // Persist each variation as a track row so it shows in the user's projects.
    const trackRows = [
      {
        user_id: userId,
        genre: genre || "ai",
        description: `${baseTitle} (Take 1)`,
        status: "completed",
        remix_audio_url: audioA,
        original_audio_url: null,
        fx_config: { source: "text-to-music", prompt: finalPrompt, cover_url: coverA, variation: 1 },
      },
      {
        user_id: userId,
        genre: genre || "ai",
        description: `${baseTitle} (Take 2)`,
        status: "completed",
        remix_audio_url: audioB,
        original_audio_url: null,
        fx_config: { source: "text-to-music", prompt: finalPrompt, cover_url: coverB, variation: 2 },
      },
    ];

    const { data: insertedTracks, error: insertError } = await supabaseAdmin
      .from("tracks")
      .insert(trackRows)
      .select("id");

    if (insertError) {
      console.error("Track insert error:", insertError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        prompt: finalPrompt,
        title: baseTitle,
        variations: [
          { audioUrl: audioA, coverUrl: coverA, trackId: insertedTracks?.[0]?.id || null },
          { audioUrl: audioB, coverUrl: coverB, trackId: insertedTracks?.[1]?.id || null },
        ],
        // Back-compat for older clients
        audioUrl: audioA,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("text-to-music error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
