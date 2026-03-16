import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [currentGenre, setCurrentGenre] = useState<string | undefined>(undefined);
  const fetchInProgress = useRef(false);

  const fetchTracks = useCallback(async (search?: string, genre?: string, country?: string) => {
    // Prevent duplicate concurrent fetches
    if (fetchInProgress.current) return;
    fetchInProgress.current = true;

    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({ 
        limit: limit.toString(),
        _t: Date.now().toString()
      });
      if (search) params.append('search', search);
      if (genre) params.append('genre', genre);
      
      const countryToUse = country || currentCountry;
      params.append('country', countryToUse);
      
      if (country) {
        setCurrentCountry(country);
      }
      
      console.log(`Fetching heatmap tracks for country: ${countryToUse}`);
      
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
        const processedTracks = data.tracks;
        setTracks(processedTracks);
        setSummary(data.summary || summary);
        
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
      fetchInProgress.current = false;
    }
  }, [limit, currentCountry]);

  const searchTracks = useCallback((query: string) => {
    fetchTracks(query, undefined, currentCountry);
  }, [fetchTracks, currentCountry]);

  const filterByGenre = useCallback((genre: string) => {
    const g = genre || undefined;
    setCurrentGenre(g);
    fetchTracks(undefined, g, currentCountry);
  }, [fetchTracks, currentCountry]);

  const filterByCountry = useCallback((country: string) => {
    setCurrentCountry(country);
    setCurrentGenre(undefined);
    setTracks([]);
    fetchTracks(undefined, undefined, country);
  }, [fetchTracks]);

  const refetch = useCallback(() => {
    fetchTracks(undefined, currentGenre, currentCountry);
  }, [fetchTracks, currentGenre, currentCountry]);

  // Single initial fetch
  useEffect(() => {
    fetchTracks(undefined, currentGenre, currentCountry);
  }, []); // Only on mount

  // Auto-refresh every 2 minutes, only when tab is visible
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        console.log('Auto-refreshing heatmap tracks (120s)...');
        fetchTracks(undefined, currentGenre, currentCountry);
      }
    }, 120000);

    return () => clearInterval(refreshInterval);
  }, [currentCountry, currentGenre, fetchTracks]);

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
