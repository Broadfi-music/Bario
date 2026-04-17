// RoEx Tonn API: takes the cleaned vocal stem + the generated instrumental,
// uploads them, runs a mix-preview-master pipeline, polls until done, then
// downloads the finished file and stores it in Supabase storage.
//
// Docs: https://tonn-portal.roexaudio.com/docs/getting-started

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ROEX_API_KEY = Deno.env.get("ROEX_API_KEY")!;
const ROEX_BASE = "https://tonn.roexaudio.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function callRoex(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${ROEX_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ROEX_API_KEY,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`RoEx ${path} failed (${res.status}): ${text.slice(0, 300)}`);
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

async function storeFromUrl(url: string, userId: string, projectId: string, filename: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not fetch RoEx output (${res.status})`);
  const buf = await res.arrayBuffer();
  const path = `${userId}/${projectId}/${filename}`;
  const { error } = await supabaseAdmin.storage
    .from("vocal-projects")
    .upload(path, new Uint8Array(buf), { contentType: "audio/wav", upsert: true });
  if (error) throw error;
  const { data: { publicUrl } } = supabaseAdmin.storage.from("vocal-projects").getPublicUrl(path);
  return publicUrl;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user } } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) throw new Error("Unauthorized");

    const { vocalUrl, instrumentalUrl, projectId, variationIndex, referenceUrl, musicalStyle } = await req.json();
    if (!vocalUrl || !instrumentalUrl || !projectId) {
      throw new Error("vocalUrl, instrumentalUrl and projectId required");
    }

    console.log("RoEx mix-master start", { projectId, variationIndex });

    // 1) Create a multitrack mix-preview-master task
    const createBody: Record<string, unknown> = {
      multitrackData: {
        trackData: [
          {
            trackURL: vocalUrl,
            instrumentGroup: "VOCAL_GROUP",
            presenceSetting: "LEAD",
            panPreference: "CENTRE",
            reverbPreference: "LOW",
          },
          {
            trackURL: instrumentalUrl,
            instrumentGroup: "BACKING_GROUP",
            presenceSetting: "NORMAL",
            panPreference: "CENTRE",
            reverbPreference: "LOW",
          },
        ],
        musicalStyle: musicalStyle || "POP",
        desiredLoudness: "MEDIUM",
        sampleRate: "44100",
        webhookURL: null,
      },
    };
    if (referenceUrl) {
      (createBody.multitrackData as Record<string, unknown>).referenceTrackURL = referenceUrl;
    }

    const createRes = await callRoex("/mixpreviewmaster", createBody);
    const taskId =
      createRes?.multitrack_task_id ||
      createRes?.taskId ||
      createRes?.task_id ||
      createRes?.id;
    if (!taskId) throw new Error(`RoEx returned no task id: ${JSON.stringify(createRes).slice(0, 200)}`);

    console.log("RoEx task created", taskId);

    // 2) Poll for completion (up to ~3 minutes)
    let downloadUrl: string | null = null;
    const start = Date.now();
    const maxMs = 180_000;
    while (Date.now() - start < maxMs) {
      await new Promise((r) => setTimeout(r, 5000));
      const statusRes = await callRoex("/retrievefinalmix", { multitrackTaskId: taskId });
      const status = statusRes?.status || statusRes?.task_status || statusRes?.state;
      console.log("RoEx poll", taskId, status);
      const url =
        statusRes?.download_url ||
        statusRes?.downloadUrl ||
        statusRes?.preview_master_url ||
        statusRes?.previewMasterURL ||
        statusRes?.preview_master_track_url;
      if (url) {
        downloadUrl = url;
        break;
      }
      if (status && /failed|error/i.test(String(status))) {
        throw new Error(`RoEx task failed: ${JSON.stringify(statusRes).slice(0, 200)}`);
      }
    }

    if (!downloadUrl) throw new Error("RoEx task timed out");

    // 3) Persist to Supabase storage
    const finalUrl = await storeFromUrl(
      downloadUrl,
      user.id,
      projectId,
      `mastered_v${(variationIndex ?? 0) + 1}.wav`,
    );

    return new Response(
      JSON.stringify({ success: true, masteredUrl: finalUrl, taskId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("roex-mix-master error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
