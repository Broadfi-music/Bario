import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get Spotify access token
async function getSpotifyToken(): Promise<string> {
  const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
  const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');
  
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`)
    },
    body: 'grant_type=client_credentials'
  });
  
  const data = await response.json();
  console.log('Spotify token obtained');
  return data.access_token;
}

// Fetch Spotify top tracks from a playlist
async function fetchSpotifyTopTracks(token: string, playlistId: string = '37i9dQZEVXbMDoHDwVN2tF') {
  const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  console.log(`Fetched ${data.items?.length || 0} tracks from Spotify playlist`);
  return data.items || [];
}

// Fetch Deezer chart
async function fetchDeezerChart() {
  const response = await fetch('https://api.deezer.com/chart/0/tracks?limit=50');
  const data = await response.json();
  console.log(`Fetched ${data.data?.length || 0} tracks from Deezer chart`);
  return data.data || [];
}

// Fetch Last.fm top tracks
async function fetchLastfmTopTracks() {
  const apiKey = Deno.env.get('LASTFM_API_KEY');
  const response = await fetch(`https://ws.audioscrobbler.com/2.0/?method=chart.gettoptracks&api_key=${apiKey}&format=json&limit=50`);
  const data = await response.json();
  console.log(`Fetched ${data.tracks?.track?.length || 0} tracks from Last.fm`);
  return data.tracks?.track || [];
}

// Fetch Audius trending tracks
async function fetchAudiusTrending() {
  const apiKey = Deno.env.get('AUDIUS_API_KEY');
  const response = await fetch(`https://discoveryprovider.audius.co/v1/tracks/trending?app_name=bario&limit=50`);
  const data = await response.json();
  console.log(`Fetched ${data.data?.length || 0} tracks from Audius`);
  return data.data || [];
}

// Get Last.fm track info for playcount and listeners
async function getLastfmTrackInfo(artist: string, track: string) {
  const apiKey = Deno.env.get('LASTFM_API_KEY');
  try {
    const response = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${apiKey}&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&format=json`
    );
    const data = await response.json();
    return {
      listeners: parseInt(data.track?.listeners) || 0,
      playcount: parseInt(data.track?.playcount) || 0,
      tags: data.track?.toptags?.tag || []
    };
  } catch (e) {
    return { listeners: 0, playcount: 0, tags: [] };
  }
}

// Calculate attention score
function calculateAttentionScore(metrics: {
  spotifyPopularity?: number;
  deezerPosition?: number;
  lastfmListeners?: number;
  audiusRank?: number;
}) {
  const spotifyScore = (metrics.spotifyPopularity || 0) / 100;
  const deezerScore = metrics.deezerPosition ? (51 - Math.min(metrics.deezerPosition, 50)) / 50 : 0;
  const lastfmScore = metrics.lastfmListeners ? Math.min(Math.log10(metrics.lastfmListeners) / 7, 1) : 0;
  const audiusScore = metrics.audiusRank ? (51 - Math.min(metrics.audiusRank, 50)) / 50 : 0;
  
  return (spotifyScore * 0.35 + deezerScore * 0.3 + lastfmScore * 0.25 + audiusScore * 0.1) * 100000;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('Starting heatmap sync...');
    
    // Get Spotify token
    const spotifyToken = await getSpotifyToken();
    
    // Fetch data from all sources in parallel
    const [spotifyTracks, deezerTracks, lastfmTracks, audiusTracks] = await Promise.all([
      fetchSpotifyTopTracks(spotifyToken),
      fetchDeezerChart(),
      fetchLastfmTopTracks(),
      fetchAudiusTrending()
    ]);
    
    const processedTracks: any[] = [];
    const processedArtists: Map<string, any> = new Map();
    
    // Process Spotify tracks
    for (let i = 0; i < spotifyTracks.length; i++) {
      const item = spotifyTracks[i];
      const track = item.track;
      if (!track) continue;
      
      const artistName = track.artists[0]?.name || 'Unknown';
      const artistId = track.artists[0]?.id;
      
      // Get Last.fm info for this track
      const lastfmInfo = await getLastfmTrackInfo(artistName, track.name);
      
      // Find if this track exists in Deezer chart
      const deezerMatch = deezerTracks.find((d: any) => 
        d.title.toLowerCase() === track.name.toLowerCase() || 
        d.artist?.name?.toLowerCase() === artistName.toLowerCase()
      );
      
      // Find Audius match
      const audiusMatch = audiusTracks.find((a: any) => 
        a.title?.toLowerCase() === track.name.toLowerCase()
      );
      
      const attentionScore = calculateAttentionScore({
        spotifyPopularity: track.popularity,
        deezerPosition: deezerMatch ? deezerTracks.indexOf(deezerMatch) + 1 : undefined,
        lastfmListeners: lastfmInfo.listeners,
        audiusRank: audiusMatch ? audiusTracks.indexOf(audiusMatch) + 1 : undefined
      });
      
      // Upsert artist
      if (!processedArtists.has(artistName)) {
        processedArtists.set(artistName, {
          name: artistName,
          spotify_id: artistId,
          deezer_id: deezerMatch?.artist?.id?.toString(),
          image_url: track.album?.images?.[0]?.url,
        });
      }
      
      processedTracks.push({
        title: track.name,
        artist_name: artistName,
        album_name: track.album?.name,
        cover_image_url: track.album?.images?.[0]?.url,
        preview_url: track.preview_url || deezerMatch?.preview,
        spotify_id: track.id,
        deezer_id: deezerMatch?.id?.toString(),
        audius_id: audiusMatch?.id,
        primary_genre: lastfmInfo.tags[0]?.name || 'Pop',
        duration_ms: track.duration_ms,
        spotify_url: track.external_urls?.spotify,
        deezer_url: deezerMatch ? `https://www.deezer.com/track/${deezerMatch.id}` : null,
        metrics: {
          spotify_popularity: track.popularity,
          deezer_chart_position_global: deezerMatch ? deezerTracks.indexOf(deezerMatch) + 1 : null,
          lastfm_listeners: lastfmInfo.listeners,
          lastfm_playcount: lastfmInfo.playcount,
          audius_trending_rank: audiusMatch ? audiusTracks.indexOf(audiusMatch) + 1 : null,
          attention_score: attentionScore,
          mindshare: (attentionScore / 1000).toFixed(2)
        }
      });
    }
    
    // Process Deezer tracks that weren't in Spotify
    for (const dTrack of deezerTracks) {
      const exists = processedTracks.find(t => 
        t.title.toLowerCase() === dTrack.title.toLowerCase()
      );
      if (exists) continue;
      
      const artistName = dTrack.artist?.name || 'Unknown';
      const lastfmInfo = await getLastfmTrackInfo(artistName, dTrack.title);
      
      const attentionScore = calculateAttentionScore({
        deezerPosition: deezerTracks.indexOf(dTrack) + 1,
        lastfmListeners: lastfmInfo.listeners
      });
      
      processedTracks.push({
        title: dTrack.title,
        artist_name: artistName,
        album_name: dTrack.album?.title,
        cover_image_url: dTrack.album?.cover_big || dTrack.album?.cover_medium,
        preview_url: dTrack.preview,
        deezer_id: dTrack.id?.toString(),
        primary_genre: 'Pop',
        duration_ms: dTrack.duration * 1000,
        deezer_url: dTrack.link,
        metrics: {
          deezer_chart_position_global: deezerTracks.indexOf(dTrack) + 1,
          lastfm_listeners: lastfmInfo.listeners,
          lastfm_playcount: lastfmInfo.playcount,
          attention_score: attentionScore,
          mindshare: (attentionScore / 1000).toFixed(2)
        }
      });
    }
    
    // Process Audius tracks
    for (const aTrack of audiusTracks) {
      const exists = processedTracks.find(t => 
        t.title.toLowerCase() === aTrack.title?.toLowerCase()
      );
      if (exists) continue;
      
      const artistName = aTrack.user?.name || 'Unknown';
      
      const attentionScore = calculateAttentionScore({
        audiusRank: audiusTracks.indexOf(aTrack) + 1
      });
      
      processedTracks.push({
        title: aTrack.title,
        artist_name: artistName,
        album_name: aTrack.release_date ? `Single (${aTrack.release_date})` : 'Single',
        cover_image_url: aTrack.artwork?.['480x480'] || aTrack.artwork?.['150x150'],
        preview_url: null, // Audius requires special handling for playback
        audius_id: aTrack.id,
        primary_genre: aTrack.genre || 'Electronic',
        duration_ms: aTrack.duration * 1000,
        audius_url: `https://audius.co/tracks/${aTrack.id}`,
        metrics: {
          audius_trending_rank: audiusTracks.indexOf(aTrack) + 1,
          attention_score: attentionScore,
          mindshare: (attentionScore / 1000).toFixed(2)
        }
      });
    }
    
    // Insert/update artists
    for (const artist of processedArtists.values()) {
      const { error } = await supabase
        .from('heatmap_artists')
        .upsert(artist, { onConflict: 'spotify_id' });
      if (error) console.log('Artist upsert error:', error.message);
    }
    
    // Insert/update tracks and metrics
    for (const track of processedTracks) {
      const metrics = track.metrics;
      delete track.metrics;
      
      // Upsert track
      const { data: trackData, error: trackError } = await supabase
        .from('heatmap_tracks')
        .upsert(track, { 
          onConflict: 'spotify_id',
          ignoreDuplicates: false 
        })
        .select('id')
        .single();
      
      if (trackError) {
        // Try insert if upsert failed
        const { data: insertData, error: insertError } = await supabase
          .from('heatmap_tracks')
          .insert(track)
          .select('id')
          .single();
        
        if (insertError) {
          console.log('Track insert error:', insertError.message);
          continue;
        }
        
        if (insertData) {
          // Insert metrics
          await supabase.from('heatmap_track_metrics').insert({
            track_id: insertData.id,
            ...metrics
          });
        }
      } else if (trackData) {
        // Insert metrics snapshot
        await supabase.from('heatmap_track_metrics').insert({
          track_id: trackData.id,
          ...metrics
        });
      }
    }
    
    // Generate smart feed events for top gainers
    const sortedTracks = processedTracks.sort((a, b) => 
      (b.metrics?.attention_score || 0) - (a.metrics?.attention_score || 0)
    );
    
    for (let i = 0; i < Math.min(10, sortedTracks.length); i++) {
      const track = sortedTracks[i];
      const { data: trackRecord } = await supabase
        .from('heatmap_tracks')
        .select('id')
        .eq('title', track.title)
        .single();
      
      if (trackRecord) {
        await supabase.from('heatmap_smart_feed_events').insert({
          track_id: trackRecord.id,
          event_type: i < 3 ? 'top_chart' : 'trending',
          title: `${track.title} trending at #${i + 1}`,
          description: `${track.artist_name}'s "${track.title}" is currently at position ${i + 1} on the global attention chart.`,
          source: 'multi-platform'
        });
      }
    }
    
    console.log(`Sync complete. Processed ${processedTracks.length} tracks`);
    
    return new Response(JSON.stringify({ 
      success: true, 
      tracksProcessed: processedTracks.length,
      sources: {
        spotify: spotifyTracks.length,
        deezer: deezerTracks.length,
        lastfm: lastfmTracks.length,
        audius: audiusTracks.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error: unknown) {
    console.error('Sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
