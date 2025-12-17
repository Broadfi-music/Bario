import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeezerTrack {
  id: number;
  title: string;
  duration: number;
  preview: string;
  artist: {
    id: number;
    name: string;
    picture_medium: string;
  };
  album: {
    id: number;
    title: string;
    cover_medium: string;
    cover_big: string;
  };
}

interface DeezerChart {
  tracks: {
    data: DeezerTrack[];
  };
}

async function fetchDeezerChart(): Promise<DeezerTrack[]> {
  try {
    const response = await fetch('https://api.deezer.com/chart/0/tracks?limit=50');
    if (!response.ok) throw new Error('Deezer chart failed');
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Deezer chart error:', error);
    return [];
  }
}

async function fetchDeezerNewReleases(): Promise<DeezerTrack[]> {
  try {
    // Fetch from editorial new releases
    const response = await fetch('https://api.deezer.com/editorial/0/releases?limit=30');
    if (!response.ok) throw new Error('Deezer releases failed');
    const data = await response.json();
    
    // Get tracks from albums
    const tracks: DeezerTrack[] = [];
    if (data.data) {
      for (const album of data.data.slice(0, 15)) {
        try {
          const albumRes = await fetch(`https://api.deezer.com/album/${album.id}/tracks?limit=2`);
          const albumData = await albumRes.json();
          if (albumData.data) {
            tracks.push(...albumData.data.map((t: any) => ({
              ...t,
              album: {
                id: album.id,
                title: album.title,
                cover_medium: album.cover_medium,
                cover_big: album.cover_big,
              }
            })));
          }
        } catch (e) {
          console.error('Album fetch error:', e);
        }
      }
    }
    return tracks;
  } catch (error) {
    console.error('Deezer new releases error:', error);
    return [];
  }
}

async function fetchDeezerGenreTracks(genreId: number, genreName: string): Promise<any[]> {
  try {
    const response = await fetch(`https://api.deezer.com/chart/${genreId}/tracks?limit=20`);
    if (!response.ok) throw new Error(`Deezer genre ${genreName} failed`);
    const data = await response.json();
    return (data.data || []).map((track: DeezerTrack) => ({
      ...track,
      genre: genreName,
    }));
  } catch (error) {
    console.error(`Deezer genre ${genreName} error:`, error);
    return [];
  }
}

async function fetchAudiusTrending(): Promise<any[]> {
  try {
    const response = await fetch('https://discoveryprovider.audius.co/v1/tracks/trending?limit=30');
    if (!response.ok) throw new Error('Audius trending failed');
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Audius trending error:', error);
    return [];
  }
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatPlays(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toString();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const section = url.searchParams.get('section') || 'all';

    console.log(`Dashboard music request: section=${section}`);

    // Fetch data from multiple sources
    const [chartTracks, newReleases, audiusTrending, hipHopTracks, electronicTracks, afrobeatsTracks] = await Promise.all([
      fetchDeezerChart(),
      fetchDeezerNewReleases(),
      fetchAudiusTrending(),
      fetchDeezerGenreTracks(116, 'Hip Hop'), // Rap/Hip Hop genre ID
      fetchDeezerGenreTracks(106, 'Electronic'), // Electro genre ID
      fetchDeezerGenreTracks(119, 'Afrobeat'), // African genre ID
    ]);

    // Format trending songs (Deezer chart)
    const trendingSongs = chartTracks.slice(0, 20).map((track, index) => ({
      id: track.id,
      title: track.title,
      artist: track.artist.name,
      artistId: track.artist.id,
      artistImage: track.artist.picture_medium,
      artwork: track.album.cover_big || track.album.cover_medium,
      duration: formatDuration(track.duration),
      preview: track.preview,
      plays: formatPlays(Math.floor(2500000 - (index * 80000) + Math.random() * 50000)),
      likes: formatPlays(Math.floor(150000 - (index * 5000) + Math.random() * 3000)),
      genre: 'Pop',
      rank: index + 1,
    }));

    // Format new songs (Deezer new releases)
    const newSongs = newReleases.slice(0, 20).map((track, index) => ({
      id: track.id,
      title: track.title,
      artist: track.artist?.name || 'Unknown Artist',
      artistId: track.artist?.id,
      artistImage: track.artist?.picture_medium,
      artwork: track.album?.cover_big || track.album?.cover_medium || `https://e-cdns-images.dzcdn.net/images/cover/${track.id}/500x500-000000-80-0-0.jpg`,
      duration: formatDuration(track.duration),
      preview: track.preview,
      plays: formatPlays(Math.floor(500000 - (index * 15000) + Math.random() * 10000)),
      likes: formatPlays(Math.floor(30000 - (index * 1000) + Math.random() * 500)),
      genre: 'New Release',
      isNew: true,
    }));

    // Format trending remixes (from Hip Hop and Electronic - genres with lots of remixes)
    const remixTracks = [...hipHopTracks, ...electronicTracks].filter(t => 
      t.title.toLowerCase().includes('remix') || 
      t.title.toLowerCase().includes('mix') ||
      t.title.toLowerCase().includes('edit') ||
      t.title.toLowerCase().includes('version')
    ).slice(0, 15);

    // If not enough remix tracks, use electronic as remixes
    const trendingRemixes = (remixTracks.length > 5 ? remixTracks : electronicTracks.slice(0, 15)).map((track: any, index: number) => ({
      id: track.id,
      title: track.title,
      artist: track.artist?.name || 'Unknown Artist',
      artistId: track.artist?.id,
      artistImage: track.artist?.picture_medium,
      artwork: track.album?.cover_big || track.album?.cover_medium,
      duration: formatDuration(track.duration),
      preview: track.preview,
      plays: formatPlays(Math.floor(800000 - (index * 30000) + Math.random() * 20000)),
      likes: formatPlays(Math.floor(50000 - (index * 2000) + Math.random() * 1000)),
      genre: track.genre || 'Electronic',
    }));

    // Format recent remixes (from Audius indie artists)
    const recentRemixes = audiusTrending.slice(0, 15).map((track: any, index: number) => ({
      id: track.id,
      title: track.title,
      artist: track.user?.name || 'Unknown Artist',
      artistId: track.user?.id,
      artistImage: track.user?.profile_picture?.['480x480'] || track.user?.profile_picture?.medium,
      artwork: track.artwork?.['480x480'] || track.artwork?.['1000x1000'] || track.artwork?.medium,
      duration: formatDuration(Math.floor(track.duration || 180)),
      preview: track.stream_url || `https://discoveryprovider.audius.co/v1/tracks/${track.id}/stream`,
      plays: formatPlays(track.play_count || Math.floor(100000 - (index * 3000) + Math.random() * 2000)),
      likes: formatPlays(track.favorite_count || Math.floor(5000 - (index * 200) + Math.random() * 100)),
      genre: track.genre || 'Indie',
      isAudius: true,
    }));

    // Hot right now - mix of chart toppers
    const hotRightNow = [...chartTracks.slice(0, 10), ...afrobeatsTracks.slice(0, 5)].map((track: any, index: number) => ({
      id: track.id,
      title: track.title,
      artist: track.artist?.name || 'Unknown Artist',
      artistId: track.artist?.id,
      artistImage: track.artist?.picture_medium,
      artwork: track.album?.cover_big || track.album?.cover_medium,
      duration: formatDuration(track.duration),
      preview: track.preview,
      plays: formatPlays(Math.floor(3000000 - (index * 100000) + Math.random() * 50000)),
      likes: formatPlays(Math.floor(200000 - (index * 8000) + Math.random() * 5000)),
      genre: track.genre || 'Trending',
      isHot: true,
    }));

    const response = {
      success: true,
      data: {
        trendingSongs,
        newSongs,
        trendingRemixes,
        recentRemixes,
        hotRightNow,
      },
      timestamp: new Date().toISOString(),
    };

    console.log(`Dashboard music response: ${trendingSongs.length} trending, ${newSongs.length} new, ${trendingRemixes.length} remix trends, ${recentRemixes.length} recent remixes`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Dashboard music error:', errorMessage);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      data: {
        trendingSongs: [],
        newSongs: [],
        trendingRemixes: [],
        recentRemixes: [],
        hotRightNow: [],
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
