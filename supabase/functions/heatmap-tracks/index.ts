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
  'NG': ['Wizkid', 'Asake', 'Burna Boy', 'Davido', 'Rema', 'Omah Lay', 'Ayra Starr', 'CKay', 'Seyi Vibez', 'Young Jonn', 'ODUMODUBLVCK', 'FOLA', 'Mavo', 'Tems', 'Shallipopi', 'BNXN', 'Kizz Daniel', 'Adekunle Gold', 'Fireboy DML', 'Flavour', 'Blaqbonez', 'Naira Marley', 'Phyno', 'Chike', 'Magixx', 'Ayo Maff', 'Victony', 'Shoday', 'Olamide'],
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

// Official Nigeria Top 100 from Turntable Charts (Jan 30 - Feb 5, 2026)
// Each entry: [song title, primary artist for Deezer search]
const nigeriaTurntableTop100: Array<{ title: string; artist: string }> = [
  { title: 'Jogodo', artist: 'Wizkid Asake' },
  { title: 'Turbulence', artist: 'Wizkid Asake' },
  { title: 'MY HEALER', artist: 'Seyi Vibez Omah Lay' },
  { title: 'Paparazzi', artist: 'Shoday FOLA' },
  { title: 'Alaye', artist: 'Wizkid Asake' },
  { title: '2Factor', artist: 'Young Jonn Asake Focalistic' },
  { title: 'MONEY CONSTANT', artist: 'DJ Maphorisa DJ Tunez Wizkid Mavo' },
  { title: 'ANGELS', artist: 'Lekaa Beats Omah Lay ODUMODUBLVCK' },
  { title: 'Iskolodo', artist: 'Wizkid Asake' },
  { title: 'Nakupenda', artist: 'TxC Davido Shoday' },
  { title: 'BADAMINTON', artist: 'CKay' },
  { title: 'Waist', artist: 'Omah Lay' },
  { title: 'Raindance', artist: 'Dave Tems' },
  { title: 'Lalala', artist: 'Young Jonn Rema' },
  { title: 'Akonuche', artist: 'Priesst' },
  { title: 'you', artist: 'FOLA' },
  { title: 'Galorizzy', artist: 'Davido Mavo Ecool' },
  { title: 'Body danz', artist: 'CKay Mavo' },
  { title: 'HOW FAR', artist: 'NO11 Ayjay bobo Monochrome' },
  { title: 'Papaoutai Afro soul', artist: 'mikeeysmind Chill77 Unjaps' },
  { title: 'Intentions', artist: 'FAVE Urban Chords' },
  { title: 'With You', artist: 'Davido Omah Lay' },
  { title: 'What You Saying', artist: 'Lil Uzi Vert' },
  { title: 'Tumo Weto', artist: 'Mavo' },
  { title: 'FUN', artist: 'Rema' },
  { title: 'caricature', artist: 'FOLA' },
  { title: '99', artist: 'Olamide Seyi Vibez Asake Young Jonn' },
  { title: 'WHY LOVE', artist: 'Asake' },
  { title: 'FUJI MOTO', artist: 'Seyi Vibez' },
  { title: 'SNOKONOKO', artist: 'Al Xapo Benzoo EeQue' },
  { title: 'Shakabulizzy Remix', artist: 'Mavo Davido' },
  { title: 'Isaka II', artist: 'Ciza Tems Omah Lay' },
  { title: 'Love', artist: 'Burna Boy' },
  { title: 'I Just Might', artist: 'Bruno Mars' },
  { title: 'Getting Paid', artist: 'Sarz Asake Wizkid Skillibeng' },
  { title: 'Birthday', artist: 'Fredo Burna Boy Steel Banglez' },
  { title: 'EASY WITH ME', artist: 'DJ Tunez Wizkid ODUMODUBLVCK' },
  { title: 'Everyday', artist: 'Magixx' },
  { title: 'Remember', artist: 'Asake' },
  { title: 'One Condition', artist: 'DJ Tunez Wizkid FOLA' },
  { title: 'CHANEL', artist: 'Tyla' },
  { title: 'Like That bomboclatt', artist: 'Shallipopi Wizkid' },
  { title: 'PUSH 2 START', artist: 'Tyla' },
  { title: 'BADMAN GANGSTA', artist: 'Asake Tiakola' },
  { title: 'eko', artist: 'FOLA' },
  { title: 'Love Egbugomo', artist: 'Syemca Chike' },
  { title: 'Very Soon', artist: 'BNXN FOLA' },
  { title: 'lost', artist: 'Kold AF' },
  { title: 'lost', artist: 'FOLA Kizz Daniel' },
  { title: 'Aperture', artist: 'Harry Styles' },
  { title: 'Motho Waka', artist: 'LADIPOE Maglera Doe Boy' },
  { title: "Who's Dat Girl", artist: 'Ayra Starr Rema' },
  { title: 'Man2Man', artist: 'Dremo' },
  { title: 'Secondhand', artist: 'Don Toliver Rema' },
  { title: 'LAPOPIANO', artist: 'Boy Muller' },
  { title: 'So Easy To Fall In Love', artist: 'Olivia Dean' },
  { title: 'TENSION', artist: 'Ayo Maff' },
  { title: 'Allonsy', artist: 'BabyDaiz Kvng Vinci' },
  { title: 'The Eagle Has Landed', artist: 'Flavour' },
  { title: 'GROOVING', artist: 'ODUMODUBLVCK Davido Seun Kuti' },
  { title: 'BIG TIME', artist: 'ODUMODUBLVCK Wizkid' },
  { title: "Ko'rin Iyin", artist: 'EmmaOMG' },
  { title: 'Many People', artist: 'Adekunle Gold' },
  { title: 'Lose My Mind', artist: 'T.I BLAZE' },
  { title: 'girl get up', artist: 'Doechii SZA' },
  { title: 'Oh No', artist: 'Oberz FOLA' },
  { title: 'INDUSTRY MACHINE', artist: 'ODUMODUBLVCK' },
  { title: 'On A Low', artist: 'Elestee Ayra Starr' },
  { title: 'Mmmn', artist: 'Naira Marley' },
  { title: 'HOW ARE YOU', artist: 'Seyi Vibez' },
  { title: 'AMA', artist: 'Seyi Vibez' },
  { title: 'Dem Dey', artist: 'Burna Boy' },
  { title: 'IHE DI GI MMA', artist: 'Amb Sis Chinyere Udoma' },
  { title: 'healer', artist: 'FOLA' },
  { title: 'Richer', artist: 'J Hus Seyi Vibez' },
  { title: 'EBUBE DIKE', artist: 'Amb Sis Chinyere Udoma' },
  { title: 'Unto The Next', artist: 'Famous PLuto Zerrydl' },
  { title: 'Blessings', artist: 'Guanso' },
  { title: 'Do Not Disturb DND', artist: 'Lovn' },
  { title: 'White Keys', artist: 'Dominic Fike' },
  { title: 'No', artist: 'Mavo' },
  { title: 'Promise Land', artist: 'Obedo PF' },
  { title: 'Elastico', artist: 'Fantomel Willy William Ben Cristovao' },
  { title: 'Wetin Dey', artist: 'Chike' },
  { title: 'golibe', artist: 'FOLA Victony' },
  { title: 'Oga Eme', artist: 'Kolaboy Evado' },
  { title: 'Despacito', artist: 'Blaqbonez FOLA' },
  { title: '100', artist: 'Ella Mai' },
  { title: 'wgft', artist: 'Gunna Burna Boy' },
  { title: 'Man I Need', artist: 'Olivia Dean' },
  { title: 'Arda Guler', artist: 'Mykel Coker' },
  { title: 'Talking Stage', artist: 'AJ Tracey Nemzzz' },
  { title: 'Ask Of Me', artist: 'Phyno' },
  { title: 'End Of Beginning', artist: 'Djo' },
  { title: 'Trap lan je', artist: 'Tml Vibez' },
  { title: 'bye bye', artist: 'FOLA' },
  { title: 'Opalite', artist: 'Taylor Swift' },
  { title: 'Big Daddy', artist: 'Tems' },
];

// Fetch Nigeria chart using exact Turntable Charts song+artist searches on Deezer
async function getNigeriaTurntableChart(): Promise<any[]> {
  // Search for each song in batches to avoid rate limits
  const batchSize = 10;
  const allTracks: any[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < nigeriaTurntableTop100.length; i += batchSize) {
    const batch = nigeriaTurntableTop100.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (entry, batchIdx) => {
        const chartRank = i + batchIdx; // 0-based chart position
        try {
          const query = `${entry.title} ${entry.artist}`;
          const response = await fetch(
            `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=5&order=RANKING`
          );
          const data = await response.json();
          const results = data.data || [];
          
          // Find best match - prefer exact title match
          const titleLower = entry.title.toLowerCase();
          const match = results.find((t: any) => 
            (t.title || '').toLowerCase().includes(titleLower) ||
            titleLower.includes((t.title || '').toLowerCase())
          ) || results[0];
          
          if (match) {
            const key = `${(match.title || '').toLowerCase()}_${(match.artist?.name || '').toLowerCase()}`;
            if (!seen.has(key)) {
              seen.add(key);
              return { ...match, _chartRank: chartRank, _turntableTitle: entry.title };
            }
          }
          return null;
        } catch {
          return null;
        }
      })
    );
    allTracks.push(...results.filter(Boolean));
  }

  console.log(`Nigeria Turntable Chart: Found ${allTracks.length} tracks from ${nigeriaTurntableTop100.length} chart entries`);
  return allTracks;
}

// Genre-based trending search queries per country to catch current hits
const countryTrendingQueries: Record<string, string[]> = {
  'NG': ['afrobeats 2025 new naija'],
  'ZA': ['amapiano 2025', 'south african music new 2025'],
  'GH': ['ghana music 2025', 'afrobeats ghana new'],
  'KE': ['kenyan music 2025', 'gengetone new'],
  'BR': ['funk brasileiro 2025', 'sertanejo new 2025'],
  'MX': ['corridos tumbados 2025', 'mexican music new'],
  'FR': ['rap francais 2025', 'french pop new'],
  'DE': ['german rap 2025', 'deutschrap new'],
  'JP': ['jpop 2025', 'japanese music new'],
  'KR': ['kpop 2025', 'korean pop new'],
  'IN': ['bollywood 2025', 'indian music new'],
  'US': ['hip hop 2025', 'pop music new 2025'],
  'UK': ['uk rap 2025', 'british pop new'],
  'AU': ['australian music 2025', 'aussie pop new'],
  'CA': ['canadian music 2025', 'toronto rap new'],
  'ES': ['reggaeton 2025', 'spanish pop new'],
  'IT': ['italian rap 2025', 'italian pop new']
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

// Fetch global chart tracks as the "international hits" component for country views
async function getGlobalChartForCountry(limit: number = 20): Promise<any[]> {
  try {
    const response = await fetch(`https://api.deezer.com/chart/0/tracks?limit=${limit}`);
    const data = await response.json();
    const tracks = data.data || [];
    console.log(`Global chart for country blend: Got ${tracks.length} tracks`);
    return tracks;
  } catch (e) {
    console.error('Global chart for country blend error:', e);
    return [];
  }
}

// Fetch album release date from Deezer to determine recency
async function getAlbumReleaseDate(albumId: number): Promise<string | null> {
  try {
    const response = await fetch(`https://api.deezer.com/album/${albumId}`);
    const data = await response.json();
    return data.release_date || null;
  } catch {
    return null;
  }
}

// Calculate months since a date string (YYYY-MM-DD)
function monthsSince(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
}

// Fetch top tracks from known local artists, biased toward recent releases
async function getLocalArtistTracks(countryCode: string, limit: number = 30): Promise<any[]> {
  const artists = countryArtists[countryCode];
  if (!artists || artists.length === 0) return [];

  const tracksPerArtist = Math.max(3, Math.ceil(limit / artists.length));
  const currentYear = new Date().getFullYear();

  try {
    const results = await Promise.all(
      artists.map(async (artist) => {
        // Fetch more tracks than needed so we can filter for recency
        const fetchLimit = tracksPerArtist + 10;
        const response = await fetch(
          `https://api.deezer.com/search?q=${encodeURIComponent('artist:"' + artist + '"')}&limit=${fetchLimit}&order=RANKING`
        );
        const data = await response.json();
        const rawTracks = (data.data || []).filter((t: any) => {
          const returnedArtist = (t.artist?.name || '').toLowerCase();
          const searchedArtist = artist.toLowerCase();
          return returnedArtist === searchedArtist || 
                 returnedArtist.includes(searchedArtist) || 
                 searchedArtist.includes(returnedArtist);
        });

        // Check album release dates for top tracks
        const tracksWithDates = await Promise.all(
          rawTracks.slice(0, Math.min(rawTracks.length, 8)).map(async (t: any) => {
            let releaseDate: string | null = null;
            if (t.album?.id) {
              releaseDate = await getAlbumReleaseDate(t.album.id);
            }
            return { ...t, _releaseDate: releaseDate, _countryArtist: artist };
          })
        );

        // Separate recent vs older tracks
        const recent = tracksWithDates.filter(t => t._releaseDate && monthsSince(t._releaseDate) <= 12);
        const older = tracksWithDates.filter(t => !t._releaseDate || monthsSince(t._releaseDate) > 12);

        // Take all recent tracks + max 1 classic fallback
        const selected = [...recent.slice(0, tracksPerArtist)];
        if (selected.length < tracksPerArtist && older.length > 0) {
          selected.push(older[0]); // 1 all-time classic per artist
        }

        return selected.length > 0 ? selected : rawTracks.slice(0, 1).map((t: any) => ({ ...t, _releaseDate: null, _countryArtist: artist }));
      })
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

    // Sort: recent tracks first (by release date desc), then by rank
    unique.sort((a: any, b: any) => {
      const aRecent = a._releaseDate && monthsSince(a._releaseDate) <= 12 ? 1 : 0;
      const bRecent = b._releaseDate && monthsSince(b._releaseDate) <= 12 ? 1 : 0;
      if (aRecent !== bRecent) return bRecent - aRecent;
      return (b.rank || 0) - (a.rank || 0);
    });

    console.log(`Local artists for ${countryCode}: Got ${unique.length} unique tracks (${unique.filter(t => t._releaseDate && monthsSince(t._releaseDate) <= 12).length} recent) from ${artists.length} artists`);
    return unique.slice(0, limit);
  } catch (e) {
    console.error(`Local artist tracks error for ${countryCode}:`, e);
    return [];
  }
}

// Search for genre-trending tracks for a country (catches rising artists not in curated list)
async function getGenreTrendingTracks(countryCode: string, limit: number = 15): Promise<any[]> {
  const queries = countryTrendingQueries[countryCode];
  if (!queries || queries.length === 0) return [];

  try {
    const results = await Promise.all(
      queries.map(query =>
        fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=${Math.ceil(limit / queries.length) + 5}`)
          .then(r => r.json())
          .then(d => d.data || [])
          .catch(() => [])
      )
    );
    const allTracks = results.flat();
    
    // Deduplicate
    const seen = new Set<string>();
    const unique: any[] = [];
    for (const t of allTracks) {
      const key = `${(t.title || '').toLowerCase()}_${(t.artist?.name || '').toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(t);
      }
    }
    console.log(`Genre trending for ${countryCode}: Got ${unique.length} tracks from queries: ${queries.join(', ')}`);
    return unique.slice(0, limit);
  } catch (e) {
    console.error(`Genre trending error for ${countryCode}:`, e);
    return [];
  }
}

// Blended country chart: local artists (recency-biased) + genre trending + global chart
async function getCountryChart(countryCode: string, limit: number = 60): Promise<{ chart: any[]; local: any[]; trending: any[] }> {
  const [chartTracks, localTracks, trendingTracks] = await Promise.all([
    getGlobalChartForCountry(15),
    getLocalArtistTracks(countryCode, 40),
    getGenreTrendingTracks(countryCode, 15)
  ]);

  // Deduplicate: local > trending > chart priority
  const localKeys = new Set(
    localTracks.map(t => `${(t.title || '').toLowerCase()}_${(t.artist?.name || '').toLowerCase()}`)
  );
  const uniqueTrending = trendingTracks.filter(t => {
    const key = `${(t.title || '').toLowerCase()}_${(t.artist?.name || '').toLowerCase()}`;
    return !localKeys.has(key);
  });
  const allLocalKeys = new Set([
    ...localKeys,
    ...uniqueTrending.map(t => `${(t.title || '').toLowerCase()}_${(t.artist?.name || '').toLowerCase()}`)
  ]);
  const uniqueChart = chartTracks.filter(t => {
    const key = `${(t.title || '').toLowerCase()}_${(t.artist?.name || '').toLowerCase()}`;
    return !allLocalKeys.has(key);
  });

  console.log(`Blended ${countryCode}: ${localTracks.length} local + ${uniqueTrending.length} trending + ${uniqueChart.length} global chart`);
  return { chart: uniqueChart, local: localTracks, trending: uniqueTrending };
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

const genres = [
  'All', 'Pop', 'Rap', 'Rock', 'R&B', 'Classical', 'Jazz', 'Soul & Funk',
  'Afro', 'Indie & Alternative', 'Latin Music', 'Dance & EDM',
  'Reggaeton', 'Electronic', 'Country', 'Metal', 'K-Pop',
  'Reggae', 'Blues', 'Folk', 'Lofi', 'Acoustic',
  'Caribbean', 'Japanese Music', 'AnimeVerse', 'Trap'
];

// Deezer genre_id to genre name mapping
const deezerGenreIdMap: Record<number, string> = {
  0: 'All', 132: 'Pop', 116: 'Rap', 152: 'Rock', 165: 'R&B',
  98: 'Classical', 129: 'Jazz', 169: 'Soul & Funk', 2: 'Afro',
  85: 'Indie & Alternative', 197: 'Latin Music', 113: 'Dance & EDM',
  122: 'Reggaeton', 106: 'Electronic', 84: 'Country', 464: 'Metal',
  173: 'K-Pop', 144: 'Reggae', 153: 'Blues', 466: 'Folk',
  95: 'Acoustic', 65: 'Caribbean', 75: 'Japanese Music',
  174: 'Gospel', 168: 'R&B',
};

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
  
  // Recency bonus: boost tracks with recent release dates
  let recencyBonus = 0;
  const releaseDate = track._releaseDate;
  if (releaseDate) {
    const months = monthsSince(releaseDate);
    if (months <= 6) recencyBonus = 50000;
    else if (months <= 12) recencyBonus = 25000;
    else if (months <= 18) recencyBonus = 10000;
  }
  
  const attentionScore = Math.round(popularity * 800 + monthlyListeners / 500 + chartBonus + recencyBonus);
  
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
    genre: deezerGenreIdMap[track.album?.genre_id] || track.genre || 'Pop',
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
    genre: track.genre || 'Electronic',  // Audius tracks keep their genre or default
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
      
    } else if (country === 'NG') {
      // Nigeria: Use hardcoded Turntable Charts Top 100 for exact accuracy
      console.log('Fetching Nigeria chart from Turntable Charts data...');
      
      const [turntableTracks, globalChartTracks] = await Promise.all([
        getNigeriaTurntableChart(),
        getGlobalChartForCountry(10)
      ]);
      
      // Format turntable tracks with chart position preserved
      const formattedTurntable = turntableTracks.map((t: any, i: number) => 
        formatDeezerTrack(t, i, 'NG', t._chartRank ?? i)
      );
      
      // Dedupe global chart against turntable tracks
      const turntableKeys = new Set(formattedTurntable.map(t => `${t.title.toLowerCase()}_${t.artist.toLowerCase()}`));
      const uniqueGlobal = globalChartTracks
        .filter((t: any) => !turntableKeys.has(`${(t.title || '').toLowerCase()}_${(t.artist?.name || '').toLowerCase()}`))
        .map((t: any, i: number) => formatDeezerTrack(t, i + formattedTurntable.length, 'NG', i + 90));
      
      const allTracks = [...formattedUserUploads, ...formattedTurntable, ...uniqueGlobal];
      tracks = allTracks.filter(t => t.previewUrl);
      
      const topTracks = formattedTurntable.slice(0, 5).map(t => `${t.artist} - ${t.title}`).join(', ');
      console.log(`Nigeria Turntable: ${formattedTurntable.length} chart tracks + ${uniqueGlobal.length} global. Top: ${topTracks}`);
      
    } else if (country && country !== 'GLOBAL') {
      // Other countries: Blend local artists (recency-biased) + genre trending + global chart
      console.log(`Fetching recency-biased blended chart for: ${country}`);
      
      const { chart: globalChartTracks, local: localTracks, trending: trendingTracks } = await getCountryChart(country, 60);
      
      // Local artists get high chartBonus (top positions) — recent releases dominate
      const formattedLocal = localTracks.map((t: any, i: number) => formatDeezerTrack(t, i, country, i));
      // Genre trending tracks fill middle positions
      const formattedTrending = trendingTracks.map((t: any, i: number) => formatDeezerTrack(t, i + formattedLocal.length, country, i + 30));
      // Global chart tracks get lower chartBonus (fill remaining positions)
      const formattedChart = globalChartTracks.map((t: any, i: number) => formatDeezerTrack(t, i + formattedLocal.length + formattedTrending.length, country, i + 50));
      
      const allTracks = [...formattedUserUploads, ...formattedLocal, ...formattedTrending, ...formattedChart];
      tracks = allTracks.filter(t => t.previewUrl);
      
      const topLocal = formattedLocal.slice(0, 3).map(t => `${t.artist} - ${t.title}`).join(', ');
      console.log(`Country ${country}: ${formattedLocal.length} local (top: ${topLocal}), ${formattedTrending.length} trending, ${formattedChart.length} global`);
      
    } else if (genre && genre !== 'All') {
      // Map genre names to Deezer genre IDs for chart endpoint
      const genreIdLookup: Record<string, number> = {
        'Pop': 132, 'Rap': 116, 'Rock': 152, 'R&B': 165,
        'Classical': 98, 'Jazz': 129, 'Soul & Funk': 169, 'Afro': 2,
        'Indie & Alternative': 85, 'Latin Music': 197, 'Dance & EDM': 113,
        'Reggaeton': 122, 'Electronic': 106, 'Country': 84, 'Metal': 464,
        'K-Pop': 173, 'Reggae': 144, 'Blues': 153, 'Folk': 466,
        'Acoustic': 95, 'Caribbean': 65, 'Japanese Music': 75,
      };

      // Genres that need search-based approach (no Deezer chart endpoint)
      const searchOnlyGenres: Record<string, string[]> = {
        'AnimeVerse': ['anime opening', 'anime ost'],
        'Trap': ['trap metro boomin', 'trap nation'],
        'Lofi': ['lofi hip hop', 'lo-fi chill beats'],
      };

      let deezerTracks: any[] = [];

      if (searchOnlyGenres[genre]) {
        // Use multi-search for genres without Deezer chart IDs
        const searchTerms = searchOnlyGenres[genre];
        const searchPromises = searchTerms.map(term => searchDeezer(term, 30));
        const allSearchResults = await Promise.all(searchPromises);
        const seenIds = new Set<string>();
        const mergedResults: any[] = [];
        for (const results of allSearchResults) {
          for (const track of results) {
            if (!seenIds.has(String(track.id))) {
              seenIds.add(String(track.id));
              mergedResults.push(track);
            }
          }
        }
        deezerTracks = mergedResults.slice(0, 50).map((t: any, i: number) => ({ ...formatDeezerTrack(t, i, 'GLOBAL'), genre }));
      } else if (genreIdLookup[genre]) {
        // Use Deezer's editorial/chart endpoint for genres with IDs
        try {
          const genreId = genreIdLookup[genre];
          const [chartRes, searchRes] = await Promise.all([
            fetch(`https://api.deezer.com/chart/${genreId}/tracks?limit=40`).then(r => r.json()).catch(() => ({ data: [] })),
            searchDeezer(`${genre} 2025`, 20),
          ]);
          const chartData = chartRes.data || chartRes.tracks?.data || [];
          const seenIds = new Set(chartData.map((t: any) => String(t.id)));
          const uniqueSearch = searchRes.filter((t: any) => !seenIds.has(String(t.id)));
          const combined = [...chartData, ...uniqueSearch].slice(0, 50);
          deezerTracks = combined.map((t: any, i: number) => ({ ...formatDeezerTrack(t, i, 'GLOBAL'), genre }));
        } catch (e) {
          console.error(`Genre chart error for ${genre}:`, e);
          const fallback = await searchDeezer(`${genre} music 2025`, 50);
          deezerTracks = fallback.map((t: any, i: number) => ({ ...formatDeezerTrack(t, i, 'GLOBAL'), genre }));
        }
      } else {
        // Fallback: search-based
        const results = await searchDeezer(`${genre} music 2025`, 50);
        deezerTracks = results.map((t: any, i: number) => ({ ...formatDeezerTrack(t, i, 'GLOBAL'), genre }));
      }

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
