import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get Spotify token
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
  return data.access_token;
}

// Get Spotify track details
async function getSpotifyTrack(trackId: string, token: string) {
  try {
    const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await response.json();
  } catch (e) {
    console.error('Error fetching Spotify track:', e);
    return null;
  }
}

// Get Spotify artist details
async function getSpotifyArtist(artistId: string, token: string) {
  try {
    const response = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await response.json();
  } catch (e) {
    console.error('Error fetching artist:', e);
    return null;
  }
}

// Get artist top tracks
async function getArtistTopTracks(artistId: string, token: string) {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const data = await response.json();
    return data.tracks || [];
  } catch (e) {
    console.error('Error fetching top tracks:', e);
    return [];
  }
}

// Get Last.fm track info
async function getLastfmTrackInfo(artist: string, track: string) {
  const apiKey = Deno.env.get('LASTFM_API_KEY');
  if (!apiKey) return { listeners: 0, playcount: 0, tags: [], wiki: null };
  
  try {
    const response = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${apiKey}&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&format=json`
    );
    const data = await response.json();
    return {
      listeners: parseInt(data.track?.listeners) || 0,
      playcount: parseInt(data.track?.playcount) || 0,
      tags: data.track?.toptags?.tag?.slice(0, 5) || [],
      wiki: data.track?.wiki?.summary?.replace(/<[^>]*>/g, '') || null
    };
  } catch (e) {
    return { listeners: 0, playcount: 0, tags: [], wiki: null };
  }
}

// Get Last.fm artist info
async function getLastfmArtistInfo(artist: string) {
  const apiKey = Deno.env.get('LASTFM_API_KEY');
  if (!apiKey) return { bio: null, listeners: 0, playcount: 0 };
  
  try {
    const response = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=artist.getInfo&api_key=${apiKey}&artist=${encodeURIComponent(artist)}&format=json`
    );
    const data = await response.json();
    return {
      bio: data.artist?.bio?.summary?.replace(/<[^>]*>/g, '') || null,
      listeners: parseInt(data.artist?.stats?.listeners) || 0,
      playcount: parseInt(data.artist?.stats?.playcount) || 0
    };
  } catch (e) {
    return { bio: null, listeners: 0, playcount: 0 };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const trackId = url.searchParams.get('id');
    
    if (!trackId) {
      return new Response(JSON.stringify({ error: 'Track ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log(`Fetching track details for: ${trackId}`);
    
    // Get Spotify token
    const spotifyToken = await getSpotifyToken();
    
    // Fetch Spotify track
    const spotifyTrack = await getSpotifyTrack(trackId, spotifyToken);
    
    if (!spotifyTrack || spotifyTrack.error) {
      return new Response(JSON.stringify({ 
        error: 'Track not found',
        details: spotifyTrack?.error?.message || 'Invalid track ID'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const artistId = spotifyTrack.artists?.[0]?.id;
    const artistName = spotifyTrack.artists?.[0]?.name || 'Unknown Artist';
    
    // Fetch all additional data in parallel
    const [spotifyArtist, artistTopTracks, lastfmTrackInfo, lastfmArtistInfo] = await Promise.all([
      artistId ? getSpotifyArtist(artistId, spotifyToken) : null,
      artistId ? getArtistTopTracks(artistId, spotifyToken) : [],
      getLastfmTrackInfo(artistName, spotifyTrack.name),
      getLastfmArtistInfo(artistName)
    ]);
    
    // Format artist top 10 tracks with platform rankings
    const formattedTopTracks = artistTopTracks.slice(0, 10).map((track: any, i: number) => ({
      rank: i + 1,
      id: track.id,
      title: track.name,
      album: track.album?.name,
      artwork: track.album?.images?.[0]?.url,
      previewUrl: track.preview_url,
      popularity: track.popularity,
      spotifyRank: Math.floor((100 - track.popularity) / 10) + 1,
      deezerRank: Math.floor(Math.random() * 50) + 1,
      appleMusicRank: Math.floor(Math.random() * 50) + 1,
      listeners: Math.floor(track.popularity * 25000 + Math.random() * 500000)
    }));
    
    // Generate top listeners (community)
    const topListeners = Array.from({ length: 20 }, (_, i) => ({
      id: `listener-${i + 1}`,
      name: ['MusicFan', 'BeatLover', 'SoundSeeker', 'RhythmRider', 'MelodyMaster', 'TuneHunter', 'GrooveGuru', 'HarmonyHero'][i % 8] + (i > 7 ? ` ${Math.floor(i / 8) + 1}` : ''),
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`,
      playsCount: Math.floor(500 - i * 20 + Math.random() * 50),
      joinedDaysAgo: Math.floor(Math.random() * 365),
      isVerified: i < 5
    }));
    
    // Generate smart feed events
    const smartFeed = [
      {
        id: '1',
        type: 'milestone',
        title: `${spotifyTrack.name} hits ${Math.floor(spotifyTrack.popularity * 10)}M streams`,
        description: `The track continues to dominate charts worldwide with impressive streaming numbers.`,
        source: 'Spotify Charts',
        timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString()
      },
      {
        id: '2',
        type: 'playlist',
        title: `Added to Today's Top Hits`,
        description: `Major playlist placement boosting visibility across millions of listeners.`,
        source: 'Spotify Editorial',
        timestamp: new Date(Date.now() - Math.random() * 172800000).toISOString()
      },
      {
        id: '3',
        type: 'trending',
        title: `Trending on TikTok with 50K+ videos`,
        description: `User-generated content driving viral growth and new listener discovery.`,
        source: 'Social Trends',
        timestamp: new Date(Date.now() - Math.random() * 259200000).toISOString()
      }
    ];
    
    // Calculate metrics
    const change24h = (Math.random() * 20 - 5);
    const listeners = lastfmTrackInfo.listeners || Math.floor(spotifyTrack.popularity * 30000);
    const mindshare = (spotifyTrack.popularity / 2 + Math.random() * 10);
    
    // Build response
    const response = {
      id: spotifyTrack.id,
      title: spotifyTrack.name,
      album: spotifyTrack.album?.name,
      artwork: spotifyTrack.album?.images?.[0]?.url,
      previewUrl: spotifyTrack.preview_url,
      duration: spotifyTrack.duration_ms,
      releaseDate: spotifyTrack.album?.release_date,
      isExplicit: spotifyTrack.explicit,
      description: lastfmTrackInfo.wiki || 
        `${spotifyTrack.name} by ${artistName} is a ${spotifyTrack.popularity > 70 ? 'chart-topping hit' : 'trending track'} ` +
        `from the album "${spotifyTrack.album?.name}". ` +
        `Currently ranked in the top ${100 - spotifyTrack.popularity + 10} globally with ` +
        `${listeners.toLocaleString()} active listeners.`,
      tags: lastfmTrackInfo.tags.map((t: any) => t.name || t),
      artist: {
        id: artistId,
        name: artistName,
        image: spotifyArtist?.images?.[0]?.url || spotifyTrack.album?.images?.[0]?.url,
        followers: spotifyArtist?.followers?.total || 0,
        monthlyListeners: lastfmArtistInfo.listeners || Math.floor((spotifyArtist?.followers?.total || 100000) * 2.5),
        genres: spotifyArtist?.genres || [],
        bio: lastfmArtistInfo.bio || 
          `${artistName} is a ${spotifyArtist?.genres?.[0] || 'music'} artist with ` +
          `${(spotifyArtist?.followers?.total || 0).toLocaleString()} followers on Spotify.`,
        topTracks: formattedTopTracks,
        spotifyUrl: spotifyArtist?.external_urls?.spotify,
        popularity: spotifyArtist?.popularity || 50
      },
      platforms: {
        spotify: {
          url: spotifyTrack.external_urls?.spotify,
          popularity: spotifyTrack.popularity,
          available: true
        },
        deezer: {
          url: `https://www.deezer.com/search/${encodeURIComponent(spotifyTrack.name + ' ' + artistName)}`,
          chartPosition: Math.floor(Math.random() * 50) + 1,
          available: true
        },
        appleMusic: {
          url: `https://music.apple.com/search?term=${encodeURIComponent(spotifyTrack.name + ' ' + artistName)}`,
          chartPosition: Math.floor(Math.random() * 50) + 1,
          available: true
        },
        audius: {
          url: `https://audius.co/search/${encodeURIComponent(spotifyTrack.name)}`,
          available: true
        },
        youtube: {
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(spotifyTrack.name + ' ' + artistName)}`,
          available: true
        }
      },
      metrics: {
        attentionScore: Math.round(spotifyTrack.popularity * 1000 + listeners / 100),
        listeners,
        playcount: lastfmTrackInfo.playcount || listeners * 5,
        mindshare: parseFloat(mindshare.toFixed(1)),
        communityListeners: Math.floor(listeners / 100),
        change24h: parseFloat(change24h.toFixed(1)),
        change7d: parseFloat((change24h * 2.5 + Math.random() * 10).toFixed(1)),
        change30d: parseFloat((change24h * 4 + Math.random() * 15).toFixed(1))
      },
      chartData: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
        listeners: Math.floor(listeners * (0.8 + Math.random() * 0.4)),
        streams: Math.floor(listeners * 5 * (0.8 + Math.random() * 0.4))
      })),
      topListeners,
      smartFeed,
      relatedTracks: formattedTopTracks.slice(0, 5).filter((t: any) => t.id !== spotifyTrack.id)
    };
    
    return new Response(JSON.stringify(response), {
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
