import { ThreeTextAnimation } from './ThreeTextAnimation';
import { FloatingAlbumCard } from './FloatingAlbumCard';
import { Button } from '@/components/ui/button';
import { Sparkles, Plus, X, Music, Link as LinkIcon, FileAudio } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import album1 from '@/assets/album-1.jpeg';
import album2 from '@/assets/album-2.jpeg';
import album3 from '@/assets/album-3.jpeg';
import wavegrower from '@/assets/wavegrower.gif';

interface UploadedMusic {
  type: 'file' | 'url';
  name: string;
  url?: string;
}

export const Hero = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [songUrl, setSongUrl] = useState('');
  const [uploadedMusic, setUploadedMusic] = useState<UploadedMusic | null>(null);
  const [chatPrompt, setChatPrompt] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedMusic({
        type: 'file',
        name: file.name
      });
      setIsUploadDialogOpen(false);
    }
  };

  const handleUrlSubmit = () => {
    if (songUrl) {
      // Extract name from URL
      let musicName = 'Music from URL';
      try {
        const url = new URL(songUrl);
        if (url.hostname.includes('spotify')) {
          musicName = 'Spotify Track';
        } else if (url.hostname.includes('soundcloud')) {
          musicName = 'SoundCloud Track';
        } else if (url.hostname.includes('youtube')) {
          musicName = 'YouTube Audio';
        } else if (url.hostname.includes('apple')) {
          musicName = 'Apple Music Track';
        } else {
          musicName = url.pathname.split('/').pop() || 'Music Link';
        }
      } catch {
        musicName = 'Music Link';
      }
      
      setUploadedMusic({
        type: 'url',
        name: musicName,
        url: songUrl
      });
      setSongUrl('');
      setIsUploadDialogOpen(false);
    }
  };

  const removeUploadedMusic = () => {
    setUploadedMusic(null);
  };

  const handleCreate = () => {
    if (uploadedMusic || chatPrompt) {
      // Navigate to result page with state
      navigate('/music-result', {
        state: {
          trackTitle: uploadedMusic?.name || 'My Remix',
          genre: selectedGenre || 'Custom',
          prompt: chatPrompt,
          uploadedMusic
        }
      });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">
      {/* Three.js Animation Background */}
      <div className="absolute inset-0 opacity-60">
        <ThreeTextAnimation text="BARIO" />
      </div>

      {/* Floating Album Cards - Hidden on mobile */}
      <div className="hidden lg:block">
        <FloatingAlbumCard
          image={album1}
          title="Aqua Dreams"
          artist="Visual Artist"
          position="left"
          delay={0}
        />
        
        <FloatingAlbumCard
          image={album2}
          title="Shadow Light"
          artist="Dark Aesthetics"
          position="right"
          delay={0.5}
        />

        <FloatingAlbumCard
          image={album3}
          title="Dark Portrait"
          artist="Visual Noir"
          position="left"
          delay={1}
        />
      </div>

      {/* Wavegrower GIF under album cards */}
      <div className="absolute left-0 right-0 top-[60%] z-5 flex justify-center">
        <img 
          src={wavegrower} 
          alt="Waveform animation" 
          className="w-full max-w-md lg:max-w-2xl h-auto"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-2 sm:px-6 text-center">
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 animate-fade-in-up">
          {/* Main Heading */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-bold text-foreground leading-tight">
            Remix any song you can imagine
          </h1>
          
          {/* Subtitle */}
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-foreground/80 max-w-2xl mx-auto px-2">
            Start with a simple prompt or dive into our pro editing tools, your next track is just a step away.
          </p>

          {/* Uploaded Music Display */}
          {uploadedMusic && (
            <div className="flex items-center justify-center">
              <div className="bg-foreground/10 backdrop-blur-sm border border-foreground/20 rounded-lg px-4 py-2 flex items-center gap-3">
                {uploadedMusic.type === 'file' ? (
                  <FileAudio className="h-5 w-5 text-foreground/80" />
                ) : (
                  <LinkIcon className="h-5 w-5 text-foreground/80" />
                )}
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">{uploadedMusic.name}</p>
                  <p className="text-xs text-foreground/60">
                    {uploadedMusic.type === 'file' ? 'Uploaded file' : 'From URL'}
                  </p>
                </div>
                <button 
                  onClick={removeUploadedMusic}
                  className="ml-2 text-foreground/60 hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="pt-4 sm:pt-6">
            <div className="max-w-3xl mx-auto bg-background/40 backdrop-blur-sm border border-foreground/10 rounded-xl sm:rounded-2xl p-3 sm:p-4">
              {/* Mobile Layout */}
              <div className="flex flex-col sm:hidden gap-3">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsUploadDialogOpen(true)}
                    className="text-foreground/60 hover:text-foreground transition-colors p-2"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                  <input 
                    type="text" 
                    placeholder="Chat to make music"
                    value={chatPrompt}
                    onChange={(e) => setChatPrompt(e.target.value)}
                    className="flex-1 bg-transparent text-foreground placeholder:text-foreground/40 outline-none text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <select 
                    value={selectedGenre}
                    onChange={(e) => setSelectedGenre(e.target.value)}
                    className="text-foreground/60 text-xs px-2 py-2 border border-foreground/10 rounded-lg bg-background flex-1"
                  >
                    <option value="">Genre</option>
                    <option value="amapiano">Amapiano</option>
                    <option value="trap">Trap</option>
                    <option value="funk">Funk</option>
                    <option value="hiphop">Hip Hop</option>
                    <option value="country">Country</option>
                    <option value="80s">80s</option>
                    <option value="rnb">R&B</option>
                    <option value="soul">Soul</option>
                    <option value="pop">Pop</option>
                    <option value="genz">Gen Z</option>
                    <option value="jazz">Jazz</option>
                    <option value="reggae">Reggae</option>
                    <option value="gospel">Gospel</option>
                    <option value="instrumental">Instrumental</option>
                  </select>
                  <Button 
                    onClick={handleCreate}
                    className="bg-background hover:bg-background/80 text-foreground rounded-full px-4 text-xs border border-foreground/20"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Create
                  </Button>
                </div>
              </div>
              
              {/* Desktop Layout */}
              <div className="hidden sm:flex items-center gap-3">
                <button 
                  onClick={() => setIsUploadDialogOpen(true)}
                  className="text-foreground/60 hover:text-foreground transition-colors"
                >
                  <Plus className="h-5 w-5" />
                </button>
                <input 
                  type="text" 
                  placeholder="Chat to make music"
                  value={chatPrompt}
                  onChange={(e) => setChatPrompt(e.target.value)}
                  className="flex-1 bg-transparent text-foreground placeholder:text-foreground/40 outline-none text-base md:text-lg"
                />
                <input 
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <select 
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="text-foreground/60 hover:text-foreground transition-colors text-sm px-3 py-2 border border-foreground/10 rounded-lg bg-background"
                >
                  <option value="">Genre</option>
                  <option value="amapiano">Amapiano</option>
                  <option value="trap">Trap</option>
                  <option value="funk">Funk</option>
                  <option value="hiphop">Hip Hop</option>
                  <option value="country">Country</option>
                  <option value="80s">80s</option>
                  <option value="rnb">R&B</option>
                  <option value="soul">Soul</option>
                  <option value="pop">Pop</option>
                  <option value="genz">Gen Z</option>
                  <option value="jazz">Jazz</option>
                  <option value="reggae">Reggae</option>
                  <option value="gospel">Gospel</option>
                  <option value="instrumental">Instrumental</option>
                </select>
                <Button 
                  onClick={handleCreate}
                  className="bg-background hover:bg-background/80 text-foreground rounded-full px-6 border border-foreground/20"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Create
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="bg-background border-foreground/20">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add Music</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="space-y-3">
              <Label className="text-foreground">Upload from device</Label>
              <Button 
                onClick={handleFileUpload}
                variant="outline" 
                className="w-full border-foreground/20 text-foreground hover:bg-foreground/10"
              >
                <Plus className="mr-2 h-4 w-4" />
                Upload Music File
              </Button>
              <input 
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-foreground/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-foreground/60">Or</span>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-foreground">Add from URL</Label>
              <p className="text-xs text-foreground/60">Supports Spotify, SoundCloud, YouTube, Apple Music links</p>
              <div className="flex gap-2">
                <Input 
                  type="url"
                  placeholder="https://open.spotify.com/track/..."
                  value={songUrl}
                  onChange={(e) => setSongUrl(e.target.value)}
                  className="bg-background/40 border-foreground/10 text-foreground placeholder:text-foreground/40"
                />
                <Button 
                  onClick={handleUrlSubmit}
                  className="bg-background hover:bg-background/80 text-foreground border border-foreground/20"
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
};
