import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const SPOTIFY_CLIENT_ID = Deno.env.get('SPOTIFY_CLIENT_ID');
const SPOTIFY_CLIENT_SECRET = Deno.env.get('SPOTIFY_CLIENT_SECRET');
const LASTFM_API_KEY = Deno.env.get('LASTFM_API_KEY');

// Deterministic hash function for stable metrics
function stableRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 1000) / 1000;
}

// Get today's date string for daily-stable seeds
function todaySeed(): string {
  return new Date().toISOString().split('T')[0]; // e.g. "2026-02-11"
}

// Get Spotify access token using Client Credentials flow
async function getSpotifyToken(): Promise<string | null> {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    console.log('Spotify credentials not configured');
    return null;
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      console.error('Spotify token error:', response.status);
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (e) {
    console.error('Spotify token fetch error:', e);
    return null;
  }
}

// Spotify country playlist IDs
const spotifyCountryPlaylists: Record<string, string> = {
  'US': '37i9dQZEVXbLRQDuF5jeBp',
  'UK': '37i9dQZEVXbLnolsZ8PSNw',
  'NG': '37i9dQZEVXbKY7jLzlJ11V',
  'GH': '37i9dQZEVXbKwYxaLxBIbS',
  'ZA': '37i9dQZEVXbMH2jvi6jvjk',
  'KE': '37i9dQZEVXbKMzVsSGQ49S',
  'BR': '37i9dQZEVXbMXbN3EUUhlg',
  'MX': '37i9dQZEVXbO3qyFxbkOE1',
  'FR': '37i9dQZEVXbIPWwFssbupI',
  'DE': '37i9dQZEVXbJiZcmkrIHGU',
  'JP': '37i9dQZEVXbKXQ4mDTEBXq',
  'KR': '37i9dQZEVXbNxXF4SkHj9F',
  'IN': '37i9dQZEVXbLZ52XmnySJg',
  'AU': '37i9dQZEVXbJPcfkRz0wJ0',
  'CA': '37i9dQZEVXbKj23U1GF4IR',
  'ES': '37i9dQZEVXbNFJfN1Vw8d9',
  'IT': '37i9dQZEVXbIQnj7RRhdSX',
  'GLOBAL': '37i9dQZEVXbMDoHDwVN2tF'
};

// Get Spotify Top 50 playlist for a specific country
async function getSpotifyCountryTop50(countryCode: string, limit: number = 50): Promise<any[]> {
  const token = await getSpotifyToken();
  if (!token) return [];

  const playlistId = spotifyCountryPlaylists[countryCode] || spotifyCountryPlaylists['GLOBAL'];
  
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=${limit}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (!response.ok) {
      console.error(`Spotify country playlist error for ${countryCode}:`, response.status);
      return [];
    }

    const data = await response.json();
    return (data.items || []).map((item: any) => item.track).filter(Boolean);
  } catch (e) {
    console.error(`Spotify country playlist error for ${countryCode}:`, e);
    return [];
  }
}

// Search Spotify tracks
async function searchSpotify(query: string, limit: number = 20): Promise<any[]> {
  const token = await getSpotifyToken();
  if (!token) return [];

  try {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (!response.ok) return [];
    const data = await response.json();
    return data.tracks?.items || [];
  } catch (e) {
    console.error('Spotify search error:', e);
    return [];
  }
}

// Deezer country chart playlist IDs (real Deezer playlists that update automatically)
const deezerCountryPlaylists: Record<string, number> = {
  'GLOBAL': 3155776842,
  'US': 1313621735,
  'UK': 1111142221,
  'NG': 1362516565,
  'ZA': 1362528775,
  'KE': 1362509215,
  'BR': 1111141961,
  'MX': 1111142361,
  'FR': 1109890291,
  'DE': 1111143121,
  'JP': 1362508955,
  'KR': 1362510315,
  'AU': 1313616925,
  'CA': 1652248171,
  'ES': 1116190041,
  'IT': 1116187241,
};

// Country-specific artist searches kept as fallback only
const countryArtistSearches: Record<string, string[]> = {
  'NG': ['Wizkid', 'Burna Boy', 'Davido', 'Rema', 'Asake', 'Ayra Starr', 'Tems', 'Omah Lay', 'Ckay', 'Fireboy DML', 'Joeboy', 'Kizz Daniel', 'Olamide', 'Shallipopi', 'Young Jonn', 'Seyi Vibez', 'Spyro', 'Pheelz', 'BNXN'],
  'US': ['Drake', 'Kendrick Lamar', 'Taylor Swift', 'The Weeknd', 'Bad Bunny', 'SZA', 'Post Malone', 'Travis Scott', 'Morgan Wallen', 'Billie Eilish', 'Doja Cat', 'Lil Baby', 'Future', 'Metro Boomin'],
  'UK': ['Central Cee', 'Ed Sheeran', 'Dua Lipa', 'Dave', 'Stormzy', 'Little Simz', 'Tion Wayne', 'Headie One', 'Skepta', 'AJ Tracey', 'M Huncho', 'Jorja Smith'],
  'GH': ['Sarkodie', 'Shatta Wale', 'Stonebwoy', 'Black Sherif', 'King Promise', 'Gyakie', 'Camidoh', 'Kuami Eugene', 'KiDi'],
  'ZA': ['Tyla', 'Kabza De Small', 'DJ Maphorisa', 'Nasty C', 'Cassper Nyovest', 'A-Reece', 'Master KG', 'Focalistic'],
  'KE': ['Sauti Sol', 'Nyashinski', 'Khaligraph Jones', 'Otile Brown', 'Nviiri The Storyteller', 'Bensoul'],
  'BR': ['Anitta', 'Ludmilla', 'MC Livinho', 'Luisa Sonza', 'Pedro Sampaio', 'Zé Neto & Cristiano', 'Marília Mendonça'],
  'MX': ['Peso Pluma', 'Natanael Cano', 'Junior H', 'Luis R Conriquez', 'Fuerza Regida', 'Grupo Frontera'],
  'FR': ['Aya Nakamura', 'Jul', 'Ninho', 'Damso', 'Gazo', 'Tiakola', 'PLK', 'Laylow'],
  'DE': ['Apache 207', 'Luciano', 'RAF Camora', 'Capital Bra', 'Bonez MC', 'Sido'],
  'JP': ['YOASOBI', 'Ado', 'King Gnu', 'Official HIGE DANdism', 'Fujii Kaze', 'Mrs. GREEN APPLE', 'Kenshi Yonezu'],
  'KR': ['BTS', 'BLACKPINK', 'Stray Kids', 'NewJeans', 'aespa', 'IVE', 'LE SSERAFIM', 'SEVENTEEN', 'NCT', 'TWICE'],
  'IN': ['Arijit Singh', 'Diljit Dosanjh', 'AP Dhillon', 'Badshah', 'Divine', 'Raftaar', 'Sidhu Moosewala', 'Karan Aujla'],
  'AU': ['The Kid LAROI', 'Tame Impala', 'Troye Sivan', 'Vance Joy', '5 Seconds of Summer'],
  'CA': ['The Weeknd', 'Justin Bieber', 'Shawn Mendes', 'NAV', 'PartyNextDoor', 'Tory Lanez'],
  'ES': ['Rosalía', 'Quevedo', 'Rauw Alejandro', 'Rels B', 'Mora', 'Omar Montes'],
  'IT': ['Mahmood', 'Sfera Ebbasta', 'Geolier', 'Tedua', 'Guè', 'Blanco']
};

// Fetch tracks from a real Deezer country chart playlist
async function getDeezerCountryPlaylist(countryCode: string, limit: number = 50): Promise<any[]> {
  const playlistId = deezerCountryPlaylists[countryCode] || deezerCountryPlaylists['GLOBAL'];
  
  try {
    const response = await fetch(`https://api.deezer.com/playlist/${playlistId}/tracks?limit=${limit}`);
    if (!response.ok) {
      console.error(`Deezer playlist ${playlistId} error: ${response.status}`);
      return [];
    }
    const data = await response.json();
    const tracks = data.data || [];
    console.log(`Deezer playlist ${playlistId} (${countryCode}): Got ${tracks.length} tracks`);
    return tracks;
  } catch (e) {
    console.error(`Deezer playlist fetch error for ${countryCode}:`, e);
    return [];
  }
}

// Deezer API - Get country charts using real playlists, artist search as fallback
async function getDeezerCountryChart(countryCode: string, limit: number = 50): Promise<any[]> {
  // Primary: fetch from real Deezer country chart playlist
  const playlistTracks = await getDeezerCountryPlaylist(countryCode, limit);
  if (playlistTracks.length > 0) {
    return playlistTracks;
  }

  // Fallback: search by hardcoded artist names
  const artists = countryArtistSearches[countryCode];
  if (artists && artists.length > 0) {
    try {
      const searches = artists.map(artist => 
        fetch(`https://api.deezer.com/search?q=${encodeURIComponent(artist)}&limit=5`)
          .then(r => r.json())
          .then(d => d.data || [])
          .catch(() => [])
      );
      const results = await Promise.all(searches);
      const allTracks = results.flat();
      console.log(`Deezer country ${countryCode} fallback: Found ${allTracks.length} tracks from ${artists.length} artists`);
      if (allTracks.length > 0) {
        return allTracks.sort((a, b) => (b.rank || 0) - (a.rank || 0)).slice(0, limit);
      }
    } catch (e) {
      console.error(`Deezer country search error for ${countryCode}:`, e);
    }
  }
  
  // Final fallback: global chart
  return await getDeezerGlobalChart(limit);
}

// Single consistent strategy: chart endpoint only, sorted by position, no shuffle
async function getDeezerGlobalChart(limit: number = 50): Promise<any[]> {
  try {
    const response = await fetch(`https://api.deezer.com/chart/0/tracks?limit=100`);
    const data = await response.json();
    const allTracks = data.data || [];
    
    console.log(`Deezer global chart: Got ${allTracks.length} tracks`);
    
    // Return in original chart order (already sorted by position), no shuffle
    return allTracks.slice(0, limit);
  } catch (e) {
    console.error('Deezer chart error:', e);
    return [];
  }
}

// No shuffle on search results
async function searchDeezer(query: string, limit: number = 50): Promise<any[]> {
  try {
    const response = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    const data = await response.json();
    return data.data || [];
  } catch (e) {
    console.error('Deezer search error:', e);
    return [];
  }
}

// Fixed time range ('week'), no shuffle, keep original trending order
async function getAudiusTrending(limit: number = 20): Promise<any[]> {
  try {
    const response = await fetch(
      `https://discoveryprovider.audius.co/v1/tracks/trending?limit=${limit}&time=week`,
      { headers: { 'Accept': 'application/json' } }
    );
    const data = await response.json();
    return (data.data || []).slice(0, limit);
  } catch (e) {
    console.error('Audius trending error:', e);
    return [];
  }
}

async function searchAudius(query: string, limit: number = 20): Promise<any[]> {
  try {
    const response = await fetch(
      `https://discoveryprovider.audius.co/v1/tracks/search?query=${encodeURIComponent(query)}&limit=${limit}`,
      { headers: { 'Accept': 'application/json' } }
    );
    const data = await response.json();
    return data.data || [];
  } catch (e) {
    console.error('Audius search error:', e);
    return [];
  }
}

// Get user uploads from database
async function getUserUploads(supabase: any, search: string = '', genre: string = '', limit: number = 20): Promise<any[]> {
  try {
    let query = supabase
      .from('user_uploads')
      .select(`
        id, title, description, audio_url, cover_image_url, genre, duration_ms,
        play_count, like_count, user_id, created_at, spotify_url, apple_url,
        soundcloud_url, youtube_url
      `)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }
    if (genre && genre !== 'All') {
      query = query.ilike('genre', `%${genre}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching user uploads:', error);
      return [];
    }
    console.log(`Fetched ${data?.length || 0} user uploads from database`);
    return data || [];
  } catch (e) {
    console.error('User uploads fetch error:', e);
    return [];
  }
}

// Format user upload with deterministic metrics
function formatUserUpload(upload: any, index: number) {
  const playCount = upload.play_count || 0;
  const likeCount = upload.like_count || 0;
  const seed = `user_${upload.id}${todaySeed()}`;
  const change24h = stableRandom(seed + 'c24') * 20 - 2;
  const attentionScore = Math.round(playCount * 10 + likeCount * 50 + 5000);
  const artistName = 'Bario Artist';

  return {
    id: `user_${upload.id}`,
    rank: index + 1,
    title: upload.title,
    artist: artistName,
    artistId: upload.user_id,
    album: 'Single',
    artwork: upload.cover_image_url || '/placeholder.svg',
    previewUrl: upload.audio_url,
    genre: upload.genre || 'Other',
    duration: upload.duration_ms || 200000,
    country: 'GLOBAL',
    deezerRank: 0,
    spotifyUrl: upload.spotify_url,
    deezerUrl: null,
    appleUrl: upload.apple_url,
    audiusUrl: upload.soundcloud_url || upload.youtube_url,
    deezerId: null,
    spotifyId: null,
    audiusId: null,
    source: 'bario',
    isCommunity: true,
    metrics: {
      attentionScore,
      spotifyPopularity: 0,
      deezerPosition: null,
      deezerRank: 0,
      lastfmListeners: playCount * 10,
      lastfmPlaycount: playCount,
      monthlyListeners: playCount * 10 + likeCount * 5,
      audiusRank: null,
      audiusPlays: playCount,
      mindshare: parseFloat((Math.min(100, playCount / 10 + likeCount / 2) / 3).toFixed(1)),
      change24h: parseFloat(change24h.toFixed(1)),
      change7d: parseFloat((change24h * 2 + stableRandom(seed + 'c7') * 10).toFixed(1)),
      change30d: parseFloat((change24h * 3 + stableRandom(seed + 'c30') * 15).toFixed(1))
    },
    trend: change24h > 0 ? 'up' : 'down',
    momentum: change24h > 10 ? 'surging' : 'stable'
  };
}

const countries = [
  { code: 'GLOBAL', name: 'Global' }, { code: 'US', name: 'United States' },
  { code: 'UK', name: 'United Kingdom' }, { code: 'NG', name: 'Nigeria' },
  { code: 'GH', name: 'Ghana' }, { code: 'ZA', name: 'South Africa' },
  { code: 'KE', name: 'Kenya' }, { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' }, { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' }, { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' }, { code: 'IN', name: 'India' },
  { code: 'AU', name: 'Australia' }, { code: 'CA', name: 'Canada' },
  { code: 'ES', name: 'Spain' }, { code: 'IT', name: 'Italy' }
];

const genres = ['All', 'Pop', 'Hip-Hop', 'R&B', 'Rock', 'Electronic', 'Reggaeton', 'Latin', 'Afrobeats', 'K-Pop'];

function formatSpotifyTrack(track: any, index: number, countryCode: string) {
  const popularity = track.popularity || 50;
  const monthlyListeners = popularity * 50000 + (index < 10 ? 500000 : 100000);
  const seed = `spotify_${track.id}${todaySeed()}`;
  const change24h = stableRandom(seed + 'c24') * 25 - 5;
  const attentionScore = Math.round(popularity * 1000 + monthlyListeners / 500);
  
  return {
    id: `spotify_${track.id}`,
    rank: index + 1,
    title: track.name,
    artist: track.artists?.[0]?.name || 'Unknown Artist',
    artistId: track.artists?.[0]?.id,
    album: track.album?.name || 'Single',
    artwork: track.album?.images?.[0]?.url || track.album?.images?.[1]?.url || '/placeholder.svg',
    previewUrl: track.preview_url,
    genre: 'Pop',
    duration: track.duration_ms || 200000,
    country: countryCode,
    spotifyUrl: track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`,
    deezerUrl: null,
    appleUrl: `https://music.apple.com/search?term=${encodeURIComponent(track.name + ' ' + (track.artists?.[0]?.name || ''))}`,
    audiusUrl: null,
    deezerId: null,
    spotifyId: track.id,
    audiusId: null,
    source: 'spotify',
    metrics: {
      attentionScore,
      spotifyPopularity: popularity,
      deezerPosition: null,
      deezerRank: 0,
      lastfmListeners: monthlyListeners,
      lastfmPlaycount: monthlyListeners * 8,
      monthlyListeners,
      audiusRank: null,
      audiusPlays: null,
      mindshare: parseFloat((popularity / 2.5 + stableRandom(seed + 'ms') * 5).toFixed(1)),
      change24h: parseFloat(change24h.toFixed(1)),
      change7d: parseFloat((change24h * 2.5 + stableRandom(seed + 'c7') * 8).toFixed(1)),
      change30d: parseFloat((change24h * 4 + stableRandom(seed + 'c30') * 15).toFixed(1))
    },
    trend: change24h > 0 ? 'up' : change24h < 0 ? 'down' : 'stable',
    momentum: change24h > 10 ? 'surging' : change24h < -5 ? 'cooling' : 'stable'
  };
}

function formatDeezerTrack(track: any, index: number, countryCode: string) {
  const deezerRank = track.rank || 0;
  const baseListeners = Math.floor(deezerRank / 10);
  const monthlyListeners = Math.max(100000, baseListeners + (index < 10 ? 500000 : index < 30 ? 200000 : 50000));
  const seed = `deezer_${track.id}${todaySeed()}`;
  const change24h = stableRandom(seed + 'c24') * 25 - 5;
  const popularity = Math.min(100, Math.floor(deezerRank / 8000) + 50);
  const attentionScore = Math.round(popularity * 800 + monthlyListeners / 500);
  
  return {
    id: String(track.id),
    rank: index + 1,
    title: track.title || track.title_short,
    artist: track.artist?.name || 'Unknown Artist',
    artistId: track.artist?.id,
    album: track.album?.title || 'Single',
    artwork: track.album?.cover_big || track.album?.cover_medium || track.album?.cover || 
             `https://e-cdns-images.dzcdn.net/images/cover/${track.md5_image}/500x500-000000-80-0-0.jpg`,
    previewUrl: track.preview,
    genre: track.genre || 'Pop',
    duration: (track.duration || 200) * 1000,
    country: countryCode,
    deezerRank,
    spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(track.title + ' ' + (track.artist?.name || ''))}`,
    deezerUrl: track.link || `https://www.deezer.com/track/${track.id}`,
    appleUrl: `https://music.apple.com/search?term=${encodeURIComponent(track.title + ' ' + (track.artist?.name || ''))}`,
    audiusUrl: null,
    deezerId: String(track.id),
    spotifyId: null,
    audiusId: null,
    source: 'deezer',
    metrics: {
      attentionScore,
      spotifyPopularity: popularity,
      deezerPosition: track.position || index + 1,
      deezerRank,
      lastfmListeners: monthlyListeners,
      lastfmPlaycount: monthlyListeners * 8,
      monthlyListeners,
      audiusRank: null,
      audiusPlays: null,
      mindshare: parseFloat((popularity / 2.5 + stableRandom(seed + 'ms') * 5).toFixed(1)),
      change24h: parseFloat(change24h.toFixed(1)),
      change7d: parseFloat((change24h * 2.5 + stableRandom(seed + 'c7') * 8).toFixed(1)),
      change30d: parseFloat((change24h * 4 + stableRandom(seed + 'c30') * 15).toFixed(1))
    },
    trend: change24h > 0 ? 'up' : change24h < 0 ? 'down' : 'stable',
    momentum: change24h > 10 ? 'surging' : change24h < -5 ? 'cooling' : 'stable'
  };
}

// Format Audius track with Deezer preview lookup - deterministic metrics
async function formatAudiusTrackWithPreview(track: any, index: number): Promise<any> {
  const plays = track.play_count || 0;
  const reposts = track.repost_count || 0;
  const favorites = track.favorite_count || 0;
  const listeners = plays + (reposts * 10) + (favorites * 5);
  const seed = `audius_${track.id}${todaySeed()}`;
  const change24h = stableRandom(seed + 'c24') * 30 - 5;
  const attentionScore = Math.round((plays / 100) + (reposts * 50) + (favorites * 30));
  
  const trackTitle = track.title || '';
  const artistName = track.user?.name || '';
  let previewUrl = null;
  let deezerUrl = null;
  
  if (trackTitle && artistName) {
    try {
      const deezerResults = await searchDeezer(`${trackTitle} ${artistName}`, 3);
      for (const result of deezerResults) {
        if (result.preview) {
          previewUrl = result.preview;
          deezerUrl = result.link || `https://www.deezer.com/track/${result.id}`;
          console.log(`Found Deezer preview for Audius track: ${trackTitle}`);
          break;
        }
      }
    } catch (e) {
      console.error('Error fetching Deezer preview for Audius track:', e);
    }
  }
  
  if (!previewUrl) {
    previewUrl = `https://discoveryprovider.audius.co/v1/tracks/${track.id}/stream`;
  }
  
  return {
    id: `audius_${track.id}`,
    rank: index + 1,
    title: track.title,
    artist: artistName || 'Unknown Artist',
    artistId: track.user?.id,
    album: track.album?.playlist_name || 'Single',
    artwork: track.artwork?.['480x480'] || track.artwork?.['1000x1000'] || '/placeholder.svg',
    previewUrl,
    genre: track.genre || 'Electronic',
    duration: (track.duration || 200) * 1000,
    country: 'GLOBAL',
    deezerRank: 0,
    spotifyUrl: null,
    deezerUrl,
    appleUrl: null,
    audiusUrl: `https://audius.co/${track.user?.handle}/${track.permalink}`,
    deezerId: null,
    spotifyId: null,
    audiusId: track.id,
    source: 'audius',
    metrics: {
      attentionScore,
      spotifyPopularity: 0,
      deezerPosition: null,
      deezerRank: 0,
      lastfmListeners: listeners,
      lastfmPlaycount: plays,
      monthlyListeners: listeners,
      audiusRank: index + 1,
      audiusPlays: plays,
      mindshare: parseFloat((Math.min(100, plays / 1000) / 3).toFixed(1)),
      change24h: parseFloat(change24h.toFixed(1)),
      change7d: parseFloat((change24h * 2 + stableRandom(seed + 'c7') * 10).toFixed(1)),
      change30d: parseFloat((change24h * 3.5 + stableRandom(seed + 'c30') * 15).toFixed(1))
    },
    trend: change24h > 0 ? 'up' : 'down',
    momentum: change24h > 15 ? 'surging' : change24h < -5 ? 'cooling' : 'stable'
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '99'), 100);
    const search = url.searchParams.get('search') || '';
    const genre = url.searchParams.get('genre') || 'All';
    const country = url.searchParams.get('country') || 'GLOBAL';
    
    console.log(`Fetching tracks: limit=${limit}, search=${search}, genre=${genre}, country=${country}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    let tracks: any[] = [];
    
    // Always fetch user uploads first
    const userUploads = await getUserUploads(supabase, search, genre, 20);
    const formattedUserUploads = userUploads.map((u: any, i: number) => formatUserUpload(u, i));
    
    if (search) {
      const [deezerResults, spotifyResults, audiusResults] = await Promise.all([
        searchDeezer(search, 40),
        searchSpotify(search, 10),
        searchAudius(search, 10)
      ]);
      
      const deezerTracks = deezerResults.map((t: any, i: number) => formatDeezerTrack(t, i, country));
      
      const spotifyTracksWithPreview = await Promise.all(
        spotifyResults.map(async (t: any, i: number) => {
          const formatted = formatSpotifyTrack(t, i + deezerTracks.length, country);
          if (!formatted.previewUrl && t.name && t.artists?.[0]?.name) {
            const deezerSearch = await searchDeezer(`${t.name} ${t.artists[0].name}`, 1);
            if (deezerSearch.length > 0 && deezerSearch[0].preview) {
              formatted.previewUrl = deezerSearch[0].preview;
              formatted.deezerUrl = deezerSearch[0].link || `https://www.deezer.com/track/${deezerSearch[0].id}`;
              (formatted as any).deezerId = String(deezerSearch[0].id);
            }
          }
          return formatted;
        })
      );
      
      const audiusTracks = await Promise.all(audiusResults.map((t: any, i: number) => formatAudiusTrackWithPreview(t, i + deezerTracks.length + spotifyTracksWithPreview.length)));
      
      const allTracks = [...formattedUserUploads, ...deezerTracks, ...spotifyTracksWithPreview, ...audiusTracks];
      tracks = allTracks.filter(t => t.previewUrl);
      console.log(`Search results: User=${formattedUserUploads.length}, Deezer=${deezerTracks.length}, Spotify=${spotifyTracksWithPreview.length}, Audius=${audiusTracks.length}, WithPreview=${tracks.length}`);
      
    } else if (country && country !== 'GLOBAL') {
      console.log(`Fetching country-specific charts for: ${country}`);
      
      const [spotifyTracks, deezerTracks] = await Promise.all([
        getSpotifyCountryTop50(country, 50),
        getDeezerCountryChart(country, 60)
      ]);
      
      const formattedSpotify = await Promise.all(
        spotifyTracks.map(async (t: any, i: number) => {
          const formatted = formatSpotifyTrack(t, i, country);
          if (!formatted.previewUrl && t.name && t.artists?.[0]?.name) {
            const deezerSearch = await searchDeezer(`${t.name} ${t.artists[0].name}`, 1);
            if (deezerSearch.length > 0 && deezerSearch[0].preview) {
              formatted.previewUrl = deezerSearch[0].preview;
            }
          }
          return formatted;
        })
      );
      
      const formattedDeezer = deezerTracks.map((t: any, i: number) => formatDeezerTrack(t, i + formattedSpotify.length, country));
      
      const allTracks = [...formattedUserUploads, ...formattedSpotify, ...formattedDeezer];
      tracks = allTracks.filter(t => t.previewUrl);
      
      console.log(`Country ${country} results: User=${formattedUserUploads.length}, Spotify=${formattedSpotify.length}, Deezer=${formattedDeezer.length}, WithPreview=${tracks.length}`);
      
    } else if (genre && genre !== 'All') {
      const [spotifyResults, deezerResults] = await Promise.all([
        searchSpotify(`${genre} hits 2024`, 20),
        searchDeezer(`${genre} hits 2024`, 40)
      ]);
      
      const spotifyTracks = spotifyResults.map((t: any, i: number) => ({ ...formatSpotifyTrack(t, i, 'GLOBAL'), genre }));
      const deezerTracks = deezerResults.map((t: any, i: number) => ({ ...formatDeezerTrack(t, i + spotifyTracks.length, 'GLOBAL'), genre }));
      
      tracks = [...formattedUserUploads, ...spotifyTracks, ...deezerTracks];
      
    } else {
      // Global trending - fixed sources, no random genre, no shuffle
      const [spotifyGlobal, deezerGlobal, audiusTrending] = await Promise.all([
        getSpotifyCountryTop50('GLOBAL', 50),
        getDeezerGlobalChart(60),
        getAudiusTrending(20)
      ]);
      
      const spotifyTracks = spotifyGlobal.map((t: any, i: number) => formatSpotifyTrack(t, i, 'GLOBAL'));
      const deezerTracks = deezerGlobal.map((t: any, i: number) => formatDeezerTrack(t, i + spotifyTracks.length, 'GLOBAL'));
      const audiusTracks = await Promise.all(audiusTrending.map((t: any, i: number) => formatAudiusTrackWithPreview(t, i + spotifyTracks.length + deezerTracks.length)));
      
      // Combine all sources, filter for previews, NO shuffle
      const allTracks = [...formattedUserUploads, ...spotifyTracks, ...deezerTracks, ...audiusTracks];
      tracks = allTracks.filter(t => t.previewUrl);
      
      console.log(`Global results: User=${formattedUserUploads.length}, Spotify=${spotifyTracks.length}, Deezer=${deezerTracks.length}, Audius=${audiusTracks.length}`);
    }
    
    // Remove duplicates by title+artist
    const seen = new Set();
    tracks = tracks.filter(t => {
      const key = `${t.title.toLowerCase()}_${t.artist.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    // Sort by attention score and assign ranks - deterministic order
    tracks.sort((a, b) => b.metrics.attentionScore - a.metrics.attentionScore);
    tracks.forEach((t, i) => t.rank = i + 1);
    
    const totalListeners = tracks.reduce((sum, t) => sum + t.metrics.monthlyListeners, 0);
    const avgChange = tracks.length > 0 
      ? tracks.reduce((sum, t) => sum + t.metrics.change24h, 0) / tracks.length
      : 0;
    
    const sourceCounts = tracks.reduce((acc: any, t) => {
      acc[t.source] = (acc[t.source] || 0) + 1;
      return acc;
    }, {});
    
    console.log(`Returning ${tracks.length} tracks from: ${JSON.stringify(sourceCounts)}`);
    
    return new Response(JSON.stringify({
      tracks: tracks.slice(0, limit),
      genres,
      countries,
      sources: sourceCounts,
      summary: {
        totalTracks: tracks.length,
        totalListeners,
        avgChange24h: avgChange.toFixed(1),
        lastUpdated: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      tracks: [],
      genres,
      countries,
      summary: { totalTracks: 0, totalListeners: 0, avgChange24h: '0', lastUpdated: new Date().toISOString() }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
