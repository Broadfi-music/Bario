import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Convert URL-safe base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function base64UrlEncode(data: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createVapidJwt(
  audience: string,
  subject: string,
  privateKeyBase64: string
): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 3600, sub: subject };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key
  const keyData = urlBase64ToUint8Array(privateKeyBase64);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw r||s format if needed
  const sigArray = new Uint8Array(signature);
  const sigB64 = base64UrlEncode(sigArray);

  return `${unsignedToken}.${sigB64}`;
}

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth_key: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    const url = new URL(subscription.endpoint);
    const audience = `${url.protocol}//${url.host}`;

    // For simplicity, we'll send the notification via the endpoint directly
    // Web Push encryption is complex - we'll use a simplified approach
    const jwt = await createVapidJwt(audience, "mailto:admin@bario.app", vapidPrivateKey);

    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
        "Content-Type": "application/octet-stream",
        TTL: "86400",
        Urgency: "high",
      },
      body: payload,
    });

    if (response.status === 201 || response.status === 200) {
      return true;
    }

    console.log(`Push failed with status ${response.status}: ${await response.text()}`);
    
    // If subscription is invalid (410 Gone), we should clean it up
    if (response.status === 404 || response.status === 410) {
      console.log("Subscription expired, should be cleaned up:", subscription.endpoint);
    }

    return false;
  } catch (error) {
    console.error("Error sending push:", error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { user_id, title, message, action_url, type = "general" } = await req.json();

    if (!user_id || !title || !message) {
      return new Response(
        JSON.stringify({ error: "user_id, title, and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Insert notification into database
    const { error: notifError } = await supabase.from("notifications").insert({
      user_id,
      type,
      title,
      message,
      action_url: action_url || null,
    });

    if (notifError) {
      console.error("Error inserting notification:", notifError);
    }

    // 2. Try to send push notification if VAPID keys are configured
    let pushSent = false;
    if (vapidPublicKey && vapidPrivateKey) {
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", user_id);

      if (subscriptions && subscriptions.length > 0) {
        const payload = JSON.stringify({ title, message, body: message, action_url, type });

        for (const sub of subscriptions) {
          const sent = await sendWebPush(sub, payload, vapidPublicKey, vapidPrivateKey);
          if (sent) pushSent = true;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notification_saved: !notifError,
        push_sent: pushSent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
