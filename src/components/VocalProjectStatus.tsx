import { useState, useRef } from 'react';
import { ArrowLeft, Play, Pause, Check, Download, Music, Loader2, Mic, Disc3 } from 'lucide-react';
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
  { key: 'cleaning', label: 'Clean vocal performance', icon: Mic },
  { key: 'analyzing', label: 'Transcribe + build production prompt', icon: Music },
  { key: 'generating', label: 'Generate 3 song options', icon: Disc3 },
  { key: 'done', label: 'Preview final options', icon: Check },
];

const STATUS_ORDER = ['pending', 'cleaning', 'analyzing', 'generating', 'done'];

export default function VocalProjectStatus({ project, statusLabel, progress, isPolling, onBack, onSelectVariation }: Props) {
  const [playingType, setPlayingType] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const vocalAudioRef = useRef<HTMLAudioElement | null>(null);

  const currentStepIndex = STATUS_ORDER.indexOf(project.status);
  const isDone = project.status === 'done';
  const isError = project.status === 'error';
  const finalUrls = (project.final_urls || []) as string[];
  const cleanVocalUrl = project.clean_vocal_url || '';

  const stopAll = () => {
    audioRef.current?.pause();
    vocalAudioRef.current?.pause();
    setPlayingType(null);
  };

  const playBeat = (index: number) => {
    const key = `beat_${index}`;
    if (playingType === key) { stopAll(); return; }
    stopAll();
    const audio = new Audio(finalUrls[index]);
    audio.play();
    audio.onended = () => setPlayingType(null);
    audioRef.current = audio;
    setPlayingType(key);
  };

  const playBothSync = (index: number) => {
    const key = `both_${index}`;
    if (playingType === key) { stopAll(); return; }
    stopAll();

    const beat = new Audio(finalUrls[index]);
    const vocal = new Audio(cleanVocalUrl);
    beat.volume = 0.7;
    vocal.volume = 0.9;

    beat.play();
    vocal.play();
    beat.onended = () => { vocal.pause(); setPlayingType(null); };
    vocal.onended = () => { beat.pause(); setPlayingType(null); };
    audioRef.current = beat;
    vocalAudioRef.current = vocal;
    setPlayingType(key);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto p-4 sm:p-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold">
            {isDone ? 'Your Song Options Are Ready' : isError ? 'Processing Failed' : 'Creating Your Song'}
          </h1>
        </div>

        {!isDone && !isError && (
          <div className="mb-8 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">{statusLabel}</span>
              <span className="text-white/40">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2 bg-white/10" />

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
                      {isComplete ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : isActive ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Icon className="h-3.5 w-3.5 text-white/40" />
                      )}
                    </div>
                    <span className={`text-sm ${isActive ? 'text-white font-medium' : isComplete ? 'text-white/70' : 'text-white/30'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {isPolling && (
              <p className="text-xs text-white/30 text-center mt-4">
                Processing takes 5–8 minutes. Keep this page open so all 3 options finish generating.
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

        {isDone && finalUrls.length > 0 && (
          <div className="space-y-6">
            <p className="text-sm text-white/50">
              3 generated song options built from your voice. Preview the full song or listen to the instrumental by itself.
            </p>

            {/* Clean Vocal Preview */}
            {cleanVocalUrl && (
              <div className="border border-white/10 rounded-xl p-4 bg-white/[0.02]">
                <div className="flex items-center gap-3 mb-2">
                  <Mic className="h-4 w-4 text-white/50" />
                  <span className="text-xs text-white/50 uppercase tracking-wider font-medium">Your Clean Vocal</span>
                </div>
                <audio src={cleanVocalUrl} controls className="w-full h-8 opacity-70" style={{ filter: 'invert(1)' }} />
              </div>
            )}

            {/* Beat Variations */}
            {finalUrls.map((url, i) => {
              const isBeatPlaying = playingType === `beat_${i}`;
              const isBothPlaying = playingType === `both_${i}`;
              const labels = ['Original', 'Energetic', 'Intimate'];

              return (
                <div key={i} className={`border rounded-xl p-4 transition-colors ${
                  i === 0 ? 'border-white/20 bg-white/5' : 'border-white/10 bg-white/[0.02]'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-white">Variation {i + 1} — {labels[i] || 'Beat'}</p>
                      <p className="text-xs text-white/40">{project.genre || 'Auto-detected'} instrumental</p>
                    </div>
                    {i === 0 && (
                      <span className="text-[10px] bg-white/10 text-white/60 px-2 py-0.5 rounded-full">⭐ Recommended</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    {/* Play beat only */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => playBeat(i)}
                      className={`flex-1 border-white/10 text-white text-xs h-9 ${isBeatPlaying ? 'bg-white/10' : 'hover:bg-white/5'}`}
                    >
                      {isBeatPlaying ? <Pause className="h-3.5 w-3.5 mr-1.5" /> : <Play className="h-3.5 w-3.5 mr-1.5" />}
                       Instrumental Only
                    </Button>

                    {/* Play vocal + beat synced */}
                    {cleanVocalUrl && (
                      <Button
                        size="sm"
                        onClick={() => playBothSync(i)}
                        className={`flex-1 text-xs h-9 ${isBothPlaying ? 'bg-white text-black' : 'bg-white/90 text-black hover:bg-white'}`}
                      >
                        {isBothPlaying ? <Pause className="h-3.5 w-3.5 mr-1.5" /> : <Play className="h-3.5 w-3.5 mr-1.5" />}
                         Generated Song Preview
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <a href={url} download className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white">
                      <Download className="h-4 w-4" />
                    </a>
                    <Button
                      size="sm"
                      onClick={() => onSelectVariation(i)}
                      className="bg-white text-black hover:bg-white/80 text-xs ml-auto"
                    >
                        Open Result
                    </Button>
                  </div>
                </div>
              );
            })}

            {project.generated_prompt && (
              <div className="border border-white/5 rounded-xl p-4 bg-white/[0.01]">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">AI-Generated Prompt</p>
                <p className="text-xs text-white/40 leading-relaxed">{project.generated_prompt.slice(0, 300)}...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
