import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface VocalProject {
  id: string;
  user_id: string;
  status: string;
  original_vocal_url: string | null;
  clean_vocal_url: string | null;
  analysis_data: Record<string, unknown> | null;
  generated_prompt: string | null;
  beat_urls: string[];
  mixed_urls: string[];
  mastered_urls: string[];
  harmony_urls: string[];
  stem_urls: string[];
  final_urls: string[];
  current_prediction_id: string | null;
  selected_variation: number | null;
  is_paid: boolean;
  genre: string | null;
  description: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Starting...',
  cleaning: 'Cleaning vocals (Demucs)...',
  analyzing: 'Analyzing audio & building prompt...',
  generating: 'Generating instrumental beats (Lyria 3 Pro)...',
  done: 'Complete!',
  error: 'Error occurred',
};

const STATUS_PROGRESS: Record<string, number> = {
  pending: 3,
  cleaning: 10,
  analyzing: 30,
  generating: 55,
  done: 100,
  error: 0,
};

export function useVocalProject() {
  const [project, setProject] = useState<VocalProject | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();

  const startProject = useCallback(async (vocalUrl: string, genre?: string, description?: string) => {
    setIsStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke('vocal-to-song', {
        body: { vocalUrl, genre: genre || undefined, description },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Failed to start');
      setIsPolling(true);
      return data.projectId as string;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
      return null;
    } finally {
      setIsStarting(false);
    }
  }, [toast]);

  const pollProject = useCallback(async (projectId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('vocal-to-song-poll', {
        body: { projectId },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Poll failed');

      const proj = data.project as VocalProject;
      setProject(proj);

      if (proj.status === 'done') {
        setIsPolling(false);
        toast({ title: '🎵 Song Complete!', description: 'Your instrumental beats are ready. Play your voice over them!' });
      } else if (proj.status === 'error') {
        setIsPolling(false);
        toast({ title: 'Error', description: proj.error_message || 'Pipeline failed', variant: 'destructive' });
      }
      return proj;
    } catch (err) {
      console.error('Poll error:', err);
      return null;
    }
  }, [toast]);

  const startPolling = useCallback((projectId: string) => {
    setIsPolling(true);
    pollProject(projectId);
    pollingRef.current = setInterval(() => {
      pollProject(projectId);
    }, 10000);
  }, [pollProject]);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (project && (project.status === 'done' || project.status === 'error')) {
      stopPolling();
    }
  }, [project, stopPolling]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return {
    project,
    isStarting,
    isPolling,
    startProject,
    startPolling,
    stopPolling,
    statusLabel: project ? STATUS_LABELS[project.status] || project.status : '',
    progress: project ? STATUS_PROGRESS[project.status] || 0 : 0,
  };
}
