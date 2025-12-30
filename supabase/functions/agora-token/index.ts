import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Agora RTC Token Generation
// Based on Agora's token algorithm for RTC

const VERSION = "007";
const VERSION_LENGTH = 3;

// Privileges
const PRIVILEGES = {
  JOIN_CHANNEL: 1,
  PUBLISH_AUDIO_STREAM: 2,
  PUBLISH_VIDEO_STREAM: 3,
  PUBLISH_DATA_STREAM: 4,
};

// HMAC-SHA256 signing
async function hmacSha256(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, message.buffer as ArrayBuffer);
  return new Uint8Array(signature);
}

// Pack content into bytes
function packContent(
  uid: number,
  channelName: string,
  privileges: Record<number, number>,
  salt: number,
  ts: number
): Uint8Array {
  const buffer: number[] = [];

  // Pack salt (4 bytes, little endian)
  buffer.push(salt & 0xff);
  buffer.push((salt >> 8) & 0xff);
  buffer.push((salt >> 16) & 0xff);
  buffer.push((salt >> 24) & 0xff);

  // Pack timestamp (4 bytes, little endian)
  buffer.push(ts & 0xff);
  buffer.push((ts >> 8) & 0xff);
  buffer.push((ts >> 16) & 0xff);
  buffer.push((ts >> 24) & 0xff);

  // Pack privileges count (2 bytes, little endian)
  const privilegeCount = Object.keys(privileges).length;
  buffer.push(privilegeCount & 0xff);
  buffer.push((privilegeCount >> 8) & 0xff);

  // Pack each privilege
  for (const [key, value] of Object.entries(privileges)) {
    const k = parseInt(key);
    buffer.push(k & 0xff);
    buffer.push((k >> 8) & 0xff);
    buffer.push(value & 0xff);
    buffer.push((value >> 8) & 0xff);
    buffer.push((value >> 16) & 0xff);
    buffer.push((value >> 24) & 0xff);
  }

  return new Uint8Array(buffer);
}

// Generate Agora RTC Token
async function generateRtcToken(
  appId: string,
  appCertificate: string,
  channelName: string,
  uid: number,
  role: 'publisher' | 'subscriber',
  expireTimestamp: number
): Promise<string> {
  const salt = Math.floor(Math.random() * 0xffffffff);
  const ts = Math.floor(Date.now() / 1000);
  const expireTs = expireTimestamp || ts + 3600; // Default 1 hour

  // Set privileges based on role
  const privileges: Record<number, number> = {
    [PRIVILEGES.JOIN_CHANNEL]: expireTs,
  };

  if (role === 'publisher') {
    privileges[PRIVILEGES.PUBLISH_AUDIO_STREAM] = expireTs;
    privileges[PRIVILEGES.PUBLISH_VIDEO_STREAM] = expireTs;
    privileges[PRIVILEGES.PUBLISH_DATA_STREAM] = expireTs;
  }

  // Pack the content
  const content = packContent(uid, channelName, privileges, salt, ts);

  // Create message to sign
  const encoder = new TextEncoder();
  const appIdBytes = encoder.encode(appId);
  const channelBytes = encoder.encode(channelName);
  
  // Build message buffer
  const messageBuffer = new Uint8Array(
    appIdBytes.length + channelBytes.length + 4 + content.length
  );
  let offset = 0;
  messageBuffer.set(appIdBytes, offset);
  offset += appIdBytes.length;
  messageBuffer.set(channelBytes, offset);
  offset += channelBytes.length;
  
  // Pack uid (4 bytes, little endian)
  messageBuffer[offset] = uid & 0xff;
  messageBuffer[offset + 1] = (uid >> 8) & 0xff;
  messageBuffer[offset + 2] = (uid >> 16) & 0xff;
  messageBuffer[offset + 3] = (uid >> 24) & 0xff;
  offset += 4;
  
  messageBuffer.set(content, offset);

  // Sign with HMAC-SHA256
  const signature = await hmacSha256(encoder.encode(appCertificate), messageBuffer);

  // Build final token
  const tokenBuffer = new Uint8Array(signature.length + content.length);
  tokenBuffer.set(signature, 0);
  tokenBuffer.set(content, signature.length);

  // Encode to base64
  const base64Token = btoa(String.fromCharCode(...tokenBuffer));

  // Add version prefix
  return VERSION + appId + base64Token;
}

// Simple UID generation from user ID string
function generateUid(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Ensure positive number and within Agora's UID range
  return Math.abs(hash) % 2147483647;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, userId, userName, isHost } = await req.json();

    console.log('Agora token request:', { sessionId, userId, userName, isHost });

    if (!sessionId || !userId) {
      throw new Error('Missing sessionId or userId');
    }

    const AGORA_APP_ID = Deno.env.get('AGORA_APP_ID');
    const AGORA_APP_CERTIFICATE = Deno.env.get('AGORA_APP_CERTIFICATE');

    if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
      console.error('Agora credentials not configured');
      throw new Error('Agora not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Determine role based on participant data
    let canPublish = isHost;

    if (!sessionId.startsWith('demo-')) {
      const { data: participant } = await supabase
        .from('podcast_participants')
        .select('role')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .single();

      if (participant) {
        canPublish = ['host', 'co_host', 'speaker'].includes(participant.role);
      }
    }

    console.log('Agora permissions:', { userId, isHost, canPublish });

    // Generate channel name and UID
    const channelName = `bario-${sessionId.replace(/-/g, '').substring(0, 30)}`;
    const uid = generateUid(userId);
    const role = canPublish ? 'publisher' : 'subscriber';
    const expireTimestamp = Math.floor(Date.now() / 1000) + 7200; // 2 hours

    // Generate token
    const token = await generateRtcToken(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channelName,
      uid,
      role,
      expireTimestamp
    );

    console.log('Agora token generated:', { channelName, uid, role });

    return new Response(
      JSON.stringify({
        appId: AGORA_APP_ID,
        channelName,
        token,
        uid,
        canPublish,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Agora token error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
