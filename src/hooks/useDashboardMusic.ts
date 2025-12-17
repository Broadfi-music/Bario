import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  const [data, setData] = useState<DashboardData>({
    trendingSongs: [],
    newSongs: [],
    trendingRemixes: [],
    recentRemixes: [],
    hotRightNow: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
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
