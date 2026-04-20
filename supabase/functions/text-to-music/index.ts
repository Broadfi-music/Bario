// Text-to-Music edge function powered by Google Lyria 2 on Replicate.
// Accepts a text prompt and/or lyrics and returns a generated music URL.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Latest Lyria 2 version (verified 2025-11-25)
const LYRIA_VERSION =
  "bb621623ee2772c96d300b2a303c9e444b482f6b0fafcc7424923e1429971120";

async function pollPrediction(id: string, maxAttempts = 90): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
    });
    const data = await res.json();
    if (data.status === "succeeded") return data.output as string;
    if (data.status === "failed" || data.status === "canceled") {
      throw new Error(`Lyria failed: ${data.error || data.status}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Lyria timed out");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) throw new Error("Unauthorized");

    const body = await req.json().catch(() => ({}));
    const prompt: string = (body.prompt || "").toString().trim();
    const lyrics: string = (body.lyrics || "").toString().trim();
    const genre: string = (body.genre || "").toString().trim();
    const negativePrompt: string = (body.negativePrompt || "").toString().trim();

    if (!prompt && !lyrics) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Provide a text prompt or lyrics.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Build a Lyria-friendly composite prompt.
    // Lyria 2 expects natural-language descriptions; lyrics are folded in as
    // a styling cue ("with vocals singing: ...") because Lyria can't render
    // exact lyrics like Suno — but it follows the mood/structure.
    const promptParts: string[] = [];
    if (genre) promptParts.push(`${genre} track`);
    if (prompt) promptParts.push(prompt);
    if (lyrics) {
      const trimmedLyrics = lyrics.slice(0, 600);
      promptParts.push(`with vocals singing: "${trimmedLyrics}"`);
    }
    const finalPrompt = promptParts.join(", ");

    console.log("text-to-music prompt:", finalPrompt.slice(0, 200));

    const startRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: LYRIA_VERSION,
        input: {
          prompt: finalPrompt,
          ...(negativePrompt ? { negative_prompt: negativePrompt } : {}),
        },
      }),
    });

    const startBody = await startRes.text();
    if (!startRes.ok) {
      console.error("Replicate start failed:", startRes.status, startBody);
      throw new Error(
        `Replicate failed (${startRes.status}): ${startBody.slice(0, 240)}`,
      );
    }

    const startData = JSON.parse(startBody);
    console.log("Lyria prediction started:", startData.id);

    const audioUrl = await pollPrediction(startData.id);
    console.log("Lyria done:", audioUrl);

    return new Response(
      JSON.stringify({
        success: true,
        audioUrl,
        prompt: finalPrompt,
        predictionId: startData.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("text-to-music error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: (err as Error).message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
