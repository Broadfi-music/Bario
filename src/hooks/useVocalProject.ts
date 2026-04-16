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
  cleaning: 'Cleaning vocals...',
  analyzing: 'Analyzing audio...',
  generating: 'Generating beats...',
  mixing: 'Mixing tracks...',
  mastering: 'Mastering audio...',
  harmonizing: 'Creating harmonies...',
  stems: 'Generating stems...',
  done: 'Complete!',
  error: 'Error occurred',
};

const STATUS_PROGRESS: Record<string, number> = {
  pending: 5,
  cleaning: 15,
  analyzing: 30,
  generating: 55,
  mixing: 70,
  mastering: 82,
  harmonizing: 90,
  stems: 95,
  done: 100,
  error: 0,
};

export function useVocalProject() {
  const [project, setProject] = useState<VocalProject | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();

  const startProject = useCallback(async (vocalUrl: string, genre: string, description?: string) => {
    setIsStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke('vocal-to-song', {
        body: { vocalUrl, genre, description },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Failed to start');

      // Start polling
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
        toast({ title: '🎵 Song Complete!', description: 'Your song variations are ready to preview.' });
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
    // Poll immediately
    pollProject(projectId);
    // Then every 10 seconds
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

  // Auto-stop polling when done/error
  useEffect(() => {
    if (project && (project.status === 'done' || project.status === 'error')) {
      stopPolling();
    }
  }, [project, stopPolling]);

  // Cleanup on unmount
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
