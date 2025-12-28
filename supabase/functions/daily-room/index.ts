import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, userId, userName, isHost } = await req.json();
    
    console.log('Daily room request:', { sessionId, userId, userName, isHost });
    
    if (!sessionId || !userId) {
      throw new Error('Missing sessionId or userId');
    }

    const DAILY_API_KEY = Deno.env.get('DAILY_API_KEY');
    
    if (!DAILY_API_KEY) {
      console.error('Daily API key not configured');
      throw new Error('Daily.co not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const roomName = `bario-podcast-${sessionId.replace(/-/g, '').substring(0, 20)}`;
    let canPublish = isHost;

    // Check if user is a speaker/host in the session (skip for demo sessions)
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
    
    console.log('Voice room permissions:', { userId, isHost, canPublish });

    // Step 1: Create or get room
    let roomUrl: string;
    
    try {
      // First try to get existing room
      const getRoomResponse = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${DAILY_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (getRoomResponse.ok) {
        const existingRoom = await getRoomResponse.json();
        roomUrl = existingRoom.url;
        console.log('Using existing room:', roomUrl);
      } else {
        // Create new room
        const createRoomResponse = await fetch('https://api.daily.co/v1/rooms', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${DAILY_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: roomName,
            privacy: 'public',
            properties: {
              enable_chat: true,
              enable_knocking: false,
              start_audio_off: !canPublish,
              start_video_off: true,
              enable_screenshare: false,
              exp: Math.floor(Date.now() / 1000) + 86400, // 24 hour expiry
              eject_at_room_exp: true,
              enable_recording: 'cloud',
              max_participants: 100,
            },
          }),
        });

        if (!createRoomResponse.ok) {
          const errorText = await createRoomResponse.text();
          console.error('Failed to create Daily room:', errorText);
          throw new Error(`Failed to create room: ${errorText}`);
        }

        const newRoom = await createRoomResponse.json();
        roomUrl = newRoom.url;
        console.log('Created new room:', roomUrl);
      }
    } catch (roomError) {
      console.error('Room creation error:', roomError);
      throw roomError;
    }

    // Step 2: Create meeting token for the user
    const tokenResponse = await fetch('https://api.daily.co/v1/meeting-tokens', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          user_name: userName || 'Participant',
          user_id: userId,
          is_owner: isHost,
          enable_recording: isHost ? 'cloud' : undefined,
          start_audio_off: !canPublish,
          start_video_off: true,
          exp: Math.floor(Date.now() / 1000) + 7200, // 2 hour token expiry
        },
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Failed to create meeting token:', errorText);
      throw new Error(`Failed to create token: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('Token created successfully');

    return new Response(
      JSON.stringify({
        provider: 'daily',
        roomUrl,
        roomName,
        token: tokenData.token,
        canPublish,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Daily room error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
