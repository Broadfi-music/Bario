import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Loader2, Mic, Music2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { renderMixedSong } from '@/lib/audioMixer';

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
  { label: 'Option 1', description: 'Balanced studio mix with the clearest pop arrangement.' },
  { label: 'Option 2', description: 'Punchier drums and more energy for a bigger chorus feel.' },
  { label: 'Option 3', description: 'Softer and moodier with a more intimate arrangement.' },
];

const createEmptyFlags = (count: number) => Array.from({ length: count }, () => false);
const createEmptyErrors = (count: number) => Array.from({ length: count }, () => null as string | null);
const createEmptyUrls = (count: number) => Array.from({ length: count }, () => null as string | null);

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
  const [renderedSongs, setRenderedSongs] = useState<(string | null)[]>(() => createEmptyUrls(songOptions.length));
  const [renderingStates, setRenderingStates] = useState<boolean[]>(() => createEmptyFlags(songOptions.length));
  const [renderErrors, setRenderErrors] = useState<(string | null)[]>(() => createEmptyErrors(songOptions.length));

  const renderOrder = useMemo(() => {
    const safeIndex = Math.min(Math.max(selectedVariation, 0), Math.max(songOptions.length - 1, 0));
    const remaining = songOptions.map((_, index) => index).filter((index) => index !== safeIndex);
    return songOptions.length > 0 ? [safeIndex, ...remaining] : [];
  }, [selectedVariation, songOptions]);

  useEffect(() => {
    if (!originalVocalUrl || songOptions.length === 0) {
      setRenderedSongs(createEmptyUrls(songOptions.length));
      setRenderingStates(createEmptyFlags(songOptions.length));
      setRenderErrors(createEmptyErrors(songOptions.length));
      return;
    }

    let cancelled = false;
    const createdUrls: string[] = [];

    setRenderedSongs(createEmptyUrls(songOptions.length));
    setRenderingStates(createEmptyFlags(songOptions.length));
    setRenderErrors(createEmptyErrors(songOptions.length));

    const renderAllSongs = async () => {
      for (const optionIndex of renderOrder) {
        if (cancelled) return;

        setRenderingStates((previous) => {
          const next = [...previous];
          next[optionIndex] = true;
          return next;
        });

        try {
          const blob = await renderMixedSong({
            vocalUrl: originalVocalUrl,
            instrumentalUrl: songOptions[optionIndex],
            vocalGain: optionIndex === selectedVariation ? 1.12 : 1.08,
            instrumentalGain: optionIndex === selectedVariation ? 0.76 : 0.72,
          });

          if (cancelled) return;

          const objectUrl = URL.createObjectURL(blob);
          createdUrls.push(objectUrl);

          setRenderedSongs((previous) => {
            const next = [...previous];
            next[optionIndex] = objectUrl;
            return next;
          });

          setRenderErrors((previous) => {
            const next = [...previous];
            next[optionIndex] = null;
            return next;
          });
        } catch (error) {
          if (cancelled) return;

          setRenderErrors((previous) => {
            const next = [...previous];
            next[optionIndex] = error instanceof Error ? error.message : 'Could not render this song option.';
            return next;
          });
        } finally {
          if (!cancelled) {
            setRenderingStates((previous) => {
              const next = [...previous];
              next[optionIndex] = false;
              return next;
            });
          }
        }
      }
    };

    renderAllSongs();

    return () => {
      cancelled = true;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [originalVocalUrl, renderOrder, selectedVariation, songOptions]);

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

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
                <p className="text-sm opacity-80">{genre} • 3 song options</p>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                <span>{genre}</span>
                <span>•</span>
                <span>Lead voice preserved</span>
              </div>

              {prompt ? (
                <p className="rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">“{prompt}”</p>
              ) : null}

              <div className="rounded-2xl border border-border bg-background/70 p-4">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                  <Mic className="h-3.5 w-3.5" />
                  Original vocal
                </div>
                {originalVocalUrl ? (
                  <audio controls preload="metadata" src={originalVocalUrl} className="w-full" />
                ) : (
                  <p className="text-sm text-destructive">No vocal source was attached to this generation.</p>
                )}
              </div>
            </div>
          </Card>

          <div className="grid gap-4">
            {songOptions.map((songUrl, index) => {
              const mixedSongUrl = renderedSongs[index];
              const isRendering = renderingStates[index];
              const error = renderErrors[index];
              const meta = variationMeta[index] || {
                label: `Option ${index + 1}`,
                description: 'Alternate generated arrangement.',
              };
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
                        disabled={!mixedSongUrl}
                        onClick={() => mixedSongUrl && handleDownload(mixedSongUrl, `${trackTitle}-option-${index + 1}.wav`)}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  </div>

                  {isRendering ? (
                    <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 px-6 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <div>
                        <p className="font-medium text-foreground">Rendering full song…</p>
                        <p className="text-sm text-muted-foreground">Mixing your vocal with the generated instrumental.</p>
                      </div>
                    </div>
                  ) : mixedSongUrl ? (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-border bg-background/70 p-4">
                        <p className="mb-3 text-sm font-medium text-foreground">Generated song</p>
                        <audio controls preload="metadata" src={mixedSongUrl} className="w-full" />
                      </div>

                      <div className="rounded-2xl border border-border bg-background/70 p-4">
                        <p className="mb-3 text-sm font-medium text-foreground">Instrumental only</p>
                        <audio controls preload="metadata" src={songUrl} className="w-full" />
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                      {error || 'This song option could not be rendered.'}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}