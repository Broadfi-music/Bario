import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeezerArtist {
  id: number;
  name: string;
  picture_medium: string;
  picture_big: string;
  nb_fan: number;
}

interface DeezerTrack {
  id: number;
  title: string;
  duration: number;
  preview: string;
  artist: DeezerArtist;
  album: {
    id: number;
    title: string;
    cover_medium: string;
    cover_big: string;
  };
}

async function fetchDeezerNewArtists(): Promise<any[]> {
  try {
    // Get emerging artists from editorial playlists
    const response = await fetch('https://api.deezer.com/editorial/0/releases?limit=50');
    if (!response.ok) throw new Error('Deezer editorial failed');
    const data = await response.json();
    
    const artists: any[] = [];
    const seenIds = new Set<number>();
    
    if (data.data) {
      for (const album of data.data) {
        if (album.artist && !seenIds.has(album.artist.id)) {
          seenIds.add(album.artist.id);
          try {
            // Get full artist info
            const artistRes = await fetch(`https://api.deezer.com/artist/${album.artist.id}`);
            const artistData = await artistRes.json();
            
            // Get artist's top track
            const topTrackRes = await fetch(`https://api.deezer.com/artist/${album.artist.id}/top?limit=1`);
            const topTrackData = await topTrackRes.json();
            
            artists.push({
              id: artistData.id,
              name: artistData.name,
              avatar: artistData.picture_big || artistData.picture_medium,
              followers: artistData.nb_fan || Math.floor(Math.random() * 500000),
              genre: album.genre_id ? getGenreName(album.genre_id) : 'Various',
              tagline: `Emerging artist from ${artistData.link ? 'Deezer' : 'the underground'}`,
              monthlyListeners: formatListeners(artistData.nb_fan || Math.floor(Math.random() * 2000000)),
              deezerId: artistData.id,
              topTrack: topTrackData.data?.[0] ? {
                id: topTrackData.data[0].id,
                title: topTrackData.data[0].title,
                preview: topTrackData.data[0].preview,
                artwork: topTrackData.data[0].album?.cover_medium,
              } : null,
            });
          } catch (e) {
            console.error('Artist detail error:', e);
          }
        }
        if (artists.length >= 30) break;
      }
    }
    return artists;
  } catch (error) {
    console.error('Deezer new artists error:', error);
    return [];
  }
}

async function fetchAudiusNewArtists(): Promise<any[]> {
  try {
    const response = await fetch('https://discoveryprovider.audius.co/v1/tracks/trending?limit=50');
    if (!response.ok) throw new Error('Audius trending failed');
    const data = await response.json();
    
    const artists: any[] = [];
    const seenIds = new Set<string>();
    
    if (data.data) {
      for (const track of data.data) {
        if (track.user && !seenIds.has(track.user.id)) {
          seenIds.add(track.user.id);
          artists.push({
            id: `audius_${track.user.id}`,
            name: track.user.name,
            avatar: track.user.profile_picture?.['480x480'] || track.user.profile_picture?.medium,
            followers: track.user.follower_count || Math.floor(Math.random() * 50000),
            genre: track.genre || 'Indie',
            tagline: track.user.bio?.slice(0, 80) || 'Independent artist on Audius',
            monthlyListeners: formatListeners(track.user.follower_count * 10 || Math.floor(Math.random() * 500000)),
            isAudius: true,
            topTrack: {
              id: track.id,
              title: track.title,
              preview: `https://discoveryprovider.audius.co/v1/tracks/${track.id}/stream`,
              artwork: track.artwork?.['480x480'] || track.artwork?.medium,
            },
          });
        }
        if (artists.length >= 20) break;
      }
    }
    return artists;
  } catch (error) {
    console.error('Audius new artists error:', error);
    return [];
  }
}

async function fetchDeezerTop50NewReleases(): Promise<any[]> {
  try {
    // Get newest releases
    const response = await fetch('https://api.deezer.com/editorial/0/releases?limit=60');
    if (!response.ok) throw new Error('Deezer releases failed');
    const data = await response.json();
    
    const tracks: any[] = [];
    
    if (data.data) {
      for (const album of data.data.slice(0, 30)) {
        try {
          const albumRes = await fetch(`https://api.deezer.com/album/${album.id}/tracks?limit=3`);
          const albumData = await albumRes.json();
          if (albumData.data) {
            for (const track of albumData.data) {
              tracks.push({
                id: track.id,
                title: track.title,
                artist: album.artist?.name || track.artist?.name || 'Unknown',
                artistId: album.artist?.id || track.artist?.id,
                artistImage: album.artist?.picture_medium,
                artwork: album.cover_big || album.cover_medium,
                duration: formatDuration(track.duration),
                preview: track.preview,
                listeners: Math.floor(100000 + Math.random() * 900000),
                isNewRelease: true,
              });
            }
          }
        } catch (e) {
          console.error('Album tracks error:', e);
        }
        if (tracks.length >= 50) break;
      }
    }
    
    // Sort by random "listeners" and add ranks
    return tracks.slice(0, 50).map((track, index) => ({
      ...track,
      rank: index + 1,
      change: Math.floor(Math.random() * 10) - 3,
      trend: Math.random() > 0.4 ? 'up' : Math.random() > 0.5 ? 'down' : 'same',
    }));
  } catch (error) {
    console.error('Deezer top 50 error:', error);
    return [];
  }
}

async function fetchHotRightNow(): Promise<any[]> {
  try {
    const response = await fetch('https://api.deezer.com/chart/0/tracks?limit=20');
    if (!response.ok) throw new Error('Deezer chart failed');
    const data = await response.json();
    
    return (data.data || []).map((track: DeezerTrack, index: number) => ({
      id: track.id,
      title: track.title,
      artist: track.artist.name,
      artistId: track.artist.id,
      artistImage: track.artist.picture_medium,
      artwork: track.album.cover_big || track.album.cover_medium,
      duration: formatDuration(track.duration),
      preview: track.preview,
      plays: formatListeners(Math.floor(3000000 - (index * 100000) + Math.random() * 50000)),
      isHot: true,
    }));
  } catch (error) {
    console.error('Deezer hot error:', error);
    return [];
  }
}

function getGenreName(genreId: number): string {
  const genres: Record<number, string> = {
    0: 'All',
    132: 'Pop',
    116: 'Hip Hop',
    152: 'Rock',
    113: 'Dance',
    165: 'R&B',
    85: 'Alternative',
    106: 'Electronic',
    129: 'Jazz',
    84: 'Country',
    119: 'Afrobeat',
    169: 'Soul & Funk',
    98: 'Classical',
    173: 'Films/Games',
    144: 'Reggae',
    75: 'World',
  };
  return genres[genreId] || 'Various';
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatListeners(num: number): string {
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
    const action = url.searchParams.get('action') || 'all';

    console.log(`Megashuffle request: action=${action}`);

    if (action === 'shuffle') {
      // Get random artist for shuffle
      const [deezerArtists, audiusArtists] = await Promise.all([
        fetchDeezerNewArtists(),
        fetchAudiusNewArtists(),
      ]);
      
      const allArtists = [...deezerArtists, ...audiusArtists];
      const randomArtist = allArtists[Math.floor(Math.random() * allArtists.length)];
      
      return new Response(JSON.stringify({
        success: true,
        artist: randomArtist,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all data
    const [deezerArtists, audiusArtists, top50, hotNow] = await Promise.all([
      fetchDeezerNewArtists(),
      fetchAudiusNewArtists(),
      fetchDeezerTop50NewReleases(),
      fetchHotRightNow(),
    ]);

    // Combine artists
    const allArtists = [...deezerArtists, ...audiusArtists].slice(0, 30);

    // Get trending songs from top of the combined list
    const trendingSongs = hotNow.slice(0, 15);

    const response = {
      success: true,
      data: {
        artists: allArtists,
        trendingSongs,
        top50Songs: top50,
        hotRightNow: hotNow,
      },
      timestamp: new Date().toISOString(),
    };

    console.log(`Megashuffle response: ${allArtists.length} artists, ${trendingSongs.length} trending, ${top50.length} top 50`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Megashuffle error:', errorMessage);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      data: {
        artists: [],
        trendingSongs: [],
        top50Songs: [],
        hotRightNow: [],
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
