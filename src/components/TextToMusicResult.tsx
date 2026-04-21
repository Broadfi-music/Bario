import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Music2, Sparkles, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';

export interface TextToMusicVariation {
  audioUrl: string;
  coverUrl?: string | null;
  trackId?: string | null;
}

interface TextToMusicResultProps {
  trackTitle?: string;
  genre?: string;
  prompt?: string;
  variations: TextToMusicVariation[];
  onBack?: () => void;
}

const variationLabels = ['Take 1', 'Take 2', 'Take 3', 'Take 4'];

export default function TextToMusicResult({
  trackTitle = 'AI Track',
  genre = 'AI',
  prompt = '',
  variations,
  onBack,
}: TextToMusicResultProps) {
  const navigate = useNavigate();
  const { currentTrack, isPlaying, playTrack, pauseTrack } = useAudioPlayer();

  const handleBack = () => {
    if (onBack) { onBack(); return; }
    navigate(-1);
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      console.error('Download failed', e);
    }
  };

  const togglePlay = (variation: TextToMusicVariation, index: number) => {
    const id = variation.trackId || `text-to-music-${index}-${variation.audioUrl}`;
    if (currentTrack?.id === id && isPlaying) {
      pauseTrack();
      return;
    }
    playTrack({
      id,
      title: `${trackTitle} — ${variationLabels[index] || `Take ${index + 1}`}`,
      artist: genre || 'AI music',
      audioUrl: variation.audioUrl,
      coverUrl: variation.coverUrl || undefined,
      type: 'music',
    });
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBack} className="text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-xs uppercase tracking-wider text-white/40">Generated track</p>
            <h1 className="text-2xl font-semibold sm:text-3xl">{trackTitle}</h1>
          </div>
        </div>

        {prompt ? (
          <Card className="border-white/10 bg-white/5 p-4">
            <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Prompt</p>
            <p className="text-sm text-white/80 leading-relaxed">{prompt}</p>
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          {variations.map((variation, index) => {
            const id = variation.trackId || `text-to-music-${index}-${variation.audioUrl}`;
            const isThisPlaying = currentTrack?.id === id && isPlaying;

            return (
              <Card key={id} className="overflow-hidden border-white/10 bg-white/5">
                <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-purple-700/40 via-pink-600/30 to-orange-500/30">
                  {variation.coverUrl ? (
                    <img
                      src={variation.coverUrl}
                      alt={`${trackTitle} cover ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Music2 className="h-16 w-16 text-white/40" />
                    </div>
                  )}
                  <button
                    onClick={() => togglePlay(variation, index)}
                    className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors group"
                  >
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black opacity-0 group-hover:opacity-100 transition-opacity shadow-2xl">
                      {isThisPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 ml-1" />}
                    </span>
                  </button>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-medium text-white/80">
                        <Sparkles className="h-3 w-3" />
                        {variationLabels[index] || `Take ${index + 1}`}
                      </div>
                      <p className="mt-1.5 text-sm font-semibold">{trackTitle}</p>
                      <p className="text-xs text-white/50">{genre}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => togglePlay(variation, index)}
                      className="bg-white text-black hover:bg-white/90 h-8 rounded-full px-3"
                    >
                      {isThisPlaying ? <Pause className="h-3.5 w-3.5 mr-1.5" /> : <Play className="h-3.5 w-3.5 mr-1.5" />}
                      {isThisPlaying ? 'Pause' : 'Play'}
                    </Button>
                  </div>

                  <audio
                    controls
                    preload="metadata"
                    src={variation.audioUrl}
                    className="w-full h-8 opacity-70"
                    style={{ filter: 'invert(1)' }}
                  />

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(variation.audioUrl, `${trackTitle}-${variationLabels[index] || `take-${index + 1}`}.mp3`)}
                    className="w-full border-white/10 bg-transparent text-white hover:bg-white/10 h-8 text-xs"
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Download
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        <p className="text-[10px] text-white/30 text-center">
          All generated tracks are saved automatically to your Projects.
        </p>
      </div>
    </div>
  );
}
