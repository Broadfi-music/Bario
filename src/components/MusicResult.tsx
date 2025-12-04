import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Play, Pause, Download, Share2, MoreVertical, 
  Copy, Music, ListMusic, Globe, Heart, SkipBack, SkipForward,
  Volume2
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

interface MusicResultProps {
  trackTitle?: string;
  genre?: string;
  prompt?: string;
  onBack?: () => void;
  albumArt?: string;
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
  prompt = "",
  onBack,
  albumArt
}: MusicResultProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState([30]);
  const [volume, setVolume] = useState([75]);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  
  const albumGradient = useState(generateAlbumArt())[0];

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

  const handleDownload = (format: 'mp3' | 'wav') => {
    requireAuth('download', () => {
      toast.success(`Downloading as ${format.toUpperCase()}...`);
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
          <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl">
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
          </div>

          {/* Track Info & Controls */}
          <div className="flex flex-col justify-center space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2">{trackTitle}</h2>
              <p className="text-lg text-muted-foreground">{genre} Remix</p>
              {prompt && (
                <p className="text-sm text-muted-foreground mt-2 italic">"{prompt}"</p>
              )}
            </div>

            {/* Audio Player */}
            <Card className="p-6 bg-card/50 backdrop-blur">
              {/* Progress Bar */}
              <div className="mb-4">
                <Slider
                  value={progress}
                  onValueChange={setProgress}
                  max={100}
                  step={1}
                  className="cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>1:15</span>
                  <span>3:42</span>
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
                  onClick={() => setIsPlaying(!isPlaying)}
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
                  onValueChange={setVolume}
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
      </div>
    </div>
  );
};

export default MusicResult;
