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
    const { action, sessionId, userId, audioData, title, description } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === 'start-recording') {
      // Update session to mark as recording
      await supabase
        .from('podcast_sessions')
        .update({ is_recording: true })
        .eq('id', sessionId);

      console.log('Started recording for session:', sessionId);
      return new Response(
        JSON.stringify({ success: true, message: 'Recording started' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'stop-recording') {
      // Update session to mark as not recording
      await supabase
        .from('podcast_sessions')
        .update({ is_recording: false })
        .eq('id', sessionId);

      console.log('Stopped recording for session:', sessionId);
      return new Response(
        JSON.stringify({ success: true, message: 'Recording stopped' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'save-episode') {
      // Validate required fields
      if (!sessionId || !userId || !title) {
        throw new Error('Missing required fields: sessionId, userId, title');
      }

      // Get session info
      const { data: session } = await supabase
        .from('podcast_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (!session) {
        throw new Error('Session not found');
      }

      // Calculate duration (started_at to now or ended_at)
      const startTime = session.started_at ? new Date(session.started_at).getTime() : Date.now();
      const endTime = session.ended_at ? new Date(session.ended_at).getTime() : Date.now();
      const durationMs = endTime - startTime;

      // If audio data is provided, upload to storage
      let audioUrl = null;
      if (audioData) {
        const fileName = `episode-${sessionId}-${Date.now()}.webm`;
        const audioBuffer = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('user-uploads')
          .upload(`episodes/${fileName}`, audioBuffer, {
            contentType: 'audio/webm',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from('user-uploads')
            .getPublicUrl(`episodes/${fileName}`);
          audioUrl = urlData?.publicUrl;
        }
      }

      // Create episode record
      const { data: episode, error: episodeError } = await supabase
        .from('podcast_episodes')
        .insert({
          session_id: sessionId,
          host_id: userId,
          title: title,
          description: description || session.description,
          audio_url: audioUrl,
          cover_image_url: session.cover_image_url,
          duration_ms: durationMs
        })
        .select()
        .single();

      if (episodeError) {
        throw episodeError;
      }

      console.log('Created episode:', episode.id, 'for session:', sessionId);
      return new Response(
        JSON.stringify({ success: true, episode }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');
  } catch (error: unknown) {
    console.error('Podcast recording error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
