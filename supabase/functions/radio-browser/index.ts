import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Working Radio Browser API servers
const API_SERVERS = [
  'https://de1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
];

// Get random server
const getRandomServer = () => API_SERVERS[Math.floor(Math.random() * API_SERVERS.length)];

// Curated fallback stations with verified working streams
const FALLBACK_STATIONS = [
  { stationuuid: 'fb-1', name: 'Lofi Girl', url: 'https://streams.fluxfm.de/chillhop/mp3-320/streams.fluxfm.de/', url_resolved: 'https://streams.fluxfm.de/chillhop/mp3-320/streams.fluxfm.de/', favicon: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400', tags: 'lofi,chill,study,beats', country: 'Germany', countrycode: 'DE', language: 'Various', votes: 45000, clickcount: 120000, clicktrend: 500, codec: 'MP3', bitrate: 320, homepage: '' },
  { stationuuid: 'fb-2', name: 'SomaFM Groove Salad', url: 'https://ice2.somafm.com/groovesalad-256-mp3', url_resolved: 'https://ice2.somafm.com/groovesalad-256-mp3', favicon: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400', tags: 'electronic,ambient,chill', country: 'United States', countrycode: 'US', language: 'English', votes: 38000, clickcount: 95000, clicktrend: 400, codec: 'MP3', bitrate: 256, homepage: 'https://somafm.com' },
  { stationuuid: 'fb-3', name: 'NTS Radio', url: 'https://stream-relay-geo.ntslive.net/stream', url_resolved: 'https://stream-relay-geo.ntslive.net/stream', favicon: 'https://images.unsplash.com/photo-1571609866754-77a6ad4a8d8c?w=400', tags: 'eclectic,underground,music', country: 'United Kingdom', countrycode: 'GB', language: 'English', votes: 42000, clickcount: 110000, clicktrend: 450, codec: 'MP3', bitrate: 128, homepage: 'https://www.nts.live' },
  { stationuuid: 'fb-4', name: 'Radio Paradise', url: 'https://stream.radioparadise.com/rock-320', url_resolved: 'https://stream.radioparadise.com/rock-320', favicon: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400', tags: 'rock,eclectic,alternative', country: 'United States', countrycode: 'US', language: 'English', votes: 55000, clickcount: 140000, clicktrend: 600, codec: 'MP3', bitrate: 320, homepage: 'https://radioparadise.com' },
  { stationuuid: 'fb-5', name: 'FIP Radio', url: 'https://icecast.radiofrance.fr/fip-hifi.aac', url_resolved: 'https://icecast.radiofrance.fr/fip-hifi.aac', favicon: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', tags: 'eclectic,jazz,world,electronic', country: 'France', countrycode: 'FR', language: 'French', votes: 35000, clickcount: 85000, clicktrend: 350, codec: 'AAC', bitrate: 192, homepage: 'https://www.fip.fr' },
  { stationuuid: 'fb-6', name: 'Jazz24', url: 'https://live.amperwave.net/direct/ppm-jazz24aac256-ibc1', url_resolved: 'https://live.amperwave.net/direct/ppm-jazz24aac256-ibc1', favicon: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=400', tags: 'jazz,smooth,instrumental', country: 'United States', countrycode: 'US', language: 'English', votes: 28000, clickcount: 72000, clicktrend: 280, codec: 'AAC', bitrate: 256, homepage: 'https://www.jazz24.org' },
  { stationuuid: 'fb-7', name: 'BBC Radio 1', url: 'https://stream.live.vc.bbcmedia.co.uk/bbc_radio_one', url_resolved: 'https://stream.live.vc.bbcmedia.co.uk/bbc_radio_one', favicon: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400', tags: 'pop,hits,dance,uk', country: 'United Kingdom', countrycode: 'GB', language: 'English', votes: 65000, clickcount: 180000, clicktrend: 800, codec: 'AAC', bitrate: 320, homepage: 'https://www.bbc.co.uk/radio1' },
  { stationuuid: 'fb-8', name: 'SomaFM Secret Agent', url: 'https://ice2.somafm.com/secretagent-256-mp3', url_resolved: 'https://ice2.somafm.com/secretagent-256-mp3', favicon: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400', tags: 'lounge,spy,jazz,cool', country: 'United States', countrycode: 'US', language: 'English', votes: 22000, clickcount: 58000, clicktrend: 220, codec: 'MP3', bitrate: 256, homepage: 'https://somafm.com' },
  { stationuuid: 'fb-9', name: 'KEXP', url: 'https://kexp-mp3-128.streamguys1.com/kexp128.mp3', url_resolved: 'https://kexp-mp3-128.streamguys1.com/kexp128.mp3', favicon: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400', tags: 'indie,alternative,eclectic', country: 'United States', countrycode: 'US', language: 'English', votes: 48000, clickcount: 125000, clicktrend: 520, codec: 'MP3', bitrate: 128, homepage: 'https://www.kexp.org' },
  { stationuuid: 'fb-10', name: 'SomaFM DEF CON Radio', url: 'https://ice2.somafm.com/defcon-256-mp3', url_resolved: 'https://ice2.somafm.com/defcon-256-mp3', favicon: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400', tags: 'electronic,techno,darkwave', country: 'United States', countrycode: 'US', language: 'English', votes: 18000, clickcount: 45000, clicktrend: 180, codec: 'MP3', bitrate: 256, homepage: 'https://somafm.com' },
  { stationuuid: 'fb-11', name: 'Triple J', url: 'https://live-radio01.mediahubaustralia.com/2TJW/mp3/', url_resolved: 'https://live-radio01.mediahubaustralia.com/2TJW/mp3/', favicon: 'https://images.unsplash.com/photo-1504898770365-14faca6a7320?w=400', tags: 'alternative,indie,australian', country: 'Australia', countrycode: 'AU', language: 'English', votes: 52000, clickcount: 135000, clicktrend: 550, codec: 'MP3', bitrate: 128, homepage: 'https://www.abc.net.au/triplej' },
  { stationuuid: 'fb-12', name: 'WFMU', url: 'https://stream0.wfmu.org/freeform-128k', url_resolved: 'https://stream0.wfmu.org/freeform-128k', favicon: 'https://images.unsplash.com/photo-1526478806334-5fd488fcaabc?w=400', tags: 'freeform,eclectic,underground', country: 'United States', countrycode: 'US', language: 'English', votes: 32000, clickcount: 78000, clicktrend: 320, codec: 'MP3', bitrate: 128, homepage: 'https://wfmu.org' },
  { stationuuid: 'fb-13', name: 'dublab', url: 'https://dublab.out.airtime.pro/dublab_a', url_resolved: 'https://dublab.out.airtime.pro/dublab_a', favicon: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=400', tags: 'experimental,electronic,eclectic', country: 'United States', countrycode: 'US', language: 'English', votes: 15000, clickcount: 38000, clicktrend: 150, codec: 'MP3', bitrate: 128, homepage: 'https://dublab.com' },
  { stationuuid: 'fb-14', name: 'FluxFM', url: 'https://streams.fluxfm.de/live/mp3-320/streams.fluxfm.de/', url_resolved: 'https://streams.fluxfm.de/live/mp3-320/streams.fluxfm.de/', favicon: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400', tags: 'alternative,indie,electronic,german', country: 'Germany', countrycode: 'DE', language: 'German', votes: 25000, clickcount: 65000, clicktrend: 260, codec: 'MP3', bitrate: 320, homepage: 'https://www.fluxfm.de' },
  { stationuuid: 'fb-15', name: 'Radio Nova', url: 'https://novazz.ice.infomaniak.ch/novazz-128.mp3', url_resolved: 'https://novazz.ice.infomaniak.ch/novazz-128.mp3', favicon: 'https://images.unsplash.com/photo-1524230659092-07f99a75c013?w=400', tags: 'world,jazz,soul,french', country: 'France', countrycode: 'FR', language: 'French', votes: 30000, clickcount: 75000, clicktrend: 300, codec: 'MP3', bitrate: 128, homepage: 'https://www.nova.fr' },
  { stationuuid: 'fb-16', name: 'SomaFM Indie Pop', url: 'https://ice2.somafm.com/indiepop-256-mp3', url_resolved: 'https://ice2.somafm.com/indiepop-256-mp3', favicon: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400', tags: 'indie,pop,alternative', country: 'United States', countrycode: 'US', language: 'English', votes: 20000, clickcount: 52000, clicktrend: 200, codec: 'MP3', bitrate: 256, homepage: 'https://somafm.com' },
  { stationuuid: 'fb-17', name: 'Rinse FM', url: 'https://stream.rfrn.fm/rinse', url_resolved: 'https://stream.rfrn.fm/rinse', favicon: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400', tags: 'electronic,grime,uk,bass', country: 'United Kingdom', countrycode: 'GB', language: 'English', votes: 35000, clickcount: 90000, clicktrend: 380, codec: 'MP3', bitrate: 128, homepage: 'https://rinse.fm' },
  { stationuuid: 'fb-18', name: 'SomaFM Metal Detector', url: 'https://ice2.somafm.com/metal-128-mp3', url_resolved: 'https://ice2.somafm.com/metal-128-mp3', favicon: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400', tags: 'metal,rock,heavy', country: 'United States', countrycode: 'US', language: 'English', votes: 16000, clickcount: 42000, clicktrend: 160, codec: 'MP3', bitrate: 128, homepage: 'https://somafm.com' },
  { stationuuid: 'fb-19', name: 'Radio.net Top40', url: 'https://edge22.streamonkey.net/feli-stream', url_resolved: 'https://edge22.streamonkey.net/feli-stream', favicon: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', tags: 'pop,hits,top40,dance', country: 'Germany', countrycode: 'DE', language: 'English', votes: 40000, clickcount: 105000, clicktrend: 420, codec: 'MP3', bitrate: 128, homepage: '' },
  { stationuuid: 'fb-20', name: 'SomaFM Beat Blender', url: 'https://ice2.somafm.com/beatblender-128-mp3', url_resolved: 'https://ice2.somafm.com/beatblender-128-mp3', favicon: 'https://images.unsplash.com/photo-1571609866754-77a6ad4a8d8c?w=400', tags: 'electronic,chill,deep,house', country: 'United States', countrycode: 'US', language: 'English', votes: 19000, clickcount: 48000, clicktrend: 190, codec: 'MP3', bitrate: 128, homepage: 'https://somafm.com' },
];

// Test if a stream URL is reachable (quick HEAD request)
async function isStreamReachable(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'BarioRadio/1.0'
      }
    });
    
    clearTimeout(timeoutId);
    return response.ok || response.status === 200 || response.status === 302 || response.status === 206;
  } catch {
    return false;
  }
}

async function fetchFromRadioBrowser(action: string, params: Record<string, string | number> = {}): Promise<any[]> {
  const server = getRandomServer();
  let endpoint = '';
  
  const queryParams = new URLSearchParams({
    limit: String(Math.min(Number(params.limit || 50), 100)), // Request more to filter
    hidebroken: 'true',
    order: 'clickcount',
    reverse: 'true',
  });

  switch (action) {
    case 'topvote':
      endpoint = '/json/stations/topvote';
      break;
    case 'topclick':
      endpoint = '/json/stations/topclick';
      break;
    case 'bytag':
      endpoint = '/json/stations/bytag/' + encodeURIComponent(String(params.tag || ''));
      break;
    case 'search':
      endpoint = '/json/stations/search';
      queryParams.set('name', String(params.name || ''));
      break;
    default:
      endpoint = '/json/stations/topvote';
  }

  const url = `${server}${endpoint}?${queryParams.toString()}`;
  console.log('Fetching from Radio Browser:', url);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'BarioRadio/1.0',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    // Filter stations with valid URLs and common audio codecs
    const validCodecs = ['MP3', 'AAC', 'OGG', 'OPUS', 'FLAC'];
    const filteredStations = data
      .filter((s: any) => {
        if (!s.url_resolved || !s.name) return false;
        // Filter by codec if available
        if (s.codec && !validCodecs.includes(s.codec.toUpperCase())) return false;
        // Must have reasonable bitrate
        if (s.bitrate && s.bitrate < 32) return false;
        return true;
      })
      .map((s: any) => ({
        stationuuid: s.stationuuid,
        name: s.name,
        url: s.url,
        url_resolved: s.url_resolved,
        favicon: s.favicon || `https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=400`,
        tags: s.tags || '',
        country: s.country || 'Unknown',
        countrycode: s.countrycode || 'XX',
        language: s.language || 'Various',
        votes: s.votes || 0,
        clickcount: s.clickcount || 0,
        clicktrend: s.clicktrend || 0,
        codec: s.codec || 'MP3',
        bitrate: s.bitrate || 128,
        homepage: s.homepage || '',
      }));
    
    return filteredStations;
  } catch (error) {
    console.error('Radio Browser API error:', error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action = 'topvote', limit = 30, name, tag } = await req.json();
    
    console.log('Radio request:', { action, limit, name, tag });
    
    // Try to fetch from Radio Browser API
    let stations = await fetchFromRadioBrowser(action, { limit, name, tag });
    
    // If API returns no results, use fallback stations
    if (stations.length === 0) {
      console.log('Using fallback stations');
      stations = [...FALLBACK_STATIONS];
      
      // Filter based on action
      if (action === 'search' && name) {
        const searchLower = name.toLowerCase();
        stations = stations.filter(s => 
          s.name.toLowerCase().includes(searchLower) || 
          s.tags.toLowerCase().includes(searchLower) ||
          s.country.toLowerCase().includes(searchLower)
        );
      } else if (action === 'bytag' && tag) {
        const tagLower = tag.toLowerCase();
        stations = stations.filter(s => s.tags.toLowerCase().includes(tagLower));
      } else if (action === 'topclick' || action === 'trending') {
        stations.sort((a, b) => b.clickcount - a.clickcount);
      } else {
        stations.sort((a, b) => b.votes - a.votes);
      }
    }
    
    stations = stations.slice(0, limit);

    console.log('Returning', stations.length, 'stations');

    return new Response(JSON.stringify({ stations }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Radio error:', error);
    return new Response(JSON.stringify({ 
      stations: FALLBACK_STATIONS.slice(0, 30),
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
