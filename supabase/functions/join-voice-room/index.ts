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
  canPublish: boolean
): Promise<string> => {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 7200; // 2 hour expiry for longer sessions

  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    iss: apiKey,
    sub: participantIdentity,
    nbf: now,
    exp: exp,
    name: participantName,
    video: {
      room: roomName,
      roomJoin: true,
      canPublish: canPublish,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: canPublish,
      roomRecord: canPublish,
    },
    metadata: JSON.stringify({ canPublish }),
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

// Check if LiveKit is available and configured
const isLiveKitAvailable = (): boolean => {
  const apiKey = Deno.env.get('LIVEKIT_API_KEY');
  const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');
  const url = Deno.env.get('LIVEKIT_URL');
  return !!(apiKey && apiSecret && url);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, userId, userName, isHost } = await req.json();
    
    console.log('Join voice room request:', { sessionId, userId, userName, isHost });
    
    if (!sessionId || !userId) {
      throw new Error('Missing sessionId or userId');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const roomName = `podcast-${sessionId}`;
    // CRITICAL: Hosts MUST be able to publish (speak) - this was the bug!
    let canPublish = isHost === true;
    let canSubscribe = true; // ALL users can subscribe (hear others)

    // Check if user is a speaker/host in the session (skip for demo sessions)
    if (!sessionId.startsWith('demo-') && !isHost) {
      const { data: participant } = await supabase
        .from('podcast_participants')
        .select('role')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .single();

      if (participant) {
        // Hosts, co-hosts, and speakers can publish (speak)
        canPublish = ['host', 'co_host', 'speaker'].includes(participant.role);
      }
    } else if (isHost) {
      // Host always can publish - explicit check
      canPublish = true;
    }
    
    console.log('Voice room permissions:', { userId, isHost, canPublish, canSubscribe, roomName });

    // Try LiveKit first
    if (isLiveKitAvailable()) {
      try {
        const LIVEKIT_API_KEY = Deno.env.get('LIVEKIT_API_KEY')!;
        const LIVEKIT_API_SECRET = Deno.env.get('LIVEKIT_API_SECRET')!;
        const LIVEKIT_URL = Deno.env.get('LIVEKIT_URL')!;

        const token = await createLiveKitToken(
          LIVEKIT_API_KEY,
          LIVEKIT_API_SECRET,
          roomName,
          userId,
          userName || 'Participant',
          canPublish
        );

        console.log('LiveKit token generated successfully');

        return new Response(
          JSON.stringify({
            provider: 'livekit',
            token,
            url: LIVEKIT_URL,
            roomName,
            canPublish
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (livekitError) {
        console.error('LiveKit error, falling back to Jitsi:', livekitError);
      }
    }

    // Fallback to Jitsi
    console.log('Using Jitsi fallback');
    const jitsiRoomName = `bario-podcast-${sessionId.replace(/-/g, '')}`;
    const jitsiUrl = `https://meet.jit.si/${jitsiRoomName}`;

    return new Response(
      JSON.stringify({
        provider: 'jitsi',
        url: jitsiUrl,
        roomName: jitsiRoomName,
        canPublish,
        config: {
          startWithAudioMuted: !canPublish,
          startWithVideoMuted: true, // Audio-only
          disableVideo: true,
          prejoinPageEnabled: false,
          configOverwrite: {
            disableDeepLinking: true,
            startAudioOnly: true,
            disableVideo: true,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            TOOLBAR_BUTTONS: ['microphone', 'hangup', 'raisehand'],
            DISABLE_VIDEO_BACKGROUND: true,
          }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Join voice room error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
