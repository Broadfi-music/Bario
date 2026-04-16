import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Loader2, Music2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AudioProcessor } from '@/lib/audioProcessor';
import type { FxConfig } from '@/hooks/useAudioRemix';

interface MusicResultProps {
  trackTitle?: string;
  genre?: string;
  era?: string;
  prompt?: string;
  onBack?: () => void;
  albumArt?: string;
  trackId?: string;
  fxConfig?: FxConfig;
  audioUrl?: string;
}

const albumGradients = [
  'from-primary/80 via-primary to-accent/80',
  'from-accent/80 via-primary/70 to-secondary',
  'from-secondary via-primary/80 to-accent/70',
];

const getRandomGradient = () => albumGradients[Math.floor(Math.random() * albumGradients.length)];

export const MusicResult = ({
  trackTitle = 'My Remix',
  genre = 'Pop',
  era = '2025',
  prompt = '',
  onBack,
  albumArt,
  trackId,
  fxConfig,
  audioUrl,
}: MusicResultProps) => {
  const navigate = useNavigate();
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState('');
  const [albumGradient] = useState(getRandomGradient);

  useEffect(() => {
    if (!audioUrl || !fxConfig) {
      setGeneratedAudioUrl(null);
      setGenerationError('No generated remix is available for this request yet.');
      setIsGenerating(false);
      return;
    }

    let active = true;
    const processor = new AudioProcessor();

    const buildGeneratedRemix = async () => {
      try {
        setIsGenerating(true);
        setGenerationError(null);
        setProcessingStatus('Loading original audio...');

        await processor.loadAudioUrl(audioUrl);
        if (!active) return;

        setProcessingStatus('Creating generated remix...');
        const processedBlob = await processor.processAndExport(fxConfig);

        if (!active) return;
        if (!processedBlob) {
          throw new Error('The remix engine did not return a generated track.');
        }

        const objectUrl = URL.createObjectURL(processedBlob);
        setGeneratedAudioUrl((previousUrl) => {
          if (previousUrl) URL.revokeObjectURL(previousUrl);
          return objectUrl;
        });
        setProcessingStatus('Generated remix ready');
      } catch (error) {
        console.error('Generated remix failed:', error);
        if (!active) return;
        setGeneratedAudioUrl((previousUrl) => {
          if (previousUrl) URL.revokeObjectURL(previousUrl);
          return null;
        });
        setGenerationError(error instanceof Error ? error.message : 'Could not create the generated remix.');
        setProcessingStatus('');
      } finally {
        if (active) {
          setIsGenerating(false);
        }
        processor.destroy();
      }
    };

    buildGeneratedRemix();

    return () => {
      active = false;
      processor.destroy();
    };
  }, [audioUrl, fxConfig]);

  useEffect(() => {
    return () => {
      if (generatedAudioUrl) {
        URL.revokeObjectURL(generatedAudioUrl);
      }
    };
  }, [generatedAudioUrl]);

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    navigate(-1);
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-sm text-muted-foreground">AI Remix result</p>
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">{trackTitle}</h1>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="overflow-hidden border-border/60 bg-card/80">
            <div className="aspect-square overflow-hidden">
              {albumArt ? (
                <img src={albumArt} alt={`${trackTitle} artwork`} className="h-full w-full object-cover" />
              ) : (
                <div className={`flex h-full w-full flex-col items-center justify-center gap-4 bg-gradient-to-br ${albumGradient} p-8 text-primary-foreground`}>
                  <Music2 className="h-16 w-16" />
                  <div className="text-center">
                    <p className="text-xl font-semibold">{trackTitle}</p>
                    <p className="text-sm opacity-80">{genre} remix</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 p-5">
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                <span>{genre}</span>
                <span>•</span>
                <span>{era}</span>
                {trackId ? (
                  <>
                    <span>•</span>
                    <span className="truncate">{trackId.slice(0, 8)}</span>
                  </>
                ) : null}
              </div>
              {prompt ? (
                <p className="rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">“{prompt}”</p>
              ) : null}
            </div>
          </Card>

          <div className="grid gap-4">
            <Card className="border-border/60 bg-card/80 p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    Generated remix
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This should be the transformed version of your upload, not the untouched original.
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={!generatedAudioUrl}
                  onClick={() => generatedAudioUrl && handleDownload(generatedAudioUrl, `${trackTitle}-generated.wav`)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>

              {isGenerating ? (
                <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 px-6 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Generating remix…</p>
                    <p className="text-sm text-muted-foreground">{processingStatus}</p>
                  </div>
                </div>
              ) : generatedAudioUrl ? (
                <div className="space-y-3 rounded-2xl border border-border bg-background/70 p-4">
                  <audio controls preload="metadata" src={generatedAudioUrl} className="w-full" />
                  <p className="text-sm text-muted-foreground">
                    Generated from your prompt and AI remix settings.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                  {generationError || 'No generated remix is available.'}
                </div>
              )}
            </Card>

            <Card className="border-border/60 bg-card/80 p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                    <Music2 className="h-3.5 w-3.5" />
                    Original upload
                  </div>
                  <p className="text-sm text-muted-foreground">Your source audio for side-by-side comparison.</p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={!audioUrl}
                  onClick={() => audioUrl && handleDownload(audioUrl, `${trackTitle}-original`)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>

              {audioUrl ? (
                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <audio controls preload="metadata" src={audioUrl} className="w-full" />
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                  No original audio was attached to this remix.
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicResult;