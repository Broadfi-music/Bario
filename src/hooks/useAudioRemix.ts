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

      console.log('Calling remix function with:', request);

      const { data, error: fnError } = await supabase.functions.invoke('remix', {
        body: request,
      });

      console.log('Remix response:', data, 'Error:', fnError);

      if (fnError) {
        throw new Error(fnError.message || 'Failed to generate remix');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to generate remix');
      }

      setFxConfig(data.fxConfig);
      setTrackId(data.trackId);

      toast({
        title: 'Remix Generated!',
        description: 'Your audio effects have been calculated. Apply them to your track.',
      });

      return data as RemixResponse;

    } catch (err) {
      console.error('Remix error:', err);
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

      const { data, error: fnError } = await supabase.functions.invoke('get-track', {
        body: { trackId: id },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to fetch track');
      }

      return data?.track;
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