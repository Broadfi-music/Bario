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
  pending: 'Preparing project...',
  cleaning: 'Cleaning vocals (Demucs)...',
  analyzing: 'Transcribing vocals and building the arrangement...',
  generating: 'Generating your 3 song options...',
  done: 'Song options ready!',
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

const STAGE_LABELS: Record<string, string> = {
  whisper: 'Transcribing your vocal performance...',
  llama: 'Designing the instrumental direction...',
  beat_1: 'Generating song option 1 of 3...',
  beat_2: 'Generating song option 2 of 3...',
  beat_3: 'Generating song option 3 of 3...',
  complete: 'Song options ready!',
};

const STAGE_PROGRESS: Record<string, number> = {
  whisper: 25,
  llama: 40,
  beat_1: 60,
  beat_2: 75,
  beat_3: 90,
  complete: 100,
};

const getPipelineStage = (project: VocalProject | null) => {
  if (!project?.analysis_data || typeof project.analysis_data !== 'object' || Array.isArray(project.analysis_data)) {
    return '';
  }

  const stage = (project.analysis_data as Record<string, unknown>).stage;
  return typeof stage === 'string' ? stage : '';
};

const getStatusLabel = (project: VocalProject | null) => {
  if (!project) return '';
  const stage = getPipelineStage(project);
  return STAGE_LABELS[stage] || STATUS_LABELS[project.status] || project.status;
};

const getStatusProgress = (project: VocalProject | null) => {
  if (!project) return 0;
  const stage = getPipelineStage(project);
  return STAGE_PROGRESS[stage] || STATUS_PROGRESS[project.status] || 0;
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
    statusLabel: getStatusLabel(project),
    progress: getStatusProgress(project),
  };
}
