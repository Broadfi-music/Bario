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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'create-upload') {
      const { 
        title, 
        description, 
        audioUrl, 
        coverImageUrl, 
        genre, 
        albumId,
        spotifyUrl,
        appleUrl,
        soundcloudUrl,
        youtubeUrl,
        durationMs
      } = body;

      if (!title || !audioUrl) {
        return new Response(
          JSON.stringify({ error: 'Title and audio URL are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: upload, error: uploadError } = await supabase
        .from('user_uploads')
        .insert({
          user_id: user.id,
          title,
          description,
          audio_url: audioUrl,
          cover_image_url: coverImageUrl,
          genre,
          album_id: albumId,
          spotify_url: spotifyUrl,
          apple_url: appleUrl,
          soundcloud_url: soundcloudUrl,
          youtube_url: youtubeUrl,
          duration_ms: durationMs,
        })
        .select()
        .single();

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return new Response(
          JSON.stringify({ error: 'Failed to create upload', details: uploadError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Also add to heatmap_tracks for visibility
      await supabase.from('heatmap_tracks').insert({
        title,
        artist_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown Artist',
        cover_image_url: coverImageUrl,
        preview_url: audioUrl,
        primary_genre: genre,
        duration_ms: durationMs,
        audius_url: soundcloudUrl || youtubeUrl,
        spotify_url: spotifyUrl,
        apple_url: appleUrl,
      });

      return new Response(
        JSON.stringify({ success: true, upload }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'create-album') {
      const { title, description, coverImageUrl, genre } = body;

      if (!title) {
        return new Response(
          JSON.stringify({ error: 'Album title is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: album, error: albumError } = await supabase
        .from('user_albums')
        .insert({
          user_id: user.id,
          title,
          description,
          cover_image_url: coverImageUrl,
          genre,
        })
        .select()
        .single();

      if (albumError) {
        return new Response(
          JSON.stringify({ error: 'Failed to create album', details: albumError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, album }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get-uploads') {
      const { data: uploads, error: uploadsError } = await supabase
        .from('user_uploads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (uploadsError) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch uploads' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ uploads }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get-albums') {
      const { data: albums, error: albumsError } = await supabase
        .from('user_albums')
        .select('*, user_uploads(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (albumsError) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch albums' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ albums }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Upload function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});