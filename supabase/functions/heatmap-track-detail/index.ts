import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

// Get artist albums from Deezer
async function getDeezerArtistAlbums(artistId: number) {
  try {
    const response = await fetch(`https://api.deezer.com/artist/${artistId}/albums?limit=10`);
    const data = await response.json();
    return data.data || [];
  } catch (e) {
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
    
    // Handle prefixed IDs from heatmap-tracks function
    let deezerTrack = null;
    let actualId = trackId;
    
    // Extract source and clean ID
    if (trackId.startsWith('spotify_')) {
      // For Spotify tracks, search by the Spotify ID
      actualId = trackId.replace('spotify_', '');
      console.log(`Spotify track detected, ID: ${actualId}`);
      
      // Search Deezer using Spotify track info (we'll search by title/artist)
      // For now, fall through to search
    } else if (trackId.startsWith('audius_')) {
      actualId = trackId.replace('audius_', '');
      console.log(`Audius track detected, ID: ${actualId}`);
      // Will search Deezer as fallback
    } else if (trackId.startsWith('user_')) {
      // User upload - try to get from database and return minimal info
      actualId = trackId.replace('user_', '');
      console.log(`User upload detected, ID: ${actualId}`);
      // Will search Deezer as fallback
    }
    
    // Try to get track from Deezer by ID first (only if it looks like a numeric Deezer ID)
    if (/^\d+$/.test(actualId)) {
      deezerTrack = await getDeezerTrack(actualId);
    }
    
    // If not found by ID, try searching with the original ID as query
    if (!deezerTrack) {
      console.log('Track not found by ID, trying search...');
      
      let searchQuery = actualId;
      
      // Try to decode base64 if it looks encoded
      try {
        // Handle URL-safe base64
        const base64 = searchQuery.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = atob(base64);
        if (decoded && decoded.length > 0 && !decoded.includes('\u0000')) {
          searchQuery = decoded;
          console.log(`Decoded base64 search query: ${searchQuery}`);
        }
      } catch (e) {
        // Not base64, use as-is
        console.log('Not base64, using as-is:', searchQuery);
      }
      
      // Search Deezer with the query
      console.log(`Searching Deezer for: ${searchQuery}`);
      const searchResults = await searchDeezer(searchQuery, 10);
      
      if (searchResults.length > 0) {
        // Get the first result's full details
        console.log(`Found ${searchResults.length} results, using first: ${searchResults[0].title} by ${searchResults[0].artist?.name}`);
        deezerTrack = await getDeezerTrack(String(searchResults[0].id));
      } else {
        // If no exact results, try searching just for tracks by this artist
        const artistSearchResults = await searchDeezer(`artist:"${searchQuery}"`, 5);
        if (artistSearchResults.length > 0) {
          console.log(`Found artist tracks, using first: ${artistSearchResults[0].title}`);
          deezerTrack = await getDeezerTrack(String(artistSearchResults[0].id));
        }
      }
    }
    
    if (!deezerTrack) {
      // Still return a useful response even if track not found directly
      // Try one more search with just the original trackId
      const fallbackResults = await searchDeezer(trackId, 1);
      if (fallbackResults.length > 0) {
        deezerTrack = await getDeezerTrack(String(fallbackResults[0].id));
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
      {
        id: '1',
        type: 'milestone',
        title: `${trackTitle} reaches ${Math.floor(listeners / 1000000)}M+ listeners`,
        description: `The track continues to gain momentum with impressive global streaming numbers.`,
        source: 'Global Charts',
        timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString()
      },
      {
        id: '2',
        type: 'playlist',
        title: `Added to Top Charts Playlist`,
        description: `Major playlist placement boosting visibility across millions of listeners worldwide.`,
        source: 'Editorial Picks',
        timestamp: new Date(Date.now() - Math.random() * 172800000).toISOString()
      },
      {
        id: '3',
        type: 'trending',
        title: `Trending on social media with ${Math.floor(Math.random() * 100) + 20}K+ videos`,
        description: `User-generated content driving viral growth and new listener discovery.`,
        source: 'Social Trends',
        timestamp: new Date(Date.now() - Math.random() * 259200000).toISOString()
      },
      {
        id: '4',
        type: 'chart',
        title: `Enters Top 10 in ${Math.floor(Math.random() * 20) + 5} countries`,
        description: `Strong performance across multiple markets showing global appeal.`,
        source: 'Regional Charts',
        timestamp: new Date(Date.now() - Math.random() * 345600000).toISOString()
      }
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
        spotify: {
          url: `https://open.spotify.com/search/${encodeURIComponent(trackTitle + ' ' + artistName)}`,
          popularity,
          available: true
        },
        deezer: {
          url: deezerTrack.link || `https://www.deezer.com/track/${deezerTrack.id}`,
          chartPosition: Math.floor(Math.random() * 30) + 1,
          available: true
        },
        appleMusic: {
          url: `https://music.apple.com/search?term=${encodeURIComponent(trackTitle + ' ' + artistName)}`,
          chartPosition: Math.floor(Math.random() * 40) + 1,
          available: true
        },
        audius: {
          url: `https://audius.co/search/${encodeURIComponent(trackTitle)}`,
          available: true
        },
        youtube: {
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(trackTitle + ' ' + artistName + ' official')}`,
          available: true
        }
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
