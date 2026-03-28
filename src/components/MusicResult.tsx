import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Play, Pause, Download, Share2, MoreVertical, 
  Copy, Music, ListMusic, Globe, Heart, SkipBack, SkipForward,
  Volume2, Loader2, Settings2, CheckCircle2, Clock3, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
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
  sourceAudioUrl?: string;
  sourceMediaUrl?: string;
  sourceMediaKind?: string;
  backendPending?: boolean;
  backendMessage?: string;
  comparisonSummary?: string;
  changes?: string[];
  modelsUsed?: string[];
  currentStage?: string;
}

interface PreviewPlayerCardProps {
  title: string;
  statusLabel?: string;
  audioUrl?: string;
  emptyMessage: string;
}

const formatPlaybackTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Generate random album art colors
const generateAlbumArt = () => {
  const colors = [
    'from-purple-500 via-pink-500 to-red-500',
    'from-blue-500 via-teal-500 to-green-500',
    'from-orange-500 via-red-500 to-pink-500',
    'from-indigo-500 via-purple-500 to-pink-500',
    'from-green-500 via-teal-500 to-blue-500',
    'from-yellow-500 via-orange-500 to-red-500',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

const PreviewPlayerCard = ({ title, statusLabel, audioUrl, emptyMessage }: PreviewPlayerCardProps) => {
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState([80]);
  const [progress, setProgress] = useState([0]);

  useEffect(() => {
    const audio = audioElementRef.current;
    if (!audio || !audioUrl) {
      setIsPlaying(false);
      setDuration(0);
      setCurrentTime(0);
      setProgress([0]);
      return;
    }

    const syncLoaded = () => setDuration(audio.duration || 0);
    const syncTime = () => {
      const nextTime = audio.currentTime || 0;
      const total = audio.duration || 1;
      setCurrentTime(nextTime);
      setProgress([(nextTime / total) * 100]);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setProgress([0]);
    };

    audio.volume = volume[0] / 100;
    audio.addEventListener('loadedmetadata', syncLoaded);
    audio.addEventListener('timeupdate', syncTime);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', syncLoaded);
      audio.removeEventListener('timeupdate', syncTime);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioUrl]);

  const togglePlay = async () => {
    const audio = audioElementRef.current;
    if (!audio || !audioUrl) {
      return;
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      toast.error('Could not play this preview.');
    }
  };

  const handleProgressChange = (nextProgress: number[]) => {
    setProgress(nextProgress);
    const audio = audioElementRef.current;
    if (!audio || duration <= 0) {
      return;
    }
    audio.currentTime = (nextProgress[0] / 100) * duration;
  };

  const handleVolumeChange = (nextVolume: number[]) => {
    setVolume(nextVolume);
    const audio = audioElementRef.current;
    if (!audio) {
      return;
    }
    audio.volume = nextVolume[0] / 100;
  };

  const jumpBy = (deltaSeconds: number) => {
    const audio = audioElementRef.current;
    if (!audio) {
      return;
    }
    audio.currentTime = Math.max(0, Math.min((audio.duration || 0), audio.currentTime + deltaSeconds));
  };

  return (
    <Card className="rounded-3xl border border-foreground/10 bg-card/50 p-5 backdrop-blur min-h-[260px]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{title}</p>
        {statusLabel && <span className="text-[11px] text-muted-foreground">{statusLabel}</span>}
      </div>

      {audioUrl ? (
        <div className="mt-4 rounded-[28px] border border-foreground/10 bg-background/60 p-5 space-y-4">
          <audio ref={audioElementRef} src={audioUrl} preload="metadata" className="hidden" />

          <div>
            <Slider
              value={progress}
              onValueChange={handleProgressChange}
              max={100}
              step={0.1}
              className="cursor-pointer"
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>{formatPlaybackTime(currentTime)}</span>
              <span>{duration > 0 ? formatPlaybackTime(duration) : '0:00'}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => jumpBy(-10)}>
              <SkipBack className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              className="h-16 w-16 rounded-full bg-foreground text-background hover:bg-foreground/90"
              onClick={togglePlay}
            >
              {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 ml-1" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => jumpBy(10)}>
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <Slider
              value={volume}
              onValueChange={handleVolumeChange}
              max={100}
              step={1}
              className="flex-1"
            />
          </div>
        </div>
      ) : (
        <div className="mt-4 flex min-h-[185px] items-center rounded-[28px] border border-dashed border-foreground/10 bg-background/40 px-6 py-10 text-sm leading-7 text-muted-foreground">
          {emptyMessage}
        </div>
      )}
    </Card>
  );
};

export const MusicResult = ({ 
  trackTitle = "My Remix", 
  genre = "Amapiano",
  era = "2025",
  prompt = "",
  onBack,
  albumArt,
  trackId,
  fxConfig,
  audioUrl,
  sourceAudioUrl,
  sourceMediaUrl,
  sourceMediaKind,
  backendPending = false,
  backendMessage,
  comparisonSummary,
  changes = [],
  modelsUsed = [],
  currentStage,
}: MusicResultProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState([0]);
  const [volume, setVolume] = useState([75]);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);
  const [isFxConfigOpen, setIsFxConfigOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioProcessorRef = useRef<AudioProcessor | null>(null);
  const albumGradient = useState(generateAlbumArt())[0];

  const [processedAudioUrl, setProcessedAudioUrl] = useState<string | null>(null);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const hasSourcePreview = Boolean(sourceAudioUrl || sourceMediaUrl);
  const hasRemixOutput = Boolean(audioUrl && !backendPending);
  const isAiRemixResult = Boolean(hasSourcePreview || backendPending || comparisonSummary || changes.length > 0);
  const statusVariant = backendPending ? 'processing' : hasRemixOutput ? 'completed' : 'failed';
  const statusLabel = backendPending ? 'Processing' : hasRemixOutput ? 'Ready' : 'Needs attention';
  const statusDetail = backendPending
    ? backendMessage || 'The AI remix pipeline is still working.'
    : hasRemixOutput
      ? 'The remixed song is ready to play, download, and share.'
      : backendMessage || 'The remix output is not available yet.';

  // Initialize audio processor and load audio
  useEffect(() => {
    audioProcessorRef.current = new AudioProcessor();
    
    return () => {
      if (audioProcessorRef.current) {
        audioProcessorRef.current.destroy();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (processedAudioUrl) {
        URL.revokeObjectURL(processedAudioUrl);
      }
    };
  }, []);

  // Process audio with FX when URL and config are available
  useEffect(() => {
    if (audioUrl && fxConfig && audioProcessorRef.current && !audioLoaded) {
      const processAudio = async () => {
        try {
          setIsProcessing(true);
          setProcessingStatus('Loading audio...');
          
          // Load the audio into the processor
          await audioProcessorRef.current!.loadAudioUrl(audioUrl);
          
          setProcessingStatus('Applying effects...');
          
          // Process with FX and get the resulting blob
          const processedBlob = await audioProcessorRef.current!.processAndExport(fxConfig);
          
          if (processedBlob) {
            const url = URL.createObjectURL(processedBlob);
            setProcessedAudioUrl(url);
            
            // Create audio element for the processed audio
            audioRef.current = new Audio(url);
            audioRef.current.addEventListener('loadedmetadata', () => {
              setDuration(audioRef.current?.duration || 0);
              setAudioLoaded(true);
              setProcessingStatus('');
            });
            audioRef.current.addEventListener('timeupdate', () => {
              const current = audioRef.current?.currentTime || 0;
              const total = audioRef.current?.duration || 1;
              setCurrentTime(current);
              setProgress([(current / total) * 100]);
            });
            audioRef.current.addEventListener('ended', () => {
              setIsPlaying(false);
              setProgress([0]);
              setCurrentTime(0);
            });
            audioRef.current.addEventListener('error', (e) => {
              console.error('Audio playback error:', e);
              setProcessingStatus('Playback error');
            });
          } else {
            setProcessingStatus('Processing failed');
          }
        } catch (err) {
          console.error('Failed to process audio:', err);
          setProcessingStatus('Failed to load audio');
          
          // Fallback: try to play original audio without FX
          try {
            audioRef.current = new Audio(audioUrl);
            audioRef.current.addEventListener('loadedmetadata', () => {
              setDuration(audioRef.current?.duration || 0);
              setAudioLoaded(true);
              setProcessingStatus('Playing original (effects not applied)');
            });
            audioRef.current.addEventListener('timeupdate', () => {
              const current = audioRef.current?.currentTime || 0;
              const total = audioRef.current?.duration || 1;
              setCurrentTime(current);
              setProgress([(current / total) * 100]);
            });
            audioRef.current.addEventListener('ended', () => {
              setIsPlaying(false);
              setProgress([0]);
              setCurrentTime(0);
            });
          } catch (fallbackErr) {
            console.error('Fallback audio also failed:', fallbackErr);
          }
        } finally {
          setIsProcessing(false);
        }
      };
      processAudio();
    } else if (audioUrl && !fxConfig && !audioLoaded) {
      // No FX config, just play original
      audioRef.current = new Audio(audioUrl);
      audioRef.current.addEventListener('loadedmetadata', () => {
        setDuration(audioRef.current?.duration || 0);
        setAudioLoaded(true);
      });
      audioRef.current.addEventListener('timeupdate', () => {
        const current = audioRef.current?.currentTime || 0;
        const total = audioRef.current?.duration || 1;
        setCurrentTime(current);
        setProgress([(current / total) * 100]);
      });
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        setProgress([0]);
        setCurrentTime(0);
      });
    }
  }, [audioUrl, fxConfig, audioLoaded]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const requireAuth = (action: string, callback: () => void) => {
    if (!user) {
      setPendingAction(action);
      setIsAuthPromptOpen(true);
      return;
    }
    callback();
  };

  const togglePlayPause = async () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (err) {
          console.error('Playback error:', err);
          toast.error('Failed to play audio');
        }
      }
    } else if (!audioUrl) {
      // Demo mode - no actual audio
      toast.info('No audio available to play');
    }
  };

  const handleProgressChange = (newProgress: number[]) => {
    setProgress(newProgress);
    if (audioRef.current && duration > 0) {
      audioRef.current.currentTime = (newProgress[0] / 100) * duration;
    }
  };

  const handleVolumeChange = (newVolume: number[]) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume[0] / 100;
    }
  };

  const handleDownload = async (format: 'mp3' | 'wav') => {
    requireAuth('download', async () => {
      if (audioUrl) {
        try {
          const response = await fetch(audioUrl);
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${trackTitle}.${format}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast.success(`Downloaded as ${format.toUpperCase()}`);
        } catch (err) {
          toast.error('Download failed');
        }
      } else {
        toast.success(`Downloading as ${format.toUpperCase()}...`);
      }
      setIsDownloadOpen(false);
    });
  };

  const handleDownloadStems = () => {
    requireAuth('download stems', () => {
      toast.success('Downloading stems...');
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  const handleShare = (platform: string) => {
    requireAuth('share', () => {
      const shareUrl = encodeURIComponent(window.location.href);
      const shareText = encodeURIComponent(`Check out my remix: ${trackTitle}`);
      
      const urls: Record<string, string> = {
        tiktok: `https://www.tiktok.com/upload`,
        instagram: `https://www.instagram.com/`,
        whatsapp: `https://wa.me/?text=${shareText}%20${shareUrl}`,
        x: `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`,
      };

      if (urls[platform]) {
        window.open(urls[platform], '_blank');
      }
      setIsShareOpen(false);
    });
  };

  const handlePublish = () => {
    requireAuth('publish', () => {
      toast.success('Track published successfully!');
    });
  };

  const handleAddToPlaylist = () => {
    requireAuth('add to playlist', () => {
      toast.success('Added to playlist!');
    });
  };

  const handleLike = () => {
    requireAuth('like', () => {
      setIsLiked(!isLiked);
      toast.success(isLiked ? 'Removed from likes' : 'Added to likes!');
    });
  };

  const openDownloadDialog = () => {
    if (!user) {
      setPendingAction('download');
      setIsAuthPromptOpen(true);
      return;
    }
    setIsDownloadOpen(true);
  };

  const openShareDialog = () => {
    if (!user) {
      setPendingAction('share');
      setIsAuthPromptOpen(true);
      return;
    }
    setIsShareOpen(true);
  };

  const goToAuth = () => {
    setIsAuthPromptOpen(false);
    navigate('/auth');
  };

  const StatusIcon = statusVariant === 'completed' ? CheckCircle2 : statusVariant === 'failed' ? AlertCircle : Clock3;
  const statusIconClass =
    statusVariant === 'completed'
      ? 'text-emerald-400'
      : statusVariant === 'failed'
        ? 'text-red-300'
        : 'text-amber-300';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Your AI Remix</h1>
            <p className="text-sm text-muted-foreground">Compare the original source with the remixed output in one place.</p>
          </div>
          {isAiRemixResult && (
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-foreground/10 bg-card/60 px-4 py-2 text-sm text-foreground/80">
              <StatusIcon className={`h-4 w-4 ${statusIconClass}`} />
              {statusLabel}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="grid gap-8 xl:grid-cols-[420px_1fr]">
          {/* Album Art */}
          <div className="space-y-4">
            <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl relative border border-foreground/10 bg-card/60">
              {albumArt ? (
                <img src={albumArt} alt="Album Art" className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${albumGradient} flex items-center justify-center`}>
                  <div className="text-center text-white px-8">
                    <Music className="h-24 w-24 mx-auto mb-4 opacity-80" />
                    <p className="text-2xl font-bold break-words">{trackTitle}</p>
                    <p className="text-lg opacity-80">{genre}</p>
                  </div>
                </div>
              )}
              {isProcessing && (
                <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center flex-col gap-2">
                  <Loader2 className="h-12 w-12 animate-spin text-white" />
                  <p className="text-white text-sm">{processingStatus || 'Processing...'}</p>
                </div>
              )}
              {backendPending && !isProcessing && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center flex-col gap-3 px-8 text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-white" />
                  <p className="text-white text-base font-medium">Building your remix</p>
                  <p className="text-white/80 text-sm">{backendMessage || 'Running the remix job...'}</p>
                </div>
              )}
            </div>

            {isAiRemixResult && (
              <Card className="rounded-2xl border border-foreground/10 bg-card/50 p-5">
                <div className="flex items-start gap-3">
                  <div className="rounded-full border border-foreground/10 bg-background/60 p-2">
                    <StatusIcon className={`h-5 w-5 ${statusIconClass}`} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{statusLabel}</p>
                    <p className="text-sm leading-6 text-muted-foreground">{statusDetail}</p>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Track Info & Controls */}
          <div className="flex flex-col justify-start space-y-6">
            <div>
              <h2 className="mb-2 text-3xl font-bold text-foreground">{trackTitle}</h2>
              <p className="text-lg text-muted-foreground">{genre} Remix • {era}</p>
              {prompt && (
                <div className="mt-4 rounded-2xl border border-foreground/10 bg-card/40 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Prompt</p>
                  <p className="mt-2 text-sm italic text-foreground/85">"{prompt}"</p>
                </div>
              )}
              {fxConfig && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-xs"
                  onClick={() => setIsFxConfigOpen(true)}
                >
                  <Settings2 className="h-3 w-3 mr-1" />
                  View FX Settings
                </Button>
              )}
            </div>

            {!isAiRemixResult && (
              <Card className="rounded-3xl border border-foreground/10 p-6 bg-card/50 backdrop-blur">
                <div className="mb-4">
                  <Slider
                    value={progress}
                    onValueChange={handleProgressChange}
                    max={100}
                    step={0.1}
                    className="cursor-pointer"
                  />
                  <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                    <span>{formatTime(currentTime)}</span>
                    <span>{duration > 0 ? formatTime(duration) : '3:42'}</span>
                  </div>
                </div>

                <div className="mb-4 flex items-center justify-center gap-4">
                  <Button variant="ghost" size="icon">
                    <SkipBack className="h-5 w-5" />
                  </Button>
                  <Button
                    size="icon"
                    className="h-14 w-14 rounded-full bg-foreground text-background hover:bg-foreground/90"
                    onClick={togglePlayPause}
                    disabled={isProcessing || backendPending}
                  >
                    {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="ml-1 h-6 w-6" />}
                  </Button>
                  <Button variant="ghost" size="icon">
                    <SkipForward className="h-5 w-5" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                  <Slider
                    value={volume}
                    onValueChange={handleVolumeChange}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                </div>
              </Card>
            )}

            {isAiRemixResult && (
              <div className="space-y-4">
                <div className="grid gap-4 xl:grid-cols-2">
                  <PreviewPlayerCard
                    title="Original Source"
                    statusLabel={sourceMediaKind === 'video' ? 'Video source' : 'Audio source'}
                    audioUrl={sourceAudioUrl}
                    emptyMessage="Waiting for the original source preview."
                  />

                  <PreviewPlayerCard
                    title="Remixed Output"
                    statusLabel={backendPending ? 'Processing' : audioUrl ? 'Ready' : 'Pending'}
                    audioUrl={audioUrl}
                    emptyMessage={
                      backendPending
                        ? 'The remixed song will appear here as soon as processing completes.'
                        : 'The remix job failed before an output file was created.'
                    }
                  />
                </div>

                {(comparisonSummary || changes.length > 0 || modelsUsed.length > 0 || currentStage) && (
                  <Card className="rounded-3xl border border-foreground/10 p-6 bg-card/50 backdrop-blur space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground mb-2">What Changed</p>
                      <div className="space-y-3">
                        {comparisonSummary && (
                          <p className="text-sm text-foreground/80 leading-6">
                            {comparisonSummary}
                          </p>
                        )}
                        {currentStage && (
                          <p className="text-xs uppercase tracking-[0.18em] text-foreground/45">
                            Latest stage: {currentStage}
                          </p>
                        )}
                        {changes.slice(0, 5).map((change) => (
                          <p key={change} className="text-sm text-muted-foreground leading-6">
                            {change}
                          </p>
                        ))}
                        {modelsUsed.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {modelsUsed.map((model) => (
                              <span
                                key={model}
                                className="rounded-full border border-foreground/10 bg-background/50 px-3 py-1 text-[11px] text-foreground/65"
                              >
                                {model}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {hasRemixOutput ? (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Actions</p>
                <div className="flex flex-wrap gap-3">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={handleLike}
                  >
                    <Heart className={`h-4 w-4 mr-2 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                    {isLiked ? 'Liked' : 'Like'}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={openDownloadDialog}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={openShareDialog}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={openShareDialog}>
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleCopyLink}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Link
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={openDownloadDialog}>
                        <Download className="h-4 w-4 mr-2" />
                        Download Music
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDownloadStems}>
                        <Music className="h-4 w-4 mr-2" />
                        Download Stems
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handlePublish}>
                        <Globe className="h-4 w-4 mr-2" />
                        Publish
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleAddToPlaylist}>
                        <ListMusic className="h-4 w-4 mr-2" />
                        Add to Playlist
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ) : isAiRemixResult ? (
              <Card className="rounded-2xl border border-foreground/10 bg-card/40 p-4 text-sm text-muted-foreground">
                Download and share controls will appear once the AI remix song is ready.
              </Card>
            ) : null}
          </div>
        </div>

        {/* Auth Required Dialog */}
        <Dialog open={isAuthPromptOpen} onOpenChange={setIsAuthPromptOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sign in required</DialogTitle>
              <DialogDescription>
                You need to sign in or create an account to {pendingAction}. It only takes a moment!
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 mt-4">
              <Button 
                onClick={goToAuth}
                className="w-full bg-foreground text-background hover:bg-foreground/90"
              >
                Sign In / Sign Up
              </Button>
              <Button 
                onClick={() => setIsAuthPromptOpen(false)}
                variant="outline"
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Download Dialog */}
        <Dialog open={isDownloadOpen} onOpenChange={setIsDownloadOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Download Format</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 mt-4">
              <Button 
                onClick={() => handleDownload('mp3')}
                className="w-full bg-background text-foreground border border-foreground/20 hover:bg-foreground/10"
              >
                Download as MP3
              </Button>
              <Button 
                onClick={() => handleDownload('wav')}
                className="w-full bg-background text-foreground border border-foreground/20 hover:bg-foreground/10"
              >
                Download as WAV
              </Button>
              <Button 
                onClick={handleDownloadStems}
                variant="outline"
                className="w-full"
              >
                Download Stems
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Share Dialog */}
        <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share Your Remix</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 mt-4">
              <Button 
                onClick={handleCopyLink}
                variant="outline"
                className="w-full"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
              <Button 
                onClick={() => handleShare('tiktok')}
                variant="outline"
                className="w-full"
              >
                Share to TikTok
              </Button>
              <Button 
                onClick={() => handleShare('instagram')}
                variant="outline"
                className="w-full"
              >
                Share to Instagram
              </Button>
              <Button 
                onClick={() => handleShare('whatsapp')}
                variant="outline"
                className="w-full"
              >
                Share to WhatsApp
              </Button>
              <Button 
                onClick={() => handleShare('x')}
                variant="outline"
                className="w-full"
              >
                Share to X
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* FX Config Dialog */}
        <Dialog open={isFxConfigOpen} onOpenChange={setIsFxConfigOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>AI-Generated FX Settings</DialogTitle>
              <DialogDescription>
                These audio effects were generated by AI based on your genre and description.
              </DialogDescription>
            </DialogHeader>
            {fxConfig && (
              <div className="space-y-3 mt-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-muted-foreground text-xs">Reverb</p>
                    <p className="font-medium">{Math.round(fxConfig.reverb_amount * 100)}%</p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-muted-foreground text-xs">Distortion</p>
                    <p className="font-medium">{Math.round(fxConfig.distortion_amount * 100)}%</p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-muted-foreground text-xs">EQ Low</p>
                    <p className="font-medium">{fxConfig.eq_low > 0 ? '+' : ''}{fxConfig.eq_low}dB</p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-muted-foreground text-xs">EQ Mid</p>
                    <p className="font-medium">{fxConfig.eq_mid > 0 ? '+' : ''}{fxConfig.eq_mid}dB</p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-muted-foreground text-xs">EQ High</p>
                    <p className="font-medium">{fxConfig.eq_high > 0 ? '+' : ''}{fxConfig.eq_high}dB</p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-muted-foreground text-xs">Stereo Width</p>
                    <p className="font-medium">{Math.round(fxConfig.stereo_width * 100)}%</p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-muted-foreground text-xs">Tempo Change</p>
                    <p className="font-medium">{fxConfig.tempo_change_percent > 0 ? '+' : ''}{fxConfig.tempo_change_percent}%</p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-muted-foreground text-xs">Compression</p>
                    <p className="font-medium">{fxConfig.compression_ratio}:1</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default MusicResult;
