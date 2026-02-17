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
      setError(null);
      
      // Build query parameters - CRITICAL: pass country to the edge function
      const params = new URLSearchParams({ 
        limit: limit.toString(),
        _t: Date.now().toString() // Cache buster
      });
      if (search) params.append('search', search);
      if (genre) params.append('genre', genre);
      
      // Use country from parameter or current state
      const countryToUse = country || currentCountry;
      params.append('country', countryToUse);
      
      if (country) {
        setCurrentCountry(country);
      }
      
      console.log(`Fetching heatmap tracks for country: ${countryToUse}`);
      
      // Direct fetch to edge function with query params - more reliable
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/heatmap-tracks?${params}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': API_KEY,
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data?.tracks) {
        // Don't shuffle on initial load - keep the ranked order
        // Only add slight variety on subsequent fetches
        const processedTracks = data.tracks;
        setTracks(processedTracks);
        setSummary(data.summary || summary);
        
        // Use official genre list from API if available, otherwise extract from tracks
        if (data.genres && data.genres.length > 0) {
          setGenres(data.genres.filter((g: string) => g !== 'All'));
        } else {
          const uniqueGenres = [...new Set(processedTracks.map((t: HeatmapTrack) => t.genre).filter(Boolean))];
          setGenres(uniqueGenres as string[]);
        }
        
        console.log(`Heatmap loaded: ${processedTracks.length} tracks for ${countryToUse}`);
      }
    } catch (err) {
      console.error('Error fetching heatmap tracks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tracks');
    } finally {
      setLoading(false);
    }
  }, [limit, currentCountry]);

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
    fetchTracks(undefined, undefined, currentCountry);

    const channel = supabase
      .channel('heatmap-metrics')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'heatmap_track_metrics'
        },
        () => fetchTracks(undefined, undefined, currentCountry)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Realtime simulation for UI updates - DISABLED to prevent glitches
  // The tracks are already sorted by rank from the API, no need to re-order them
  // Previous implementation was causing visual glitches by randomly updating track metrics

  // Auto-refresh tracks every 2 minutes for fresh music - very gentle refresh
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      console.log('Auto-refreshing heatmap tracks...');
      // Silent refresh - don't clear tracks to avoid flashing
      fetchTracks(undefined, undefined, currentCountry);
    }, 120000); // Refresh every 2 minutes for stable experience

    return () => clearInterval(refreshInterval);
  }, [currentCountry]);

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

  // Realtime metric simulation disabled for stability
  // Metrics are now deterministic from the edge function

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
