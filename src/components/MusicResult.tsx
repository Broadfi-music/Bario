import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Play, Pause, Download, Share2, MoreVertical, 
  Copy, Music, ListMusic, Globe, Heart, SkipBack, SkipForward,
  Volume2, Loader2, Settings2
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
import { supabase } from '@/integrations/supabase/client';
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

export const MusicResult = ({ 
  trackTitle = "My Remix", 
  genre = "Amapiano",
  era = "2025",
  prompt = "",
  onBack,
  albumArt,
  trackId,
  fxConfig,
  audioUrl
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

  const [isPublished, setIsPublished] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = () => {
    requireAuth('publish', async () => {
      if (isPublished || isPublishing) return;
      setIsPublishing(true);
      try {
        const { error } = await supabase.from('remixes').insert({
          user_id: user!.id,
          title: trackTitle,
          genre: genre,
          prompt: prompt || null,
          original_file_url: audioUrl || null,
          remix_file_url: processedAudioUrl || audioUrl || null,
          album_art_url: albumArt || null,
          is_published: true,
        });
        if (error) throw error;
        setIsPublished(true);
        toast.success('Remix published to Songs!');
      } catch (err) {
        console.error('Publish error:', err);
        toast.error('Failed to publish remix');
      } finally {
        setIsPublishing(false);
      }
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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Your Remix</h1>
        </div>

        {/* Main Content */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Album Art */}
          <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl relative">
            {albumArt ? (
              <img src={albumArt} alt="Album Art" className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${albumGradient} flex items-center justify-center`}>
                <div className="text-center text-white">
                  <Music className="h-24 w-24 mx-auto mb-4 opacity-80" />
                  <p className="text-2xl font-bold">{trackTitle}</p>
                  <p className="text-lg opacity-80">{genre}</p>
                </div>
              </div>
            )}
            {isProcessing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center flex-col gap-2">
                <Loader2 className="h-12 w-12 animate-spin text-white" />
                <p className="text-white text-sm">{processingStatus || 'Processing...'}</p>
              </div>
            )}
          </div>

          {/* Track Info & Controls */}
          <div className="flex flex-col justify-center space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2">{trackTitle}</h2>
              <p className="text-lg text-muted-foreground">{genre} Remix • {era}</p>
              {prompt && (
                <p className="text-sm text-muted-foreground mt-2 italic">"{prompt}"</p>
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

            {/* Audio Player */}
            <Card className="p-6 bg-card/50 backdrop-blur">
              {/* Progress Bar */}
              <div className="mb-4">
                <Slider
                  value={progress}
                  onValueChange={handleProgressChange}
                  max={100}
                  step={0.1}
                  className="cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{duration > 0 ? formatTime(duration) : '3:42'}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4 mb-4">
                <Button variant="ghost" size="icon">
                  <SkipBack className="h-5 w-5" />
                </Button>
                <Button 
                  size="icon" 
                  className="h-14 w-14 rounded-full bg-foreground text-background hover:bg-foreground/90"
                  onClick={togglePlayPause}
                  disabled={isProcessing}
                >
                  {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
                </Button>
                <Button variant="ghost" size="icon">
                  <SkipForward className="h-5 w-5" />
                </Button>
              </div>

              {/* Volume */}
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

            {/* Action Buttons */}
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

              {/* Three Dot Menu */}
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