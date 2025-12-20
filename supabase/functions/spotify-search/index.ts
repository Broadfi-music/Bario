import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPOTIFY_CLIENT_ID = Deno.env.get('SPOTIFY_CLIENT_ID');
const SPOTIFY_CLIENT_SECRET = Deno.env.get('SPOTIFY_CLIENT_SECRET');

// Cache for client credentials token
let cachedToken: { token: string; expires: number } | null = null;

async function getClientToken(): Promise<string> {
  // Check if we have a valid cached token
  if (cachedToken && cachedToken.expires > Date.now()) {
    return cachedToken.token;
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials'
    })
  });

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error_description || data.error);
  }

  // Cache the token (subtract 60 seconds for safety margin)
  cachedToken = {
    token: data.access_token,
    expires: Date.now() + (data.expires_in - 60) * 1000
  };

  return data.access_token;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: { id: string; name: string; images: { url: string }[] };
  duration_ms: number;
  popularity: number;
  preview_url: string | null;
  external_urls: { spotify: string };
}

function formatTrack(track: SpotifyTrack) {
  return {
    id: `spotify-${track.id}`,
    spotifyId: track.id,
    title: track.name,
    artist: track.artists.map(a => a.name).join(', '),
    artistId: track.artists[0]?.id,
    album: track.album.name,
    artwork: track.album.images[0]?.url || '',
    duration: track.duration_ms,
    popularity: track.popularity,
    previewUrl: track.preview_url,
    spotifyUrl: track.external_urls.spotify,
    source: 'spotify'
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('q') || '';
    const type = url.searchParams.get('type') || 'track';
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const market = url.searchParams.get('market') || 'US';

    // Get access token
    const accessToken = await getClientToken();

    if (!query.trim()) {
      // If no query, get featured playlists or new releases
      const response = await fetch(
        `https://api.spotify.com/v1/browse/new-releases?limit=${limit}&country=${market}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      // Get tracks from albums
      const albumIds = data.albums?.items?.map((a: any) => a.id).slice(0, 10) || [];
      
      if (albumIds.length === 0) {
        return new Response(JSON.stringify({ results: [], total: 0 }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get tracks from first album
      const albumResponse = await fetch(
        `https://api.spotify.com/v1/albums/${albumIds[0]}/tracks?limit=${limit}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      const albumData = await albumResponse.json();
      const tracks = albumData.items || [];

      return new Response(JSON.stringify({
        results: tracks.map((t: any) => ({
          ...formatTrack({ ...t, album: data.albums.items[0], popularity: 70 }),
        })),
        total: tracks.length,
        source: 'spotify'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Search for tracks
    const searchUrl = new URL('https://api.spotify.com/v1/search');
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('type', type);
    searchUrl.searchParams.set('limit', String(limit));
    searchUrl.searchParams.set('market', market);

    console.log(`Spotify search: "${query}" type=${type} limit=${limit}`);

    const response = await fetch(searchUrl.toString(), {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    const data = await response.json();

    if (data.error) {
      console.error('Spotify API error:', data.error);
      throw new Error(data.error.message);
    }

    const tracks = data.tracks?.items || [];
    const artists = data.artists?.items || [];

    console.log(`Spotify found ${tracks.length} tracks`);

    return new Response(JSON.stringify({
      results: tracks.map(formatTrack),
      artists: artists.map((a: any) => ({
        id: a.id,
        name: a.name,
        image: a.images?.[0]?.url,
        followers: a.followers?.total,
        genres: a.genres,
        popularity: a.popularity,
        spotifyUrl: a.external_urls?.spotify
      })),
      total: data.tracks?.total || 0,
      source: 'spotify'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Spotify search error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      results: [],
      total: 0 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
