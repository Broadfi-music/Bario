import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface SpotifyTrack {
  id: string;
  spotifyId: string;
  title: string;
  artist: string;
  artistId?: string;
  album: string;
  artwork: string;
  duration: number;
  popularity: number;
  previewUrl: string | null;
  spotifyUrl: string;
  source: string;
}

interface SpotifyArtist {
  id: string;
  name: string;
  image?: string;
  followers?: number;
  genres?: string[];
  popularity?: number;
  spotifyUrl?: string;
}

export function useSpotify() {
  const [isConnected, setIsConnected] = useState(false);
  const [tokens, setTokens] = useState<SpotifyTokens | null>(null);
  const [loading, setLoading] = useState(false);

  // Check for stored tokens on mount
  useEffect(() => {
    const stored = localStorage.getItem('spotify_tokens');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.expiresAt > Date.now()) {
          setTokens(parsed);
          setIsConnected(true);
        } else {
          // Token expired, try to refresh
          refreshTokens(parsed.refreshToken);
        }
      } catch (e) {
        localStorage.removeItem('spotify_tokens');
      }
    }
  }, []);

  // Handle OAuth callback params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const spotifyConnected = params.get('spotify_connected');
    const spotifyToken = params.get('spotify_token');
    const spotifyRefresh = params.get('spotify_refresh');
    const spotifyExpires = params.get('spotify_expires');
    const spotifyError = params.get('spotify_error');

    if (spotifyError) {
      toast.error(`Spotify error: ${spotifyError}`);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (spotifyConnected && spotifyToken && spotifyRefresh) {
      const newTokens: SpotifyTokens = {
        accessToken: spotifyToken,
        refreshToken: spotifyRefresh,
        expiresAt: Date.now() + (parseInt(spotifyExpires || '3600') * 1000)
      };
      
      setTokens(newTokens);
      setIsConnected(true);
      localStorage.setItem('spotify_tokens', JSON.stringify(newTokens));
      toast.success('Spotify connected successfully!');
      
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const connect = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('spotify-auth', {
        body: {},
      });

      // Handle the response properly - check for authUrl in data
      if (data?.authUrl) {
        window.location.href = data.authUrl;
      } else if (error) {
        throw new Error(error.message || 'Failed to get auth URL');
      } else {
        throw new Error('No auth URL received');
      }
    } catch (err) {
      console.error('Spotify connect error:', err);
      toast.error('Failed to connect to Spotify');
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setTokens(null);
    setIsConnected(false);
    localStorage.removeItem('spotify_tokens');
    toast.success('Spotify disconnected');
  }, []);

  const refreshTokens = useCallback(async (refreshToken: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('spotify-auth', {
        body: { refresh_token: refreshToken, action: 'refresh' },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message);
      }

      const newTokens: SpotifyTokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt: Date.now() + (data.expires_in * 1000)
      };

      setTokens(newTokens);
      setIsConnected(true);
      localStorage.setItem('spotify_tokens', JSON.stringify(newTokens));
    } catch (err) {
      console.error('Token refresh failed:', err);
      setTokens(null);
      setIsConnected(false);
      localStorage.removeItem('spotify_tokens');
    }
  }, []);

  const search = useCallback(async (query: string, limit = 20): Promise<{ tracks: SpotifyTrack[], artists: SpotifyArtist[] }> => {
    try {
      const { data, error } = await supabase.functions.invoke('spotify-search', {
        body: { q: query, limit },
      });

      if (error) {
        throw new Error(error.message);
      }

      return {
        tracks: data?.results || [],
        artists: data?.artists || []
      };
    } catch (err) {
      console.error('Spotify search error:', err);
      return { tracks: [], artists: [] };
    }
  }, []);

  return {
    isConnected,
    tokens,
    loading,
    connect,
    disconnect,
    search,
    refreshTokens: tokens?.refreshToken ? () => refreshTokens(tokens.refreshToken) : undefined
  };
}
