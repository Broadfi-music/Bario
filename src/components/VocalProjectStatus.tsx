import { useState, useRef } from 'react';
import { ArrowLeft, Play, Pause, Check, Download, Music, Loader2, Mic, Headphones, Sliders, Disc3, Layers } from 'lucide-react';
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
  { key: 'cleaning', label: 'Vocal Cleaning', icon: Mic },
  { key: 'analyzing', label: 'Audio Analysis & Prompt', icon: Music },
  { key: 'generating', label: 'Beat Generation (Lyria 3 Pro)', icon: Disc3 },
  { key: 'cloning', label: 'Voice Harmonies', icon: Headphones },
  { key: 'mixing', label: 'Mixing (FFmpeg)', icon: Sliders },
  { key: 'mastering', label: 'Mastering', icon: Layers },
  { key: 'stems', label: 'Stem Generation', icon: Music },
  { key: 'done', label: 'Complete', icon: Check },
];

const STATUS_ORDER = ['pending', 'cleaning', 'analyzing', 'generating', 'cloning', 'mixing', 'mastering', 'stems', 'done'];

export default function VocalProjectStatus({ project, statusLabel, progress, isPolling, onBack, onSelectVariation }: Props) {
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentStepIndex = STATUS_ORDER.indexOf(project.status);
  const isDone = project.status === 'done';
  const isError = project.status === 'error';
  const finalUrls = (project.final_urls || []) as string[];

  const togglePlay = (index: number) => {
    if (playingIndex === index) {
      audioRef.current?.pause();
      setPlayingIndex(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(finalUrls[index]);
      audio.play();
      audio.onended = () => setPlayingIndex(null);
      audioRef.current = audio;
      setPlayingIndex(index);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto p-4 sm:p-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold">
            {isDone ? 'Your Song is Ready' : isError ? 'Processing Failed' : 'Creating Your Song'}
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
                Processing takes 12–18 minutes. You can leave this page and come back.
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
          <div className="space-y-4">
            <p className="text-sm text-white/50 mb-4">
              Listen to your {finalUrls.length} variation{finalUrls.length > 1 ? 's' : ''} and pick your favorite. Your real voice is preserved.
            </p>

            {finalUrls.map((url, i) => {
              const isPlaying = playingIndex === i;
              const isFirst = i === 0;
              const label = isFirst ? 'Full Version (3 min)' : `Preview ${i + 1} (30s)`;

              return (
                <div key={i} className={`border rounded-xl p-4 flex items-center gap-4 transition-colors ${
                  isFirst ? 'border-white/20 bg-white/5' : 'border-white/10 bg-white/[0.02]'
                }`}>
                  <button
                    onClick={() => togglePlay(i)}
                    className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0 hover:bg-white/80 transition-colors"
                  >
                    {isPlaying ? <Pause className="h-5 w-5 text-black" /> : <Play className="h-5 w-5 text-black ml-0.5" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">Variation {i + 1}</p>
                    <p className="text-xs text-white/40">{label}</p>
                    {isFirst && (
                      <span className="inline-block mt-1 text-[10px] bg-white/10 text-white/60 px-2 py-0.5 rounded-full">
                        ⭐ Recommended
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <a href={url} download className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white">
                      <Download className="h-4 w-4" />
                    </a>
                    <Button
                      size="sm"
                      onClick={() => onSelectVariation(i)}
                      className="bg-white text-black hover:bg-white/80 text-xs"
                    >
                      Select
                    </Button>
                  </div>
                </div>
              );
            })}

            {!project.is_paid && finalUrls.length > 1 && (
              <p className="text-xs text-white/30 text-center mt-2">
                Upgrade to Pro to get all variations in full 3-minute length.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
