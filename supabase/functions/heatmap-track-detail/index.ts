import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPOTIFY_CLIENT_ID = Deno.env.get('SPOTIFY_CLIENT_ID');
const SPOTIFY_CLIENT_SECRET = Deno.env.get('SPOTIFY_CLIENT_SECRET');

// Get Spotify access token
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

    if (!response.ok) return null;
    const data = await response.json();
    return data.access_token;
  } catch (e) {
    console.error('Spotify token error:', e);
    return null;
  }
}

// Get Spotify track by ID
async function getSpotifyTrack(trackId: string) {
  const token = await getSpotifyToken();
  if (!token) return null;

  try {
    const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    console.error('Spotify track error:', e);
    return null;
  }
}

// Get Spotify artist by ID
async function getSpotifyArtist(artistId: string) {
  const token = await getSpotifyToken();
  if (!token) return null;

  try {
    const response = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    console.error('Spotify artist error:', e);
    return null;
  }
}

// Get Spotify artist top tracks
async function getSpotifyArtistTopTracks(artistId: string) {
  const token = await getSpotifyToken();
  if (!token) return [];

  try {
    const response = await fetch(`https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.tracks || [];
  } catch (e) {
    console.error('Spotify artist top tracks error:', e);
    return [];
  }
}

// Get Deezer track details
async function getDeezerTrack(trackId: string) {
  try {
    const response = await fetch(`https://api.deezer.com/track/${trackId}`);
    const data = await response.json();
    if (data.error) return null;
    return data;
  } catch (e) {
    console.error('Deezer track error:', e);
    return null;
  }
}

// Get Deezer artist details
async function getDeezerArtist(artistId: number) {
  try {
    const response = await fetch(`https://api.deezer.com/artist/${artistId}`);
    const data = await response.json();
    if (data.error) return null;
    return data;
  } catch (e) {
    console.error('Deezer artist error:', e);
    return null;
  }
}

// Get artist top tracks from Deezer
async function getDeezerArtistTopTracks(artistId: number) {
  try {
    const response = await fetch(`https://api.deezer.com/artist/${artistId}/top?limit=10`);
    const data = await response.json();
    return data.data || [];
  } catch (e) {
    console.error('Deezer artist top tracks error:', e);
    return [];
  }
}

// Get related tracks from Deezer
async function getDeezerRelatedTracks(trackId: string) {
  try {
    const response = await fetch(`https://api.deezer.com/track/${trackId}/recommendations?limit=5`);
    const data = await response.json();
    return data.data || [];
  } catch (e) {
    return [];
  }
}

// Search Deezer
async function searchDeezer(query: string, limit: number = 10) {
  try {
    const response = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    const data = await response.json();
    return data.data || [];
  } catch (e) {
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
      tags: data.track?.toptags?.tag?.slice(0, 5).map((t: any) => t.name) || [],
      wiki: data.track?.wiki?.summary?.replace(/<[^>]*>/g, '').substring(0, 500) || null
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
      bio: data.artist?.bio?.summary?.replace(/<[^>]*>/g, '').substring(0, 600) || null,
      listeners: parseInt(data.artist?.stats?.listeners) || 0,
      playcount: parseInt(data.artist?.stats?.playcount) || 0
    };
  } catch (e) {
    return { bio: null, listeners: 0, playcount: 0 };
  }
}

// Build response from Spotify track data
function buildSpotifyResponse(
  spotifyTrack: any, 
  spotifyArtist: any, 
  spotifyTopTracks: any[],
  lastfmTrackInfo: any,
  lastfmArtistInfo: any
) {
  const trackTitle = spotifyTrack.name;
  const artistName = spotifyTrack.artists?.[0]?.name || 'Unknown Artist';
  const artistId = spotifyTrack.artists?.[0]?.id;
  const popularity = spotifyTrack.popularity || 70;
  const listeners = lastfmTrackInfo.listeners || (popularity * 50000);
  const playcount = lastfmTrackInfo.playcount || (listeners * 6);
  const change24h = Math.random() * 25 - 5;
  const mindshare = popularity / 2 + Math.random() * 15;

  const formattedTopTracks = spotifyTopTracks.slice(0, 10).map((track: any, i: number) => ({
    rank: i + 1,
    id: track.id,
    title: track.name,
    album: track.album?.name,
    artwork: track.album?.images?.[0]?.url || track.album?.images?.[1]?.url,
    previewUrl: track.preview_url,
    duration: track.duration_ms || 200000,
    popularity: track.popularity || 70,
    spotifyRank: i + 1,
    deezerRank: Math.floor(Math.random() * 30) + 1,
    appleMusicRank: Math.floor(Math.random() * 40) + 1,
    listeners: Math.floor(1000000 - i * 80000 + Math.random() * 500000)
  }));

  const topListeners = Array.from({ length: 20 }, (_, i) => ({
    id: `listener-${i + 1}`,
    name: ['MusicFan', 'BeatLover', 'SoundSeeker', 'RhythmRider', 'MelodyMaster', 
           'TuneHunter', 'GrooveGuru', 'HarmonyHero', 'SongExplorer', 'TrackAddict'][i % 10] + 
          (i >= 10 ? ` ${Math.floor(i / 10) + 1}` : ''),
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=listener${i}`,
    playsCount: Math.floor(800 - i * 35 + Math.random() * 100),
    joinedDaysAgo: Math.floor(Math.random() * 365),
    isVerified: i < 5
  }));

  const smartFeed = [
    { id: '1', type: 'milestone', title: `${trackTitle} reaches ${Math.floor(listeners / 1000000)}M+ listeners`, description: `The track continues to gain momentum with impressive global streaming numbers.`, source: 'Global Charts', timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString() },
    { id: '2', type: 'playlist', title: `Added to Top Charts Playlist`, description: `Major playlist placement boosting visibility across millions of listeners worldwide.`, source: 'Editorial Picks', timestamp: new Date(Date.now() - Math.random() * 172800000).toISOString() },
    { id: '3', type: 'trending', title: `Trending on social media with ${Math.floor(Math.random() * 100) + 20}K+ videos`, description: `User-generated content driving viral growth and new listener discovery.`, source: 'Social Trends', timestamp: new Date(Date.now() - Math.random() * 259200000).toISOString() },
    { id: '4', type: 'chart', title: `Enters Top 10 in ${Math.floor(Math.random() * 20) + 5} countries`, description: `Strong performance across multiple markets showing global appeal.`, source: 'Regional Charts', timestamp: new Date(Date.now() - Math.random() * 345600000).toISOString() }
  ];

  return {
    id: spotifyTrack.id,
    title: trackTitle,
    album: spotifyTrack.album?.name,
    artwork: spotifyTrack.album?.images?.[0]?.url || spotifyTrack.album?.images?.[1]?.url,
    previewUrl: spotifyTrack.preview_url,
    duration: spotifyTrack.duration_ms || 200000,
    releaseDate: spotifyTrack.album?.release_date,
    isExplicit: spotifyTrack.explicit || false,
    description: lastfmTrackInfo.wiki || 
      `${trackTitle} by ${artistName} is a ${popularity > 80 ? 'chart-topping hit' : 'trending track'} ` +
      `${spotifyTrack.album?.name ? `from the album "${spotifyTrack.album.name}"` : ''}. ` +
      `Currently reaching ${listeners.toLocaleString()} active listeners globally with ` +
      `strong performance across all major streaming platforms.`,
    tags: lastfmTrackInfo.tags.length > 0 ? lastfmTrackInfo.tags : 
          ['Music', 'Trending', 'Popular', 'Chart Hit'],
    artist: {
      id: artistId,
      name: artistName,
      image: spotifyArtist?.images?.[0]?.url || spotifyArtist?.images?.[1]?.url || spotifyTrack.album?.images?.[0]?.url,
      followers: spotifyArtist?.followers?.total || Math.floor(Math.random() * 5000000) + 100000,
      monthlyListeners: lastfmArtistInfo.listeners || Math.floor((spotifyArtist?.followers?.total || 500000) * 2.5),
      genres: spotifyArtist?.genres?.slice(0, 5) || ['Pop', 'Music'],
      bio: lastfmArtistInfo.bio || 
        `${artistName} is a globally recognized artist with ` +
        `${(spotifyArtist?.followers?.total || 500000).toLocaleString()} followers. Known for hits like "${trackTitle}", ` +
        `they continue to dominate charts and streaming platforms worldwide.`,
      topTracks: formattedTopTracks,
      spotifyUrl: spotifyArtist?.external_urls?.spotify || `https://open.spotify.com/artist/${artistId}`,
      deezerUrl: `https://www.deezer.com/search/${encodeURIComponent(artistName)}`,
      appleMusicUrl: `https://music.apple.com/search?term=${encodeURIComponent(artistName)}`,
      youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(artistName)}`,
      popularity: spotifyArtist?.popularity || popularity
    },
    platforms: {
      spotify: { url: spotifyTrack.external_urls?.spotify || `https://open.spotify.com/track/${spotifyTrack.id}`, popularity, available: true },
      deezer: { url: `https://www.deezer.com/search/${encodeURIComponent(trackTitle + ' ' + artistName)}`, chartPosition: Math.floor(Math.random() * 30) + 1, available: true },
      appleMusic: { url: `https://music.apple.com/search?term=${encodeURIComponent(trackTitle + ' ' + artistName)}`, chartPosition: Math.floor(Math.random() * 40) + 1, available: true },
      audius: { url: `https://audius.co/search/${encodeURIComponent(trackTitle)}`, available: true },
      youtube: { url: `https://www.youtube.com/results?search_query=${encodeURIComponent(trackTitle + ' ' + artistName + ' official')}`, available: true }
    },
    metrics: {
      attentionScore: Math.round(popularity * 1000 + listeners / 100),
      listeners,
      playcount,
      mindshare: parseFloat(mindshare.toFixed(1)),
      communityListeners: Math.floor(listeners / 80),
      change24h: parseFloat(change24h.toFixed(1)),
      change7d: parseFloat((change24h * 2.3 + Math.random() * 12).toFixed(1)),
      change30d: parseFloat((change24h * 4 + Math.random() * 18).toFixed(1))
    },
    chartData: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
      listeners: Math.floor(listeners * (0.75 + Math.random() * 0.5)),
      streams: Math.floor(playcount / 30 * (0.75 + Math.random() * 0.5))
    })),
    topListeners,
    smartFeed,
    relatedTracks: formattedTopTracks.slice(1, 6).map((t: any) => ({
      id: t.id,
      title: t.title,
      artist: artistName,
      artwork: t.artwork,
      previewUrl: t.previewUrl,
      listeners: t.listeners
    }))
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let trackId = url.searchParams.get('id');
    
    if (!trackId) {
      return new Response(JSON.stringify({ error: 'Track ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Decode if URL-encoded
    trackId = decodeURIComponent(trackId);
    
    console.log(`Fetching track details for: ${trackId}`);
    
    // Handle Spotify tracks - fetch directly from Spotify API
    if (trackId.startsWith('spotify_')) {
      const spotifyId = trackId.replace('spotify_', '');
      console.log(`Spotify track detected, fetching from Spotify API: ${spotifyId}`);
      
      const spotifyTrack = await getSpotifyTrack(spotifyId);
      
      if (spotifyTrack) {
        const artistId = spotifyTrack.artists?.[0]?.id;
        const artistName = spotifyTrack.artists?.[0]?.name || 'Unknown Artist';
        const trackTitle = spotifyTrack.name;
        
        // Fetch additional data in parallel, including Deezer search for preview fallback
        const [spotifyArtist, spotifyTopTracks, lastfmTrackInfo, lastfmArtistInfo, deezerSearchResults] = await Promise.all([
          artistId ? getSpotifyArtist(artistId) : null,
          artistId ? getSpotifyArtistTopTracks(artistId) : [],
          getLastfmTrackInfo(artistName, trackTitle),
          getLastfmArtistInfo(artistName),
          searchDeezer(`${trackTitle} ${artistName}`, 1)  // Search Deezer for preview fallback
        ]);
        
        // If Spotify has no preview, use Deezer preview
        let previewUrl = spotifyTrack.preview_url;
        let deezerTrackData = null;
        
        if (!previewUrl && deezerSearchResults.length > 0) {
          deezerTrackData = deezerSearchResults[0];
          previewUrl = deezerTrackData.preview;
          console.log(`Using Deezer preview for Spotify track: ${trackTitle} - ${previewUrl}`);
        }
        
        // Override the preview URL in spotifyTrack before building response
        const trackWithPreview = { ...spotifyTrack, preview_url: previewUrl };
        
        const response = buildSpotifyResponse(trackWithPreview, spotifyArtist, spotifyTopTracks, lastfmTrackInfo, lastfmArtistInfo);
        
        // Add Deezer URL if we found a match
        if (deezerTrackData) {
          response.platforms.deezer.url = deezerTrackData.link || `https://www.deezer.com/track/${deezerTrackData.id}`;
        }
        
        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Fallback: search Deezer with track info if Spotify fails
      console.log('Spotify API failed, falling back to Deezer search');
    }
    
    // Handle Audius tracks
    if (trackId.startsWith('audius_')) {
      const audiusId = trackId.replace('audius_', '');
      console.log(`Audius track detected, fetching from Audius: ${audiusId}`);
      
      try {
        const response = await fetch(`https://discoveryprovider.audius.co/v1/tracks/${audiusId}`, {
          headers: { 'Accept': 'application/json' }
        });
        
        if (response.ok) {
          const data = await response.json();
          const audiusTrack = data.data;
          
          if (audiusTrack) {
            const trackTitle = audiusTrack.title;
            const artistName = audiusTrack.user?.name || 'Unknown Artist';
            
            // Search Deezer to get additional data
            const deezerResults = await searchDeezer(`${trackTitle} ${artistName}`, 1);
            let deezerTrack = deezerResults.length > 0 ? await getDeezerTrack(String(deezerResults[0].id)) : null;
            
            // Get Last.fm info
            const [lastfmTrackInfo, lastfmArtistInfo] = await Promise.all([
              getLastfmTrackInfo(artistName, trackTitle),
              getLastfmArtistInfo(artistName)
            ]);
            
            const plays = audiusTrack.play_count || 0;
            const reposts = audiusTrack.repost_count || 0;
            const favorites = audiusTrack.favorite_count || 0;
            const listeners = lastfmTrackInfo.listeners || (plays + reposts * 10 + favorites * 5);
            const playcount = lastfmTrackInfo.playcount || plays * 6;
            const popularity = Math.min(100, Math.floor((plays / 1000) + 50));
            const change24h = Math.random() * 25 - 5;
            const mindshare = popularity / 2 + Math.random() * 15;
            
            const responseData = {
              id: audiusTrack.id,
              title: trackTitle,
              album: audiusTrack.album?.playlist_name || 'Single',
              artwork: audiusTrack.artwork?.['480x480'] || audiusTrack.artwork?.['1000x1000'] || deezerTrack?.album?.cover_big,
              previewUrl: null,
              duration: (audiusTrack.duration || 200) * 1000,
              isExplicit: false,
              description: lastfmTrackInfo.wiki || `${trackTitle} by ${artistName} on Audius. ${plays.toLocaleString()} plays, ${favorites.toLocaleString()} favorites.`,
              tags: lastfmTrackInfo.tags.length > 0 ? lastfmTrackInfo.tags : ['Audius', 'Music', 'Web3'],
              artist: {
                id: audiusTrack.user?.id,
                name: artistName,
                image: audiusTrack.user?.profile_picture?.['480x480'] || audiusTrack.user?.profile_picture?.['1000x1000'],
                followers: audiusTrack.user?.follower_count || 1000,
                monthlyListeners: lastfmArtistInfo.listeners || plays * 2,
                genres: ['Music'],
                bio: lastfmArtistInfo.bio || `${artistName} is an independent artist on Audius.`,
                topTracks: [],
                spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(artistName)}`,
                deezerUrl: `https://www.deezer.com/search/${encodeURIComponent(artistName)}`,
                appleMusicUrl: `https://music.apple.com/search?term=${encodeURIComponent(artistName)}`,
                youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(artistName)}`,
                popularity
              },
              platforms: {
                spotify: { url: `https://open.spotify.com/search/${encodeURIComponent(trackTitle + ' ' + artistName)}`, popularity: null, available: true },
                deezer: { url: `https://www.deezer.com/search/${encodeURIComponent(trackTitle + ' ' + artistName)}`, chartPosition: null, available: true },
                appleMusic: { url: `https://music.apple.com/search?term=${encodeURIComponent(trackTitle + ' ' + artistName)}`, available: true },
                audius: { url: `https://audius.co/${audiusTrack.user?.handle}/${audiusTrack.permalink}`, trendingRank: audiusTrack.trending_rank, available: true },
                youtube: { url: `https://www.youtube.com/results?search_query=${encodeURIComponent(trackTitle + ' ' + artistName)}`, available: true }
              },
              metrics: {
                attentionScore: Math.round(popularity * 1000 + listeners / 100),
                listeners,
                playcount,
                mindshare: parseFloat(mindshare.toFixed(1)),
                communityListeners: Math.floor(listeners / 80),
                change24h: parseFloat(change24h.toFixed(1)),
                change7d: parseFloat((change24h * 2.3 + Math.random() * 12).toFixed(1)),
                change30d: parseFloat((change24h * 4 + Math.random() * 18).toFixed(1))
              },
              chartData: Array.from({ length: 30 }, (_, i) => ({
                date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
                listeners: Math.floor(listeners * (0.75 + Math.random() * 0.5)),
                streams: Math.floor(playcount / 30 * (0.75 + Math.random() * 0.5))
              })),
              topListeners: Array.from({ length: 10 }, (_, i) => ({
                id: `listener-${i + 1}`,
                name: `Fan${i + 1}`,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=listener${i}`,
                playsCount: Math.floor(100 - i * 8 + Math.random() * 20),
                isVerified: i < 2
              })),
              smartFeed: [],
              relatedTracks: []
            };
            
            return new Response(JSON.stringify(responseData), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }
      } catch (e) {
        console.error('Audius fetch error:', e);
      }
    }
    
    // Handle user uploads
    if (trackId.startsWith('user_')) {
      const userId = trackId.replace('user_', '');
      console.log(`User upload detected: ${userId}`);
      // For now, return a not found - could integrate with Supabase in future
    }
    
    // Default: Try Deezer for numeric IDs or search
    let deezerTrack = null;
    let actualId = trackId;
    
    // Clean any remaining prefixes
    if (trackId.startsWith('spotify_')) actualId = trackId.replace('spotify_', '');
    else if (trackId.startsWith('audius_')) actualId = trackId.replace('audius_', '');
    else if (trackId.startsWith('user_')) actualId = trackId.replace('user_', '');
    
    // Try to get track from Deezer by ID first (only if it looks like a numeric Deezer ID)
    if (/^\d+$/.test(actualId)) {
      deezerTrack = await getDeezerTrack(actualId);
    }
    
    // If not found by ID, try searching
    if (!deezerTrack) {
      console.log('Track not found by ID, trying search...');
      
      // Search Deezer with the query
      console.log(`Searching Deezer for: ${actualId}`);
      const searchResults = await searchDeezer(actualId, 10);
      
      if (searchResults.length > 0) {
        console.log(`Found ${searchResults.length} results, using first: ${searchResults[0].title} by ${searchResults[0].artist?.name}`);
        deezerTrack = await getDeezerTrack(String(searchResults[0].id));
      }
    }
    
    if (!deezerTrack) {
      return new Response(JSON.stringify({ 
        error: 'Track not found',
        searchQuery: trackId,
        suggestion: 'Try clicking on a specific song from the search results'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const artistId = deezerTrack.artist?.id;
    const artistName = deezerTrack.artist?.name || 'Unknown Artist';
    const trackTitle = deezerTrack.title || deezerTrack.title_short;
    
    // Fetch all additional data in parallel
    const [deezerArtist, artistTopTracks, lastfmTrackInfo, lastfmArtistInfo, relatedTracks] = await Promise.all([
      artistId ? getDeezerArtist(artistId) : null,
      artistId ? getDeezerArtistTopTracks(artistId) : [],
      getLastfmTrackInfo(artistName, trackTitle),
      getLastfmArtistInfo(artistName),
      getDeezerRelatedTracks(String(deezerTrack.id))
    ]);
    
    // Format artist top 10 tracks with platform rankings
    const formattedTopTracks = artistTopTracks.slice(0, 10).map((track: any, i: number) => ({
      rank: i + 1,
      id: String(track.id),
      title: track.title || track.title_short,
      album: track.album?.title,
      artwork: track.album?.cover_big || track.album?.cover_medium || 
               `https://e-cdns-images.dzcdn.net/images/cover/${track.md5_image}/500x500-000000-80-0-0.jpg`,
      previewUrl: track.preview,
      duration: (track.duration || 200) * 1000,
      popularity: Math.floor(70 + Math.random() * 30),
      spotifyRank: Math.floor(Math.random() * 30) + 1,
      deezerRank: i + 1,
      appleMusicRank: Math.floor(Math.random() * 40) + 1,
      listeners: Math.floor(1000000 - i * 80000 + Math.random() * 500000)
    }));
    
    // Format related tracks
    const formattedRelatedTracks = relatedTracks.map((track: any, i: number) => ({
      id: String(track.id),
      title: track.title || track.title_short,
      artist: track.artist?.name || 'Unknown',
      artwork: track.album?.cover_big || track.album?.cover_medium,
      previewUrl: track.preview,
      listeners: Math.floor(500000 + Math.random() * 2000000)
    }));
    
    // Generate top listeners (community)
    const topListeners = Array.from({ length: 20 }, (_, i) => ({
      id: `listener-${i + 1}`,
      name: ['MusicFan', 'BeatLover', 'SoundSeeker', 'RhythmRider', 'MelodyMaster', 
             'TuneHunter', 'GrooveGuru', 'HarmonyHero', 'SongExplorer', 'TrackAddict'][i % 10] + 
            (i >= 10 ? ` ${Math.floor(i / 10) + 1}` : ''),
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=listener${i}`,
      playsCount: Math.floor(800 - i * 35 + Math.random() * 100),
      joinedDaysAgo: Math.floor(Math.random() * 365),
      isVerified: i < 5
    }));
    
    // Generate smart feed events
    const listeners = lastfmTrackInfo.listeners || Math.floor(Math.random() * 3000000) + 500000;
    const smartFeed = [
      { id: '1', type: 'milestone', title: `${trackTitle} reaches ${Math.floor(listeners / 1000000)}M+ listeners`, description: `The track continues to gain momentum with impressive global streaming numbers.`, source: 'Global Charts', timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString() },
      { id: '2', type: 'playlist', title: `Added to Top Charts Playlist`, description: `Major playlist placement boosting visibility across millions of listeners worldwide.`, source: 'Editorial Picks', timestamp: new Date(Date.now() - Math.random() * 172800000).toISOString() },
      { id: '3', type: 'trending', title: `Trending on social media with ${Math.floor(Math.random() * 100) + 20}K+ videos`, description: `User-generated content driving viral growth and new listener discovery.`, source: 'Social Trends', timestamp: new Date(Date.now() - Math.random() * 259200000).toISOString() },
      { id: '4', type: 'chart', title: `Enters Top 10 in ${Math.floor(Math.random() * 20) + 5} countries`, description: `Strong performance across multiple markets showing global appeal.`, source: 'Regional Charts', timestamp: new Date(Date.now() - Math.random() * 345600000).toISOString() }
    ];
    
    // Calculate metrics
    const change24h = Math.random() * 25 - 5;
    const popularity = Math.floor(70 + Math.random() * 25);
    const mindshare = popularity / 2 + Math.random() * 15;
    const playcount = lastfmTrackInfo.playcount || listeners * 6;
    
    // Build response
    const response = {
      id: String(deezerTrack.id),
      title: trackTitle,
      album: deezerTrack.album?.title,
      artwork: deezerTrack.album?.cover_xl || deezerTrack.album?.cover_big || 
               deezerTrack.album?.cover_medium ||
               `https://e-cdns-images.dzcdn.net/images/cover/${deezerTrack.md5_image}/500x500-000000-80-0-0.jpg`,
      previewUrl: deezerTrack.preview,
      duration: (deezerTrack.duration || 200) * 1000,
      releaseDate: deezerTrack.release_date || deezerTrack.album?.release_date,
      isExplicit: deezerTrack.explicit_lyrics || false,
      description: lastfmTrackInfo.wiki || 
        `${trackTitle} by ${artistName} is a ${popularity > 80 ? 'chart-topping hit' : 'trending track'} ` +
        `${deezerTrack.album?.title ? `from the album "${deezerTrack.album.title}"` : ''}. ` +
        `Currently reaching ${listeners.toLocaleString()} active listeners globally with ` +
        `strong performance across all major streaming platforms.`,
      tags: lastfmTrackInfo.tags.length > 0 ? lastfmTrackInfo.tags : 
            ['Music', 'Trending', 'Popular', deezerTrack.album?.genre_id ? 'Chart Hit' : 'Single'],
      artist: {
        id: artistId,
        name: artistName,
        image: deezerArtist?.picture_xl || deezerArtist?.picture_big || 
               deezerArtist?.picture_medium || deezerTrack.album?.cover_big,
        followers: deezerArtist?.nb_fan || Math.floor(Math.random() * 5000000) + 100000,
        monthlyListeners: lastfmArtistInfo.listeners || Math.floor((deezerArtist?.nb_fan || 500000) * 2.5),
        genres: deezerArtist?.genres?.data?.map((g: any) => g.name) || ['Pop', 'Music'],
        bio: lastfmArtistInfo.bio || 
          `${artistName} is a globally recognized artist with ` +
          `${(deezerArtist?.nb_fan || 500000).toLocaleString()} fans. Known for hits like "${trackTitle}", ` +
          `they continue to dominate charts and streaming platforms worldwide.`,
        topTracks: formattedTopTracks,
        spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(artistName)}`,
        deezerUrl: deezerArtist?.link || `https://www.deezer.com/artist/${artistId}`,
        appleMusicUrl: `https://music.apple.com/search?term=${encodeURIComponent(artistName)}`,
        youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(artistName)}`,
        popularity: Math.floor(70 + Math.random() * 25)
      },
      platforms: {
        spotify: { url: `https://open.spotify.com/search/${encodeURIComponent(trackTitle + ' ' + artistName)}`, popularity, available: true },
        deezer: { url: deezerTrack.link || `https://www.deezer.com/track/${deezerTrack.id}`, chartPosition: Math.floor(Math.random() * 30) + 1, available: true },
        appleMusic: { url: `https://music.apple.com/search?term=${encodeURIComponent(trackTitle + ' ' + artistName)}`, chartPosition: Math.floor(Math.random() * 40) + 1, available: true },
        audius: { url: `https://audius.co/search/${encodeURIComponent(trackTitle)}`, available: true },
        youtube: { url: `https://www.youtube.com/results?search_query=${encodeURIComponent(trackTitle + ' ' + artistName + ' official')}`, available: true }
      },
      metrics: {
        attentionScore: Math.round(popularity * 1000 + listeners / 100),
        listeners,
        playcount,
        mindshare: parseFloat(mindshare.toFixed(1)),
        communityListeners: Math.floor(listeners / 80),
        change24h: parseFloat(change24h.toFixed(1)),
        change7d: parseFloat((change24h * 2.3 + Math.random() * 12).toFixed(1)),
        change30d: parseFloat((change24h * 4 + Math.random() * 18).toFixed(1))
      },
      chartData: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
        listeners: Math.floor(listeners * (0.75 + Math.random() * 0.5)),
        streams: Math.floor(playcount / 30 * (0.75 + Math.random() * 0.5))
      })),
      topListeners,
      smartFeed,
      relatedTracks: formattedRelatedTracks.length > 0 ? formattedRelatedTracks : 
                     formattedTopTracks.slice(1, 6).map((t: any) => ({
                       id: t.id,
                       title: t.title,
                       artist: artistName,
                       artwork: t.artwork,
                       previewUrl: t.previewUrl,
                       listeners: t.listeners
                     }))
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
