import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface DashboardTrack {
  id: string | number;
  title: string;
  artist: string;
  artistId?: string | number;
  artistImage?: string;
  artwork: string;
  duration: string;
  preview: string;
  plays: string;
  likes: string;
  genre: string;
  isNew?: boolean;
  isHot?: boolean;
  isAudius?: boolean;
  rank?: number;
}

export interface DashboardData {
  trendingSongs: DashboardTrack[];
  newSongs: DashboardTrack[];
  trendingRemixes: DashboardTrack[];
  recentRemixes: DashboardTrack[];
  hotRightNow: DashboardTrack[];
}

export function useDashboardMusic() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>({
    trendingSongs: [],
    newSongs: [],
    trendingRemixes: [],
    recentRemixes: [],
    hotRightNow: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likedTracks, setLikedTracks] = useState<Set<string | number>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: response, error: fetchError } = await supabase.functions.invoke('dashboard-music');

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (response?.success && response?.data) {
        setData(response.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: any) {
      console.error('Dashboard music fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch liked tracks from database on mount
  useEffect(() => {
    const fetchLikedTracks = async () => {
      if (!user) {
        // Load from localStorage if not logged in
        const stored = localStorage.getItem('likedTracks');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setLikedTracks(new Set(parsed));
          } catch (e) {
            console.error('Failed to parse liked tracks:', e);
          }
        }
        return;
      }

      // Fetch from database
      const { data: favorites } = await supabase
        .from('user_favorites')
        .select('track_id')
        .eq('user_id', user.id);

      if (favorites) {
        setLikedTracks(new Set(favorites.map(f => f.track_id)));
      }
    };

    fetchLikedTracks();
  }, [user]);

  // Real-time updates for trending songs and remixes every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => {
        // Shuffle and update trending songs
        const shuffledTrending = [...prev.trendingSongs]
          .sort(() => Math.random() - 0.5)
          .map((song, i) => ({
            ...song,
            rank: i + 1,
            plays: `${(parseFloat(song.plays.replace(/[KM]/g, '')) * (1 + (Math.random() - 0.3) * 0.1)).toFixed(1)}${song.plays.includes('M') ? 'M' : 'K'}`,
          }));
        
        // Shuffle and update trending remixes
        const shuffledRemixes = [...prev.trendingRemixes]
          .sort(() => Math.random() - 0.5)
          .map((remix, i) => ({
            ...remix,
            plays: `${(parseFloat(remix.plays.replace(/[KM]/g, '')) * (1 + (Math.random() - 0.3) * 0.1)).toFixed(1)}${remix.plays.includes('M') ? 'M' : 'K'}`,
          }));
        
        // Shuffle recent remixes
        const shuffledRecentRemixes = [...prev.recentRemixes]
          .sort(() => Math.random() - 0.5);
        
        // Shuffle new songs
        const shuffledNewSongs = [...prev.newSongs]
          .sort(() => Math.random() - 0.5);
        
        return {
          ...prev,
          trendingSongs: shuffledTrending,
          trendingRemixes: shuffledRemixes,
          recentRemixes: shuffledRecentRemixes,
          newSongs: shuffledNewSongs,
        };
      });
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const toggleLike = useCallback(async (trackId: string | number, trackData?: { title: string; artist: string; artwork?: string; preview?: string }) => {
    const isLiked = likedTracks.has(trackId);

    // Optimistic update
    setLikedTracks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(trackId)) {
        newSet.delete(trackId);
      } else {
        newSet.add(trackId);
      }
      // Store in localStorage for persistence (backup)
      localStorage.setItem('likedTracks', JSON.stringify([...newSet]));
      return newSet;
    });

    if (!user) {
      toast.success(isLiked ? 'Removed from favorites' : 'Added to favorites');
      return;
    }

    try {
      if (isLiked) {
        // Remove from database
        await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('track_id', String(trackId));
        toast.success('Removed from favorites');
      } else {
        // Add to database
        await supabase
          .from('user_favorites')
          .insert({
            user_id: user.id,
            track_id: String(trackId),
            track_title: trackData?.title || 'Unknown Track',
            artist_name: trackData?.artist || 'Unknown Artist',
            cover_image_url: trackData?.artwork,
            preview_url: trackData?.preview,
            source: 'dashboard'
          });
        toast.success('Added to favorites');
      }
    } catch (err) {
      console.error('Toggle like error:', err);
      // Revert optimistic update on error
      setLikedTracks(prev => {
        const newSet = new Set(prev);
        if (isLiked) {
          newSet.add(trackId);
        } else {
          newSet.delete(trackId);
        }
        return newSet;
      });
      toast.error('Failed to update favorites');
    }
  }, [user, likedTracks]);

  return { data, loading, error, refetch: fetchData, likedTracks, toggleLike };
}

export interface MegashuffleArtist {
  id: string | number;
  name: string;
  avatar: string;
  followers: number | string;
  genre: string;
  tagline: string;
  monthlyListeners: string;
  isAudius?: boolean;
  deezerId?: string | number;
  topTrack?: {
    id: string | number;
    title: string;
    preview: string;
    artwork?: string;
  };
}

export interface MegashuffleTrack {
  id: string | number;
  title: string;
  artist: string;
  artistId?: string | number;
  artistImage?: string;
  artwork: string;
  duration: string;
  preview: string;
  plays?: string;
  listeners?: number;
  rank?: number;
  change?: number;
  trend?: 'up' | 'down' | 'same';
  isHot?: boolean;
  isNewRelease?: boolean;
}

export interface MegashuffleData {
  artists: MegashuffleArtist[];
  trendingSongs: MegashuffleTrack[];
  top50Songs: MegashuffleTrack[];
  hotRightNow: MegashuffleTrack[];
}

export function useMegashuffleMusic() {
  const [data, setData] = useState<MegashuffleData>({
    artists: [],
    trendingSongs: [],
    top50Songs: [],
    hotRightNow: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: response, error: fetchError } = await supabase.functions.invoke('megashuffle-music');

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (response?.success && response?.data) {
        setData(response.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: any) {
      console.error('Megashuffle music fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const shuffleArtist = useCallback(async (): Promise<MegashuffleArtist | null> => {
    try {
      const { data: response, error: fetchError } = await supabase.functions.invoke('megashuffle-music', {
        body: {},
      });

      // Since we're using GET, let's pick a random artist from our data
      if (data.artists.length > 0) {
        const randomIndex = Math.floor(Math.random() * data.artists.length);
        return data.artists[randomIndex];
      }

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      return response?.artist || null;
    } catch (err: any) {
      console.error('Shuffle artist error:', err);
      return null;
    }
  }, [data.artists]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time ranking updates
  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => {
        if (prev.top50Songs.length === 0) return prev;
        
        const updated = prev.top50Songs.map(song => ({
          ...song,
          listeners: typeof song.listeners === 'number' 
            ? Math.max(10000, song.listeners + Math.floor(Math.random() * 10000) - 5000)
            : song.listeners,
          change: Math.floor(Math.random() * 10) - 3,
          trend: Math.random() > 0.4 ? 'up' as const : Math.random() > 0.5 ? 'down' as const : 'same' as const,
        }));
        
        // Sort by listeners and update ranks
        updated.sort((a, b) => (typeof b.listeners === 'number' ? b.listeners : 0) - (typeof a.listeners === 'number' ? a.listeners : 0));
        updated.forEach((song, index) => {
          song.rank = index + 1;
        });
        
        return { ...prev, top50Songs: updated };
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return { data, loading, error, refetch: fetchData, shuffleArtist };
}
