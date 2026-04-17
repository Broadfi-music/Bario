import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Mic, Music2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface VocalSongResultProps {
  trackTitle?: string;
  genre?: string;
  prompt?: string;
  originalVocalUrl?: string;
  songOptions?: string[];
  selectedVariation?: number;
  onBack?: () => void;
}

const variationMeta = [
  { label: 'Option 1 — MusicGen Melody', description: 'Instrumental that follows your vocal melody and phrasing.' },
  { label: 'Option 2 — MusicGen Stereo', description: 'Polished stereo arrangement built from your prompt + key/BPM.' },
  { label: 'Option 3 — Stable Audio', description: 'Alternative energetic take generated from your prompt.' },
];

export default function VocalSongResult({
  trackTitle = 'Vocal Song',
  genre = 'Pop',
  prompt = '',
  originalVocalUrl,
  songOptions = [],
  selectedVariation = 0,
  onBack,
}: VocalSongResultProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) { onBack(); return; }
    navigate(-1);
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-sm text-muted-foreground">Vocal to song result</p>
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">{trackTitle}</h1>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="overflow-hidden border-border/60 bg-card/80">
            <div className="flex aspect-square flex-col items-center justify-center gap-4 bg-gradient-to-br from-primary/70 via-primary/40 to-secondary p-8 text-primary-foreground">
              <Music2 className="h-16 w-16" />
              <div className="text-center">
                <p className="text-xl font-semibold">{trackTitle}</p>
                <p className="text-sm opacity-80">{genre} • Mixed & mastered</p>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                <span>{genre}</span>
                <span>•</span>
                <span>Your real voice preserved</span>
              </div>

              {prompt ? (
                <p className="rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">"{prompt}"</p>
              ) : null}

              <div className="rounded-2xl border border-border bg-background/70 p-4">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                  <Mic className="h-3.5 w-3.5" />
                  Cleaned vocal
                </div>
                {originalVocalUrl ? (
                  <audio controls preload="metadata" src={originalVocalUrl} className="w-full" />
                ) : (
                  <p className="text-sm text-destructive">No vocal source attached.</p>
                )}
              </div>
            </div>
          </Card>

          <div className="grid gap-4">
            {songOptions.length === 0 ? (
              <Card className="border-dashed border-border/60 bg-card/40 p-8 text-center text-sm text-muted-foreground">
                No mastered songs were returned by the pipeline.
              </Card>
            ) : songOptions.map((songUrl, index) => {
              const meta = variationMeta[index] || { label: `Option ${index + 1}`, description: 'Generated arrangement.' };
              const isSelected = index === selectedVariation;

              return (
                <Card key={`${songUrl}-${index}`} className="border-border/60 bg-card/80 p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        <Sparkles className="h-3.5 w-3.5" />
                        {meta.label}
                      </div>
                      <p className="text-sm text-muted-foreground">{meta.description}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isSelected ? (
                        <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                          Selected
                        </span>
                      ) : null}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(songUrl, `${trackTitle}-option-${index + 1}.wav`)}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-background/70 p-4">
                    <p className="mb-3 text-sm font-medium text-foreground">Mastered song</p>
                    <audio controls preload="metadata" src={songUrl} className="w-full" />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
