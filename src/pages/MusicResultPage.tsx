import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MusicResult } from '@/components/MusicResult';
import type { FxConfig } from '@/hooks/useAudioRemix';
import { fetchRemixJob, resolveBackendUrl, type RemixJobResponse } from '@/lib/aiRemixApi';
import { toast } from 'sonner';

const MusicResultPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as {
    trackTitle?: string;
    genre?: string;
    era?: string;
    prompt?: string;
    albumArt?: string;
    trackId?: string;
    fxConfig?: FxConfig;
    audioUrl?: string;
    uploadedMusic?: {
      type: 'file' | 'url';
      name: string;
      url?: string;
      file?: File;
    };
    backendJobId?: string;
    backPath?: string;
    sourcePreviewAudioUrl?: string;
    sourcePreviewUrl?: string;
    sourceMediaKind?: string;
  } | null;
  const [job, setJob] = useState<RemixJobResponse | null>(null);
  const lastNotifiedStatus = useRef<string | null>(null);

  useEffect(() => {
    if (!state?.backendJobId) {
      return;
    }

    let cancelled = false;

    const poll = async () => {
      while (!cancelled) {
        const nextJob = await fetchRemixJob(state.backendJobId!);
        if (cancelled) {
          return;
        }
        setJob(nextJob);
        if (nextJob.status === 'completed' || nextJob.status === 'failed') {
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 2500));
      }
    };

    poll().catch(() => {
      if (!cancelled) {
        setJob(null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [state?.backendJobId]);

  useEffect(() => {
    if (!job?.status || lastNotifiedStatus.current === job.status) {
      return;
    }

    if (job.status === 'completed') {
      toast.success('Remix completed. Your remixed song is ready to play.');
      lastNotifiedStatus.current = job.status;
      return;
    }

    if (job.status === 'failed') {
      toast.error(job.error || 'Remix failed before the output was created.');
      lastNotifiedStatus.current = job.status;
    }
  }, [job]);

  const jobTrackTitle = state?.trackTitle || state?.uploadedMusic?.name || 'My Remix';
  const jobAudioUrl = job?.artifacts?.public_remix_url ? resolveBackendUrl(job.artifacts.public_remix_url) : state?.audioUrl;
  const jobSourceAudioUrl = job?.artifacts?.input_audio_public_url
    ? resolveBackendUrl(job.artifacts.input_audio_public_url)
    : state?.sourcePreviewAudioUrl;
  const jobSourceMediaUrl = job?.artifacts?.input_public_url
    ? resolveBackendUrl(job.artifacts.input_public_url)
    : state?.sourcePreviewUrl;
  const jobSourceMediaKind = job?.artifacts?.source_media_kind || state?.sourceMediaKind;
  const isBackendPending = Boolean(state?.backendJobId) && (!job || (job.status !== 'completed' && job.status !== 'failed'));
  const backendMessage = job ? `${job.current_stage}: ${job.message}` : state?.backendJobId ? 'Queued: starting the remix job.' : undefined;
  const comparisonSummary = job?.comparison?.summary;
  const changes = job?.comparison?.changes ?? [];
  const modelsUsed = job?.comparison?.models_used ?? [];

  return (
    <MusicResult
      trackTitle={jobTrackTitle}
      genre={job?.genre || state?.genre || 'Custom'}
      era={state?.era}
      prompt={state?.prompt}
      albumArt={state?.albumArt}
      trackId={state?.trackId}
      fxConfig={state?.fxConfig}
      audioUrl={jobAudioUrl}
      sourceAudioUrl={jobSourceAudioUrl}
      sourceMediaUrl={jobSourceMediaUrl}
      sourceMediaKind={jobSourceMediaKind}
      backendPending={isBackendPending}
      backendMessage={job?.error || backendMessage}
      comparisonSummary={comparisonSummary}
      changes={changes}
      modelsUsed={modelsUsed}
      currentStage={job?.current_stage}
      onBack={() => navigate(state?.backPath || '/')}
    />
  );
};

export default MusicResultPage;
