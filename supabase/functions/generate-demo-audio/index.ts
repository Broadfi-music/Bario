import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Turn {
  speaker: string;
  voiceId: string;
  text: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { roomId, turns } = (await req.json()) as {
      roomId: number;
      turns: Turn[];
    };

    if (!roomId || !turns?.length) {
      return new Response(
        JSON.stringify({ error: "roomId and turns[] required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating audio for room ${roomId} with ${turns.length} turns...`);

    const audioChunks: Uint8Array[] = [];

    for (let i = 0; i < turns.length; i++) {
      const turn = turns[i];
      console.log(`  Turn ${i + 1}/${turns.length}: ${turn.speaker} (${turn.text.length} chars)`);

      const ttsResponse = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${turn.voiceId}?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: turn.text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.4,
              similarity_boost: 0.75,
              style: 0.3,
              use_speaker_boost: true,
            },
            // Request stitching for natural flow
            ...(i > 0 ? { previous_text: turns[i - 1].text } : {}),
            ...(i < turns.length - 1 ? { next_text: turns[i + 1].text } : {}),
          }),
        }
      );

      if (!ttsResponse.ok) {
        const errText = await ttsResponse.text();
        console.error(`ElevenLabs error on turn ${i + 1}:`, ttsResponse.status, errText);
        // If rate limited, wait and retry once
        if (ttsResponse.status === 429) {
          console.log("Rate limited, waiting 30s...");
          await new Promise((r) => setTimeout(r, 30000));
          const retryResponse = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${turn.voiceId}?output_format=mp3_44100_128`,
            {
              method: "POST",
              headers: {
                "xi-api-key": ELEVENLABS_API_KEY,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                text: turn.text,
                model_id: "eleven_multilingual_v2",
                voice_settings: { stability: 0.4, similarity_boost: 0.75, style: 0.3 },
              }),
            }
          );
          if (!retryResponse.ok) {
            const retryErr = await retryResponse.text();
            throw new Error(`ElevenLabs retry failed: ${retryResponse.status} ${retryErr}`);
          }
          const buf = await retryResponse.arrayBuffer();
          audioChunks.push(new Uint8Array(buf));
          continue;
        }
        throw new Error(`ElevenLabs error: ${ttsResponse.status} ${errText}`);
      }

      const buffer = await ttsResponse.arrayBuffer();
      audioChunks.push(new Uint8Array(buffer));

      // Small delay between calls to avoid rate limiting
      if (i < turns.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    // Concatenate all audio chunks
    const totalLength = audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of audioChunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    console.log(`Combined audio: ${totalLength} bytes`);

    // Upload to Supabase storage
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const fileName = `demo-room-${roomId}.mp3`;
    const { error: uploadError } = await supabase.storage
      .from("demo-audio")
      .upload(fileName, combined, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from("demo-audio")
      .getPublicUrl(fileName);

    console.log(`Uploaded: ${urlData.publicUrl}`);

    return new Response(
      JSON.stringify({ success: true, url: urlData.publicUrl, bytes: totalLength }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-demo-audio error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
