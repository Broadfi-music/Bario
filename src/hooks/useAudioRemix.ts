import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FxConfig {
  reverb_amount: number;
  distortion_amount: number;
  bitcrush_level: number;
  eq_low: number;
  eq_mid: number;
  eq_high: number;
  stereo_width: number;
  tape_noise_level: number;
  tempo_change_percent: number;
  filter_cutoff: number;
  compression_ratio: number;
  delay_time: number;
  delay_feedback: number;
}

interface RemixRequest {
  genre: string;
  era?: string;
  description?: string;
  audioUrl?: string;
  trackTitle?: string;
}

interface RemixResponse {
  success: boolean;
  trackId: string;
  fxConfig: FxConfig;
  message: string;
}

export function useAudioRemix() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [fxConfig, setFxConfig] = useState<FxConfig | null>(null);
  const [trackId, setTrackId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const generateRemix = async (request: RemixRequest): Promise<RemixResponse | null> => {
    setIsProcessing(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Please sign in to create remixes');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/remix`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate remix');
      }

      setFxConfig(data.fxConfig);
      setTrackId(data.trackId);

      toast({
        title: 'Remix Generated!',
        description: 'Your audio effects have been calculated. Apply them to your track.',
      });

      return data as RemixResponse;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });

      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const getTrack = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Please sign in');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-track?trackId=${id}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch track');
      }

      return data.track;
    } catch (err) {
      console.error('Get track error:', err);
      return null;
    }
  };

  return {
    generateRemix,
    getTrack,
    isProcessing,
    fxConfig,
    trackId,
    error,
  };
}