import { useRef, useState } from 'react';
import { ArrowLeft, Play, Pause, Check, Download, Music, Loader2, Mic, Disc3, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { VocalProject } from '@/hooks/useVocalProject';

interface Props {
  project: VocalProject;
  statusLabel: string;
  progress: number;
  isPolling: boolean;
  onBack: () => void;
  onSelectVariation: (index: number) => void;
}

const PIPELINE_STEPS = [
  { key: 'cleaning', label: 'Clean vocal (Demucs)', icon: Mic },
  { key: 'analyzing', label: 'Detect BPM, key, energy', icon: Music },
  { key: 'generating', label: 'Generate 3 vocal-matched instrumentals', icon: Disc3 },
  { key: 'mastering', label: 'Mix & master with RoEx', icon: Sparkles },
  { key: 'done', label: 'Your finished songs', icon: Check },
];

const STATUS_ORDER = ['pending', 'cleaning', 'analyzing', 'generating', 'mastering', 'done'];

const variationLabels = ['MusicGen Melody (follows your vocal)', 'MiniMax Music 1.5', 'MusicGen Stereo'];
const variationStatusLabels: Record<string, string> = {
  queued: 'Queued (staggered to dodge rate limits)',
  generating: 'Generating instrumental…',
  mastering: 'Mixing & mastering…',
  done: 'Ready',
  failed: 'Failed',
};

export default function VocalProjectStatus({ project, statusLabel, progress, isPolling, onBack, onSelectVariation }: Props) {
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentStepIndex = STATUS_ORDER.indexOf(project.status);
  const isDone = project.status === 'done';
  const isError = project.status === 'error';
  const finalUrls = (project.final_urls || []) as string[];
  const masteredUrls = (project.mastered_urls || []) as string[];
  const variationStatuses = (project.variation_statuses || []) as string[];
  const variationEngines = (project.variation_engines || []) as string[];
  const variationErrors = (project.variation_errors || []) as string[];
  const cleanVocalUrl = project.clean_vocal_url || '';

  const stop = () => { audioRef.current?.pause(); setPlayingIndex(null); };

  const playSong = (index: number) => {
    const url = masteredUrls[index] || finalUrls[index];
    if (!url) return;
    if (playingIndex === index) { stop(); return; }
    stop();
    const audio = new Audio(url);
    audio.play();
    audio.onended = () => setPlayingIndex(null);
    audioRef.current = audio;
    setPlayingIndex(index);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto p-4 sm:p-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold">
            {isDone ? 'Your Songs Are Ready' : isError ? 'Processing Failed' : 'Creating Your Songs'}
          </h1>
        </div>

        {!isError && (
          <div className="mb-8 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">{statusLabel}</span>
              <span className="text-white/40">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2 bg-white/10" />

            {project.vocal_bpm ? (
              <div className="flex flex-wrap gap-2 text-[11px] text-white/40">
                <span className="rounded-full bg-white/5 px-2 py-0.5">BPM: {Math.round(Number(project.vocal_bpm))}</span>
                <span className="rounded-full bg-white/5 px-2 py-0.5">Key: {project.vocal_key}</span>
                {project.vocal_duration_seconds ? (
                  <span className="rounded-full bg-white/5 px-2 py-0.5">{Math.round(Number(project.vocal_duration_seconds))}s</span>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-2 mt-6">
              {PIPELINE_STEPS.map((step) => {
                const stepIdx = STATUS_ORDER.indexOf(step.key);
                const isActive = project.status === step.key;
                const isComplete = currentStepIndex > stepIdx;
                const Icon = step.icon;
                return (
                  <div key={step.key} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive ? 'bg-white/10' : isComplete ? 'bg-white/5' : 'opacity-40'
                  }`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      isComplete ? 'bg-white text-black' : isActive ? 'bg-white/20' : 'bg-white/5'
                    }`}>
                      {isComplete ? <Check className="h-3.5 w-3.5" /> :
                        isActive ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                        <Icon className="h-3.5 w-3.5 text-white/40" />}
                    </div>
                    <span className={`text-sm ${isActive ? 'text-white font-medium' : isComplete ? 'text-white/70' : 'text-white/30'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Per-variation progress */}
            {variationStatuses.length > 0 && (project.status === 'generating' || project.status === 'mastering' || isDone) && (
              <div className="mt-6 space-y-2">
                <p className="text-[11px] uppercase tracking-wider text-white/30">Variations</p>
                <p className="text-[10px] text-white/30 leading-relaxed">
                  Slot 1 follows your melody (best match). Slots 2 & 3 are alternate takes — launched 12s apart to avoid rate limits.
                </p>
                {variationStatuses.map((status, i) => {
                  const engine = variationEngines[i] || variationLabels[i] || `V${i + 1}`;
                  const label = variationStatusLabels[status] || status;
                  const errMsg = variationErrors[i];
                  const isReady = status === 'done';
                  const isFailed = status === 'failed';
                  return (
                    <div key={i} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] text-white/30 font-mono">#{i + 1}</span>
                          <span className="text-xs text-white/60 truncate">{variationLabels[i] || engine}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs whitespace-nowrap">
                          {isReady ? (
                            <span className="text-white/80 inline-flex items-center gap-1"><Check className="h-3 w-3" /> {label}</span>
                          ) : isFailed ? (
                            <span className="text-red-400/70 inline-flex items-center gap-1"><X className="h-3 w-3" /> Failed</span>
                          ) : (
                            <span className="text-white/50 inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> {label}</span>
                          )}
                        </div>
                      </div>
                      {isFailed && errMsg && (
                        <p className="mt-1 text-[10px] text-red-400/50 leading-snug pl-6">
                          {errMsg.includes('429') ? 'Rate limited — engine at capacity. Try again in 1 minute.' : errMsg.slice(0, 120)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {isPolling && !isDone && (
              <p className="text-xs text-white/30 text-center mt-4">
                Processing takes 3–6 minutes. First option usually finishes fastest.
              </p>
            )}
          </div>
        )}

        {isError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
            <p className="text-red-400 text-sm mb-2">{project.error_message || 'An error occurred during processing.'}</p>
            <Button variant="outline" onClick={onBack} className="border-white/20 text-white hover:bg-white/10">
              Try Again
            </Button>
          </div>
        )}

        {/* Finished mastered songs (rendered as soon as available) */}
        {(isDone || masteredUrls.some(Boolean)) && (
          <div className="space-y-4 mt-2">
            {cleanVocalUrl && (
              <div className="border border-white/10 rounded-xl p-4 bg-white/[0.02]">
                <div className="flex items-center gap-3 mb-2">
                  <Mic className="h-4 w-4 text-white/50" />
                  <span className="text-xs text-white/50 uppercase tracking-wider font-medium">Cleaned vocal</span>
                </div>
                <audio src={cleanVocalUrl} controls className="w-full h-8 opacity-70" style={{ filter: 'invert(1)' }} />
              </div>
            )}

            {variationStatuses.map((status, i) => {
              const url = masteredUrls[i];
              if (!url || status !== 'done') return null;
              const isPlaying = playingIndex === i;
              const engine = variationEngines[i] || variationLabels[i] || `V${i + 1}`;
              return (
                <div key={i} className="border border-white/10 rounded-xl p-4 bg-white/[0.02]">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-white">Variation {i + 1} — {engine}</p>
                      <p className="text-xs text-white/40">Mastered with RoEx Tonn</p>
                    </div>
                    {i === 0 && (
                      <span className="text-[10px] bg-white/10 text-white/60 px-2 py-0.5 rounded-full">⭐ Best fit</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <Button
                      size="sm"
                      onClick={() => playSong(i)}
                      className={`flex-1 text-xs h-9 ${isPlaying ? 'bg-white text-black' : 'bg-white/90 text-black hover:bg-white'}`}
                    >
                      {isPlaying ? <Pause className="h-3.5 w-3.5 mr-1.5" /> : <Play className="h-3.5 w-3.5 mr-1.5" />}
                      Play mastered song
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <a href={url} download className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white">
                      <Download className="h-4 w-4" />
                    </a>
                    <Button size="sm" onClick={() => onSelectVariation(i)} className="bg-white text-black hover:bg-white/80 text-xs ml-auto">
                      Open Result
                    </Button>
                  </div>
                </div>
              );
            })}

            {project.generated_prompt && (
              <div className="border border-white/5 rounded-xl p-4 bg-white/[0.01]">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">AI prompt used</p>
                <p className="text-xs text-white/40 leading-relaxed">{project.generated_prompt.slice(0, 300)}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
