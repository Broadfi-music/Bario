import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// LiveKit JWT generation
const encodeBase64Url = (data: Uint8Array): string => {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const createLiveKitToken = async (
  apiKey: string,
  apiSecret: string,
  roomName: string,
  participantIdentity: string,
  participantName: string,
  isHost: boolean
): Promise<string> => {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600; // 1 hour expiry

  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const payload = {
    iss: apiKey,
    sub: participantIdentity,
    nbf: now,
    exp: exp,
    name: participantName,
    video: {
      room: roomName,
      roomJoin: true,
      canPublish: isHost,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: isHost,
      roomRecord: isHost,
    },
    metadata: JSON.stringify({ isHost }),
  };

  const encoder = new TextEncoder();
  const headerB64 = encodeBase64Url(encoder.encode(JSON.stringify(header)));
  const payloadB64 = encodeBase64Url(encoder.encode(JSON.stringify(payload)));
  
  const message = `${headerB64}.${payloadB64}`;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(apiSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  const signatureB64 = encodeBase64Url(new Uint8Array(signature));
  
  return `${message}.${signatureB64}`;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, userId, userName, isHost } = await req.json();
    
    if (!sessionId || !userId) {
      throw new Error('Missing sessionId or userId');
    }

    const LIVEKIT_API_KEY = Deno.env.get('LIVEKIT_API_KEY');
    const LIVEKIT_API_SECRET = Deno.env.get('LIVEKIT_API_SECRET');
    const LIVEKIT_URL = Deno.env.get('LIVEKIT_URL');

    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
      throw new Error('LiveKit credentials not configured');
    }

    // Verify user is a participant
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: participant } = await supabase
      .from('podcast_participants')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .single();

    if (!participant && !isHost) {
      throw new Error('Not a participant of this session');
    }

    const roomName = `podcast-${sessionId}`;
    const canPublish = isHost || participant?.role === 'host' || participant?.role === 'co_host' || participant?.role === 'speaker';

    const token = await createLiveKitToken(
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET,
      roomName,
      userId,
      userName || 'Participant',
      canPublish
    );

    console.log('Generated LiveKit token for:', userId, 'room:', roomName, 'canPublish:', canPublish);

    return new Response(
      JSON.stringify({ 
        token, 
        url: LIVEKIT_URL,
        roomName 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('LiveKit token error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
