import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPOTIFY_CLIENT_ID = Deno.env.get('SPOTIFY_CLIENT_ID');
const SPOTIFY_CLIENT_SECRET = Deno.env.get('SPOTIFY_CLIENT_SECRET');

// Cache for Spotify client credentials token
let spotifyToken: { token: string; expires: number } | null = null;

async function getSpotifyToken(): Promise<string | null> {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    console.log('Spotify credentials not configured');
    return null;
  }

  if (spotifyToken && spotifyToken.expires > Date.now()) {
    return spotifyToken.token;
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`
      },
      body: new URLSearchParams({ grant_type: 'client_credentials' })
    });

    const data = await response.json();
    if (data.access_token) {
      spotifyToken = {
        token: data.access_token,
        expires: Date.now() + (data.expires_in - 60) * 1000
      };
      return data.access_token;
    }
  } catch (e) {
    console.error('Spotify token error:', e);
  }
  return null;
}

interface SearchResult {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  preview: string;
  duration: string;
  source: string;
  album?: string;
  genre?: string;
  spotifyUrl?: string;
  popularity?: number;
}

// Search Spotify API
async function searchSpotify(query: string, limit: number = 15): Promise<SearchResult[]> {
  const token = await getSpotifyToken();
  if (!token) return [];

  try {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}&market=US`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const data = await response.json();

    if (data.error) {
      console.error('Spotify API error:', data.error);
      return [];
    }

    return (data.tracks?.items || []).map((track: any) => ({
      id: `spotify-${track.id}`,
      title: track.name,
      artist: track.artists?.map((a: any) => a.name).join(', ') || 'Unknown',
      artwork: track.album?.images?.[0]?.url || '',
      preview: track.preview_url || '',
      duration: formatDuration(Math.floor(track.duration_ms / 1000)),
      source: 'spotify',
      album: track.album?.name,
      spotifyUrl: track.external_urls?.spotify,
      popularity: track.popularity,
    }));
  } catch (error) {
    console.error('Spotify search error:', error);
    return [];
  }
}

// Search Deezer API
async function searchDeezer(query: string, limit: number = 20): Promise<SearchResult[]> {
  try {
    const response = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    const data = await response.json();
    
    return (data.data || []).map((track: any) => ({
      id: `deezer-${track.id}`,
      title: track.title,
      artist: track.artist?.name || 'Unknown',
      artwork: track.album?.cover_medium || track.album?.cover || '',
      preview: track.preview || '',
      duration: formatDuration(track.duration),
      source: 'deezer',
      album: track.album?.title,
    }));
  } catch (error) {
    console.error('Deezer search error:', error);
    return [];
  }
}

// Search Last.fm API
async function searchLastFm(query: string, limit: number = 15): Promise<SearchResult[]> {
  const apiKey = Deno.env.get('LASTFM_API_KEY');
  if (!apiKey) {
    console.log('Last.fm API key not configured');
    return [];
  }
  
  try {
    const response = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=track.search&track=${encodeURIComponent(query)}&api_key=${apiKey}&format=json&limit=${limit}`
    );
    const data = await response.json();
    
    return (data.results?.trackmatches?.track || []).map((track: any, index: number) => ({
      id: `lastfm-${track.mbid || index}-${Date.now()}`,
      title: track.name,
      artist: track.artist,
      artwork: track.image?.[2]?.['#text'] || '/src/assets/card-1.png',
      preview: '',
      duration: '3:30',
      source: 'lastfm',
    }));
  } catch (error) {
    console.error('Last.fm search error:', error);
    return [];
  }
}

// Search Audius API
async function searchAudius(query: string, limit: number = 15): Promise<SearchResult[]> {
  try {
    const response = await fetch(
      `https://discoveryprovider.audius.co/v1/tracks/search?query=${encodeURIComponent(query)}&limit=${limit}`
    );
    const data = await response.json();
    
    return (data.data || []).map((track: any) => ({
      id: `audius-${track.id}`,
      title: track.title,
      artist: track.user?.name || 'Unknown',
      artwork: track.artwork?.['480x480'] || track.artwork?.['150x150'] || '/src/assets/card-1.png',
      preview: track.stream_url || '',
      duration: formatDuration(track.duration),
      source: 'audius',
      genre: track.genre,
    }));
  } catch (error) {
    console.error('Audius search error:', error);
    return [];
  }
}

// Search Openwhyd (music discovery platform)
async function searchOpenwhyd(query: string, limit: number = 10): Promise<SearchResult[]> {
  try {
    // Openwhyd doesn't have a public search API, so we'll simulate with trending
    const response = await fetch(`https://openwhyd.org/hot?format=json&limit=${limit}`);
    const data = await response.json();
    
    return (data.tracks || [])
      .filter((track: any) => 
        track.name?.toLowerCase().includes(query.toLowerCase()) ||
        track.uNm?.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 5)
      .map((track: any) => ({
        id: `openwhyd-${track._id}`,
        title: track.name || 'Unknown Track',
        artist: track.uNm || 'Unknown Artist',
        artwork: track.img || '/src/assets/card-1.png',
        preview: '',
        duration: '3:30',
        source: 'openwhyd',
      }));
  } catch (error) {
    console.error('Openwhyd search error:', error);
    return [];
  }
}

function formatDuration(seconds: number): string {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let query = url.searchParams.get('q') || '';
    const limit = parseInt(url.searchParams.get('limit') || '30');
    
    // Also check body for query
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (body.query) query = body.query;
      } catch (e) {
        // No body
      }
    }

    if (!query.trim()) {
      return new Response(
        JSON.stringify({ results: [], message: 'Query is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching for: "${query}" with limit ${limit}`);

    // Search all sources in parallel (including Spotify now!)
    const [spotifyResults, deezerResults, lastfmResults, audiusResults, openwhyResults] = await Promise.all([
      searchSpotify(query, Math.ceil(limit * 0.3)),
      searchDeezer(query, Math.ceil(limit * 0.25)),
      searchLastFm(query, Math.ceil(limit * 0.2)),
      searchAudius(query, Math.ceil(limit * 0.15)),
      searchOpenwhyd(query, Math.ceil(limit * 0.1)),
    ]);

    console.log(`API Results - Spotify: ${spotifyResults.length}, Deezer: ${deezerResults.length}, Last.fm: ${lastfmResults.length}, Audius: ${audiusResults.length}, Openwhyd: ${openwhyResults.length}`);

    // Merge and deduplicate results
    const allResults = [...spotifyResults, ...deezerResults, ...audiusResults, ...lastfmResults, ...openwhyResults];
    
    // Sort by source priority and relevance
    const sortedResults = allResults.sort((a, b) => {
      const sourcePriority: Record<string, number> = { spotify: 1, deezer: 2, audius: 3, lastfm: 4, openwhyd: 5 };
      return (sourcePriority[a.source] || 6) - (sourcePriority[b.source] || 6);
    });

    console.log(`Found ${sortedResults.length} results`);

    return new Response(
      JSON.stringify({ 
        results: sortedResults.slice(0, limit),
        total: sortedResults.length,
        sources: {
          spotify: spotifyResults.length,
          deezer: deezerResults.length,
          lastfm: lastfmResults.length,
          audius: audiusResults.length,
          openwhyd: openwhyResults.length,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Search error:', error);
    return new Response(
      JSON.stringify({ error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});