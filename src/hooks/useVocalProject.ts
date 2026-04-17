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
  user_prompt: string | null;
  reference_track_url: string | null;
  vocal_bpm: number | null;
  vocal_key: string | null;
  vocal_energy: number | null;
  vocal_duration_seconds: number | null;
  variation_engines: string[];
  variation_statuses: string[];
  variation_prediction_ids: string[];
  variation_errors: string[];
  variation_launch_at: string[];
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Preparing project…',
  cleaning: 'Cleaning vocals (Demucs)…',
  analyzing: 'Analyzing BPM, key, and vocal flow…',
  generating: 'Generating instrumentals — slot 1 follows your melody…',
  mastering: 'Mixing and mastering with RoEx…',
  done: 'Your songs are ready',
  error: 'Something went wrong',
};

const STATUS_PROGRESS: Record<string, number> = {
  pending: 4,
  cleaning: 12,
  analyzing: 28,
  generating: 50,
  mastering: 80,
  done: 100,
  error: 0,
};

const getStatusLabel = (project: VocalProject | null) => {
  if (!project) return '';
  return STATUS_LABELS[project.status] || project.status;
};

const getStatusProgress = (project: VocalProject | null) => {
  if (!project) return 0;
  if (project.status === 'generating' || project.status === 'mastering') {
    const statuses = project.variation_statuses || [];
    if (statuses.length > 0) {
      const done = statuses.filter((s) => s === 'done' || s === 'failed').length;
      const mastering = statuses.filter((s) => s === 'mastering').length * 0.7;
      const generating = statuses.filter((s) => s === 'generating').length * 0.4;
      const queued = statuses.filter((s) => s === 'queued').length * 0.1;
      return Math.min(95, 35 + ((done + mastering + generating + queued) / statuses.length) * 60);
    }
  }
  return STATUS_PROGRESS[project.status] || 0;
};

export function useVocalProject() {
  const [project, setProject] = useState<VocalProject | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeProjectIdRef = useRef<string | null>(null);
  const { toast } = useToast();

  const startProject = useCallback(async (
    vocalUrl: string,
    genre?: string,
    description?: string,
    referenceUrl?: string,
  ) => {
    setIsStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke('vocal-to-song', {
        body: { vocalUrl, genre: genre || undefined, description, referenceUrl },
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
        toast({ title: '🎵 Songs ready', description: 'Your 3 mastered songs are ready to play.' });
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
    if (pollingRef.current && activeProjectIdRef.current === projectId) return;
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    activeProjectIdRef.current = projectId;
    setIsPolling(true);
    void pollProject(projectId);
    pollingRef.current = setInterval(() => { void pollProject(projectId); }, 5000);
  }, [pollProject]);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
    activeProjectIdRef.current = null;
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (project && (project.status === 'done' || project.status === 'error')) stopPolling();
  }, [project, stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  return {
    project,
    isStarting,
    isPolling,
    startProject,
    startPolling,
    stopPolling,
    statusLabel: getStatusLabel(project),
    progress: getStatusProgress(project),
  };
}
