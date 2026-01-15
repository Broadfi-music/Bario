import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface HeatmapTrack {
  id: string;
  rank: number;
  title: string;
  artist: string;
  album: string;
  artwork: string;
  previewUrl: string | null;
  genre: string;
  duration: number;
  spotifyUrl: string | null;
  deezerUrl: string | null;
  appleUrl: string | null;
  audiusUrl: string | null;
  spotifyId: string | null;
  deezerId: string | null;
  audiusId: string | null;
  metrics: {
    attentionScore: number;
    spotifyPopularity: number;
    deezerPosition: number | null;
    lastfmListeners: number;
    lastfmPlaycount: number;
    audiusRank: number | null;
    mindshare: number;
    change24h: number;
    change7d: number;
    change30d: number;
  };
  trend: 'up' | 'down' | 'stable';
  momentum: 'surging' | 'cooling' | 'stable';
}

export interface HeatmapSummary {
  totalTracks: number;
  totalListeners: number;
  avgChange24h: string;
  lastUpdated: string;
}

export interface TrackDetail {
  id: string;
  title: string;
  artist: {
    name: string;
    image: string;
    followers: number;
    monthlyListeners: number;
    genres: string[];
    bio: string;
    spotifyUrl: string | null;
    topTracks: Array<{
      id: string;
      rank: number;
      title: string;
      album: string;
      artwork: string;
      previewUrl: string | null;
      playcount: number;
      listeners: number;
      spotifyRank: number;
      deezerRank: number;
      appleMusicRank: number;
    }>;
  };
  album: string;
  artwork: string;
  previewUrl: string | null;
  genre: string;
  duration: number;
  description: string;
  tags: string[];
  platforms: {
    spotify: { url: string | null; popularity: number | null; available: boolean };
    deezer: { url: string | null; chartPosition: number | null; available: boolean };
    appleMusic: { url: string | null; available: boolean };
    audius: { url: string | null; trendingRank: number | null; available: boolean };
    youtube: { url: string | null; available: boolean };
  };
  metrics: {
    attentionScore: number;
    listeners: number;
    playcount: number;
    mindshare: number;
    communityListeners: number;
    change24h: number;
    change7d: number;
    change30d: number;
  };
  topListeners: Array<{ id: string; avatar: string; name: string; isVerified: boolean; playsCount: number }>;
  chartData: Array<{ timestamp: string; value: number; listeners: number }>;
  smartFeed: Array<{ id: string; type: string; title: string; description: string; source: string; timestamp: string }>;
  comments: Array<{ user_name: string; user_avatar: string; content: string; sentiment: string; likes: number; created_at: string }>;
  relatedTracks: Array<{ id: string; rank?: number; title: string; artist?: string; artwork: string; previewUrl: string | null; playcount?: number; listeners: number }>;
}

const SUPABASE_URL = 'https://sufbohhsxlrefkoubmed.supabase.co';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1ZmJvaGhzeGxyZWZrb3VibWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4ODY3NjAsImV4cCI6MjA4MDQ2Mjc2MH0.1Ms3xhguJjQ-bbPronddzgO-XCYcTZTkcWS-uUMg1q4';

export function useHeatmapTracks(limit = 99) {
  const [tracks, setTracks] = useState<HeatmapTrack[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [summary, setSummary] = useState<HeatmapSummary>({
    totalTracks: 0,
    totalListeners: 0,
    avgChange24h: '0',
    lastUpdated: new Date().toISOString()
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentCountry, setCurrentCountry] = useState('GLOBAL');

  const fetchTracks = useCallback(async (search?: string, genre?: string, country?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: limit.toString() });
      if (search) params.append('search', search);
      if (genre) params.append('genre', genre);
      if (country) {
        params.append('country', country);
        setCurrentCountry(country);
      }
      
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/heatmap-tracks?${params}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': API_KEY
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data?.tracks) {
        setTracks(data.tracks);
        setSummary(data.summary || summary);
        
        // Extract unique genres
        const uniqueGenres = [...new Set(data.tracks.map((t: HeatmapTrack) => t.genre).filter(Boolean))];
        setGenres(uniqueGenres as string[]);
      }
    } catch (err) {
      console.error('Error fetching heatmap tracks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tracks');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  const searchTracks = useCallback((query: string) => {
    fetchTracks(query, undefined, currentCountry);
  }, [fetchTracks, currentCountry]);

  const filterByGenre = useCallback((genre: string) => {
    fetchTracks(undefined, genre, currentCountry);
  }, [fetchTracks, currentCountry]);

  const filterByCountry = useCallback((country: string) => {
    setCurrentCountry(country);
    // Clear tracks and fetch fresh data for new country
    setTracks([]);
    fetchTracks(undefined, undefined, country);
  }, [fetchTracks]);

  const refetch = useCallback(() => {
    fetchTracks(undefined, undefined, currentCountry);
  }, [fetchTracks, currentCountry]);

  // Subscribe to realtime updates
  useEffect(() => {
    fetchTracks();

    const channel = supabase
      .channel('heatmap-metrics')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'heatmap_track_metrics'
        },
        () => fetchTracks()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTracks]);

  // Realtime simulation for UI updates
  useEffect(() => {
    if (tracks.length === 0) return;

    const interval = setInterval(() => {
      setTracks(prev => {
        const updated = prev.map(track => {
          const change = (Math.random() - 0.5) * 3;
          const newChange24h = parseFloat((track.metrics.change24h + change * 0.05).toFixed(1));
          const newListeners = track.metrics.lastfmListeners + Math.floor((Math.random() - 0.4) * 1000);
          return {
            ...track,
            metrics: {
              ...track.metrics,
              change24h: newChange24h,
              lastfmListeners: Math.max(0, newListeners),
              attentionScore: Math.floor(track.metrics.attentionScore + (Math.random() - 0.5) * 500)
            },
            trend: newChange24h > 0 ? 'up' as const : newChange24h < 0 ? 'down' as const : 'stable' as const,
            momentum: newChange24h > 10 ? 'surging' as const : newChange24h < -5 ? 'cooling' as const : 'stable' as const
          };
        });
        
        updated.sort((a, b) => b.metrics.attentionScore - a.metrics.attentionScore);
        updated.forEach((track, i) => track.rank = i + 1);
        
        return updated;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [tracks.length]);

  return { tracks, genres, summary, loading, error, refetch, searchTracks, filterByGenre, filterByCountry };
}

export function useTrackDetail(trackId: string | undefined) {
  const [track, setTrack] = useState<TrackDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrack = useCallback(async () => {
    if (!trackId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Encode track ID for URL safety - handles both numeric IDs and search-result IDs
      const encodedId = encodeURIComponent(trackId);
      
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/heatmap-track-detail?id=${encodedId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': API_KEY
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setTrack(data);
    } catch (err) {
      console.error('Error fetching track detail:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch track');
    } finally {
      setLoading(false);
    }
  }, [trackId]);

  useEffect(() => {
    fetchTrack();
  }, [fetchTrack]);

  // Realtime updates for metrics
  useEffect(() => {
    if (!track) return;

    const interval = setInterval(() => {
      setTrack(prev => {
        if (!prev) return prev;
        
        const change = (Math.random() - 0.5) * 2;
        return {
          ...prev,
          metrics: {
            ...prev.metrics,
            listeners: prev.metrics.listeners + Math.floor((Math.random() - 0.4) * 500),
            mindshare: parseFloat((prev.metrics.mindshare + (Math.random() - 0.5) * 0.1).toFixed(2)),
            change24h: parseFloat((prev.metrics.change24h + change * 0.1).toFixed(1))
          },
          chartData: [
            ...prev.chartData.slice(1),
            {
              timestamp: new Date().toISOString(),
              value: prev.chartData[prev.chartData.length - 1]?.value + (Math.random() - 0.5) * 2000 || 50000,
              listeners: prev.metrics.listeners
            }
          ]
        };
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [track]);

  return { track, loading, error, refetch: fetchTrack };
}

export function useSyncHeatmap() {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sync = useCallback(async () => {
    try {
      setSyncing(true);
      setError(null);
      
      const response = await supabase.functions.invoke('heatmap-sync');

      if (response.error) {
        throw new Error(response.error.message);
      }

      setLastSync(new Date());
      return response.data;
    } catch (err) {
      console.error('Sync error:', err);
      setError(err instanceof Error ? err.message : 'Sync failed');
      throw err;
    } finally {
      setSyncing(false);
    }
  }, []);

  return { sync, syncing, lastSync, error };
}
