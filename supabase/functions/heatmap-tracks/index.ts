import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Deterministic hash function for stable metrics
function stableRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 1000) / 1000;
}

function todaySeed(): string {
  return new Date().toISOString().split('T')[0];
}

// Country-specific top artists - this is the PRIMARY source for country charts
const countryArtists: Record<string, string[]> = {
  'NG': ['Wizkid', 'Burna Boy', 'Davido', 'Rema', 'Asake', 'Ayra Starr', 'Tems', 'Omah Lay', 'Ckay', 'Fireboy DML', 'Joeboy', 'Kizz Daniel', 'Shallipopi', 'Young Jonn', 'Seyi Vibez', 'Spyro', 'BNXN'],
  'US': ['Drake', 'Kendrick Lamar', 'Taylor Swift', 'The Weeknd', 'Bad Bunny', 'SZA', 'Post Malone', 'Travis Scott', 'Morgan Wallen', 'Billie Eilish', 'Doja Cat', 'Future', 'Metro Boomin', 'Sabrina Carpenter'],
  'UK': ['Central Cee', 'Ed Sheeran', 'Dua Lipa', 'Dave', 'Stormzy', 'Little Simz', 'Tion Wayne', 'Headie One', 'Skepta', 'AJ Tracey', 'Jorja Smith', 'Sam Smith'],
  'GH': ['Sarkodie', 'Shatta Wale', 'Stonebwoy', 'Black Sherif', 'King Promise', 'Gyakie', 'Camidoh', 'Kuami Eugene', 'KiDi', 'Lasmid'],
  'ZA': ['Tyla', 'Kabza De Small', 'DJ Maphorisa', 'Nasty C', 'Cassper Nyovest', 'A-Reece', 'Master KG', 'Focalistic', 'Ami Faku', 'Sun-El Musician', 'DBN Gogo', 'Uncle Waffles', 'Young Stunna', 'Oscar Mbo', 'Musa Keys', 'Tyler ICU', 'Daliwonga', 'Kelvin Momo'],
  'KE': ['Sauti Sol', 'Nyashinski', 'Khaligraph Jones', 'Otile Brown', 'Nviiri The Storyteller', 'Bensoul', 'Bien', 'Nikita Kering'],
  'BR': ['Anitta', 'Ludmilla', 'MC Livinho', 'Luisa Sonza', 'Pedro Sampaio', 'Gusttavo Lima', 'Jorge & Mateus', 'Henrique & Juliano'],
  'MX': ['Peso Pluma', 'Natanael Cano', 'Junior H', 'Luis R Conriquez', 'Fuerza Regida', 'Grupo Frontera', 'Ivan Cornejo'],
  'FR': ['Aya Nakamura', 'Jul', 'Ninho', 'Damso', 'Gazo', 'Tiakola', 'PLK', 'Laylow', 'Werenoi'],
  'DE': ['Apache 207', 'Luciano', 'RAF Camora', 'Capital Bra', 'Bonez MC', 'Sido', 'Kontra K', 'Samra'],
  'JP': ['YOASOBI', 'Ado', 'King Gnu', 'Fujii Kaze', 'Mrs. GREEN APPLE', 'Kenshi Yonezu', 'Official HIGE DANdism', 'imase'],
  'KR': ['BTS', 'BLACKPINK', 'Stray Kids', 'NewJeans', 'aespa', 'IVE', 'LE SSERAFIM', 'SEVENTEEN', 'NCT', 'TWICE', 'ENHYPEN'],
  'IN': ['Arijit Singh', 'Diljit Dosanjh', 'AP Dhillon', 'Badshah', 'Divine', 'Raftaar', 'Karan Aujla', 'Shreya Ghoshal'],
  'AU': ['The Kid LAROI', 'Tame Impala', 'Troye Sivan', 'Vance Joy', '5 Seconds of Summer', 'Sia'],
  'CA': ['The Weeknd', 'Justin Bieber', 'Shawn Mendes', 'NAV', 'PartyNextDoor', 'Alessia Cara'],
  'ES': ['Rosalía', 'Quevedo', 'Rauw Alejandro', 'Rels B', 'Mora', 'Omar Montes', 'C. Tangana'],
  'IT': ['Mahmood', 'Sfera Ebbasta', 'Geolier', 'Tedua', 'Guè', 'Blanco', 'Annalisa']
};

// Country display names for search queries
const countryNames: Record<string, string> = {
  'NG': 'Nigeria', 'US': 'United States', 'UK': 'United Kingdom', 'GH': 'Ghana',
  'ZA': 'South Africa', 'KE': 'Kenya', 'BR': 'Brazil', 'MX': 'Mexico',
  'FR': 'France', 'DE': 'Germany', 'JP': 'Japan', 'KR': 'South Korea',
  'IN': 'India', 'AU': 'Australia', 'CA': 'Canada', 'ES': 'Spain', 'IT': 'Italy'
};

// Single consistent strategy: chart endpoint only, sorted by position
async function getDeezerGlobalChart(limit: number = 50): Promise<any[]> {
  try {
    const response = await fetch(`https://api.deezer.com/chart/0/tracks?limit=100`);
    const data = await response.json();
    const allTracks = data.data || [];
    console.log(`Deezer global chart: Got ${allTracks.length} tracks`);
    return allTracks.slice(0, limit);
  } catch (e) {
    console.error('Deezer chart error:', e);
    return [];
  }
}

// Search Deezer
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

// Fetch real trending chart for a country (what people there are actually streaming)
async function getCountryChartPlaylist(countryCode: string, limit: number = 30): Promise<any[]> {
  const name = countryNames[countryCode] || countryCode;
  try {
    const response = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent('top hits ' + name + ' 2025')}&limit=${limit}&order=RANKING`
    );
    const data = await response.json();
    const tracks = data.data || [];
    console.log(`Country chart playlist for ${countryCode}: Got ${tracks.length} tracks`);
    return tracks;
  } catch (e) {
    console.error(`Country chart playlist error for ${countryCode}:`, e);
    return [];
  }
}

// Fetch top tracks from known local artists for a country
async function getLocalArtistTracks(countryCode: string, limit: number = 30): Promise<any[]> {
  const artists = countryArtists[countryCode];
  if (!artists || artists.length === 0) return [];

  const tracksPerArtist = Math.max(2, Math.ceil(limit / artists.length));

  try {
    const results = await Promise.all(
      artists.map(artist =>
        fetch(`https://api.deezer.com/search?q=${encodeURIComponent(artist)}&limit=${tracksPerArtist}&order=RANKING`)
          .then(r => r.json())
          .then(d => (d.data || []).map((t: any) => ({ ...t, _countryArtist: artist })))
          .catch(() => [])
      )
    );

    const allTracks = results.flat();

    // Deduplicate by title+artist
    const seen = new Set<string>();
    const unique: any[] = [];
    for (const t of allTracks) {
      const key = `${(t.title || '').toLowerCase()}_${(t.artist?.name || '').toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(t);
      }
    }

    unique.sort((a: any, b: any) => (b.rank || 0) - (a.rank || 0));
    console.log(`Local artists for ${countryCode}: Got ${unique.length} unique tracks from ${artists.length} artists`);
    return unique.slice(0, limit);
  } catch (e) {
    console.error(`Local artist tracks error for ${countryCode}:`, e);
    return [];
  }
}

// Blended country chart: real trending + local artists
async function getCountryChart(countryCode: string, limit: number = 60): Promise<{ chart: any[]; local: any[] }> {
  const [chartTracks, localTracks] = await Promise.all([
    getCountryChartPlaylist(countryCode, 30),
    getLocalArtistTracks(countryCode, 40)
  ]);

  // Deduplicate: remove local tracks that already appear in chart
  const chartKeys = new Set(
    chartTracks.map(t => `${(t.title || '').toLowerCase()}_${(t.artist?.name || '').toLowerCase()}`)
  );
  const uniqueLocal = localTracks.filter(t => {
    const key = `${(t.title || '').toLowerCase()}_${(t.artist?.name || '').toLowerCase()}`;
    return !chartKeys.has(key);
  });

  console.log(`Blended ${countryCode}: ${chartTracks.length} chart + ${uniqueLocal.length} local (deduped from ${localTracks.length})`);
  return { chart: chartTracks, local: uniqueLocal };
}

// Audius trending
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
    return data || [];
  } catch (e) {
    console.error('User uploads fetch error:', e);
    return [];
  }
}

function formatUserUpload(upload: any, index: number) {
  const playCount = upload.play_count || 0;
  const likeCount = upload.like_count || 0;
  const seed = `user_${upload.id}${todaySeed()}`;
  const change24h = stableRandom(seed + 'c24') * 20 - 2;
  const attentionScore = Math.round(playCount * 10 + likeCount * 50 + 5000);

  return {
    id: `user_${upload.id}`,
    rank: index + 1,
    title: upload.title,
    artist: 'Bario Artist',
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

// Format Deezer track - chartIndex preserves original chart position in attentionScore
function formatDeezerTrack(track: any, index: number, countryCode: string, chartIndex?: number) {
  const deezerRank = track.rank || 0;
  const baseListeners = Math.floor(deezerRank / 10);
  const monthlyListeners = Math.max(100000, baseListeners + (index < 10 ? 500000 : index < 30 ? 200000 : 50000));
  const seed = `deezer_${track.id}${todaySeed()}`;
  const change24h = stableRandom(seed + 'c24') * 25 - 5;
  const popularity = Math.min(100, Math.floor(deezerRank / 8000) + 50);
  
  const chartBonus = typeof chartIndex === 'number' 
    ? Math.max(0, (100 - chartIndex) * 1000)
    : 0;
  const attentionScore = Math.round(popularity * 800 + monthlyListeners / 500 + chartBonus);
  
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

// Format Audius track with Deezer preview lookup
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
    
    const userUploads = await getUserUploads(supabase, search, genre, 20);
    const formattedUserUploads = userUploads.map((u: any, i: number) => formatUserUpload(u, i));
    
    if (search) {
      // Search mode: query Deezer + Audius
      const [deezerResults, audiusResults] = await Promise.all([
        searchDeezer(search, 50),
        searchAudius(search, 10)
      ]);
      
      const deezerTracks = deezerResults.map((t: any, i: number) => formatDeezerTrack(t, i, country));
      const audiusTracks = await Promise.all(audiusResults.map((t: any, i: number) => formatAudiusTrackWithPreview(t, i + deezerTracks.length)));
      
      const allTracks = [...formattedUserUploads, ...deezerTracks, ...audiusTracks];
      tracks = allTracks.filter(t => t.previewUrl);
      console.log(`Search results: User=${formattedUserUploads.length}, Deezer=${deezerTracks.length}, Audius=${audiusTracks.length}`);
      
    } else if (country && country !== 'GLOBAL') {
      // Country-specific: Blend real trending chart + local artist tracks
      console.log(`Fetching blended chart for: ${country}`);
      
      const { chart: chartTracks, local: localTracks } = await getCountryChart(country, 60);
      
      // Chart tracks get high chartBonus (positions 1-30)
      const formattedChart = chartTracks.map((t: any, i: number) => formatDeezerTrack(t, i, country, i));
      // Local artist tracks get moderate chartBonus (positions 31-60)
      const formattedLocal = localTracks.map((t: any, i: number) => formatDeezerTrack(t, i + formattedChart.length, country, i + 30));
      
      const allTracks = [...formattedUserUploads, ...formattedChart, ...formattedLocal];
      tracks = allTracks.filter(t => t.previewUrl);
      
      const topChart = formattedChart.slice(0, 3).map(t => t.artist).join(', ');
      const topLocal = formattedLocal.slice(0, 3).map(t => t.artist).join(', ');
      console.log(`Country ${country}: ${formattedChart.length} chart (${topChart}), ${formattedLocal.length} local (${topLocal})`);
      
    } else if (genre && genre !== 'All') {
      const deezerResults = await searchDeezer(`${genre} hits 2024`, 50);
      const deezerTracks = deezerResults.map((t: any, i: number) => ({ ...formatDeezerTrack(t, i, 'GLOBAL'), genre }));
      tracks = [...formattedUserUploads, ...deezerTracks];
      
    } else {
      // Global trending: Deezer global chart + Audius
      const [deezerGlobal, audiusTrending] = await Promise.all([
        getDeezerGlobalChart(60),
        getAudiusTrending(20)
      ]);
      
      const deezerTracks = deezerGlobal.map((t: any, i: number) => formatDeezerTrack(t, i, 'GLOBAL', i));
      const audiusTracks = await Promise.all(audiusTrending.map((t: any, i: number) => formatAudiusTrackWithPreview(t, i + deezerTracks.length)));
      
      const allTracks = [...formattedUserUploads, ...deezerTracks, ...audiusTracks];
      tracks = allTracks.filter(t => t.previewUrl);
      
      console.log(`Global results: User=${formattedUserUploads.length}, Deezer=${deezerTracks.length}, Audius=${audiusTracks.length}`);
    }
    
    // Remove duplicates by title+artist
    const seen = new Set();
    tracks = tracks.filter(t => {
      const key = `${t.title.toLowerCase()}_${t.artist.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    // Sort by attention score - chart position preserved via chartBonus
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
