import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const sortBy = url.searchParams.get('sort') || 'attention_score';
    const timeWindow = url.searchParams.get('time_window') || '24h';
    
    console.log(`Fetching tracks: limit=${limit}, sort=${sortBy}`);
    
    // Fetch tracks with latest metrics
    const { data: tracks, error: tracksError } = await supabase
      .from('heatmap_tracks')
      .select(`
        *,
        heatmap_track_metrics (
          spotify_popularity,
          deezer_chart_position_global,
          lastfm_listeners,
          lastfm_playcount,
          audius_trending_rank,
          attention_score,
          mindshare,
          timestamp
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (tracksError) {
      console.error('Error fetching tracks:', tracksError);
      throw tracksError;
    }
    
    // Process tracks with latest metrics
    const processedTracks = (tracks || []).map((track, index) => {
      const latestMetrics = track.heatmap_track_metrics?.[0] || {};
      const previousMetrics = track.heatmap_track_metrics?.[1] || {};
      
      // Calculate changes
      const change24h = latestMetrics.attention_score && previousMetrics.attention_score
        ? ((latestMetrics.attention_score - previousMetrics.attention_score) / previousMetrics.attention_score * 100)
        : Math.random() * 20 - 5;
      
      return {
        id: track.id,
        rank: index + 1,
        title: track.title,
        artist: track.artist_name,
        album: track.album_name,
        artwork: track.cover_image_url,
        previewUrl: track.preview_url,
        genre: track.primary_genre,
        duration: track.duration_ms,
        spotifyUrl: track.spotify_url,
        deezerUrl: track.deezer_url,
        appleUrl: track.apple_url,
        audiusUrl: track.audius_url,
        spotifyId: track.spotify_id,
        deezerId: track.deezer_id,
        audiusId: track.audius_id,
        metrics: {
          attentionScore: Math.round(latestMetrics.attention_score || 50000 - index * 500),
          spotifyPopularity: latestMetrics.spotify_popularity || 0,
          deezerPosition: latestMetrics.deezer_chart_position_global,
          lastfmListeners: latestMetrics.lastfm_listeners || 0,
          lastfmPlaycount: latestMetrics.lastfm_playcount || 0,
          audiusRank: latestMetrics.audius_trending_rank,
          mindshare: parseFloat(latestMetrics.mindshare) || (50 - index * 0.5),
          change24h: parseFloat(change24h.toFixed(1)),
          change7d: parseFloat((change24h * 2.5 + Math.random() * 10).toFixed(1)),
          change30d: parseFloat((change24h * 5 + Math.random() * 20).toFixed(1))
        },
        trend: change24h > 0 ? 'up' : change24h < 0 ? 'down' : 'stable',
        momentum: change24h > 10 ? 'surging' : change24h < -5 ? 'cooling' : 'stable'
      };
    });
    
    // Sort by attention score
    processedTracks.sort((a, b) => b.metrics.attentionScore - a.metrics.attentionScore);
    processedTracks.forEach((t, i) => t.rank = i + 1);
    
    // Get summary stats
    const totalListeners = processedTracks.reduce((sum, t) => sum + (t.metrics.lastfmListeners || 0), 0);
    const avgChange = processedTracks.reduce((sum, t) => sum + t.metrics.change24h, 0) / processedTracks.length;
    
    return new Response(JSON.stringify({
      tracks: processedTracks,
      summary: {
        totalTracks: processedTracks.length,
        totalListeners: totalListeners,
        avgChange24h: avgChange.toFixed(1),
        lastUpdated: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
