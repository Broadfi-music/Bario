import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, Library, Sparkles, User, Settings, Menu, X, Gift, BarChart3, Upload, Plus, FileAudio, Link as LinkIcon, Music, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useAudioRemix } from '@/hooks/useAudioRemix';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { toast } from 'sonner';

interface UploadedMusic {
  type: 'file' | 'url';
  name: string;
  url?: string;
  file?: File;
}

const Create = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { generateRemix, isProcessing } = useAudioRemix();
  const { toast: toastHook } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedEra, setSelectedEra] = useState('2025');
  const [chatPrompt, setChatPrompt] = useState('');
  const [uploadedMusic, setUploadedMusic] = useState<UploadedMusic | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/');
  };

  const sidebarItems = [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: Library, label: 'Library', path: '/dashboard/library' },
    { icon: Sparkles, label: 'Create', path: '/dashboard/create' },
    { icon: Sparkles, label: 'Beatpulse', path: '/dashboard/beatpulse' },
    { icon: Sparkles, label: 'Megashuffle', path: '/dashboard/megashuffle' },
    { icon: BarChart3, label: 'Billboard', path: '/dashboard/billboard' },
    { icon: Gift, label: 'Reward & Earn', path: '/dashboard/rewards' },
  ];

  const genres = [
    'pop', 'rap', 'rock', 'r&b', 'classical', 'jazz', 'soul & funk',
    'afro', 'indie & alternative', 'latin music', 'dance & edm',
    'reggaeton', 'electronic', 'country', 'metal', 'k-pop',
    'reggae', 'blues', 'folk', 'lofi', 'acoustic',
    'caribbean', 'japanese music', 'amapiano', 'gospel', 'instrumental',
    'trap', 'funk', 'hiphop'
  ];

  const eras = ['1970', '1990', '2025', '2050'];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAudioFile(file);
      setUploadedMusic({
        type: 'file',
        name: file.name,
        file: file
      });
    }
  };

  const uploadAudioToStorage = async (file: File): Promise<string | null> => {
    if (!user) return null;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('original-audio')
        .upload(fileName, file);

      if (error) {
        console.error('Upload error:', error);
        toastHook({
          title: 'Upload Failed',
          description: error.message,
          variant: 'destructive',
        });
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('original-audio')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (err) {
      console.error('Upload error:', err);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddUrl = () => {
    if (audioUrl) {
      let musicName = 'Music from URL';
      try {
        const url = new URL(audioUrl);
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
        url: audioUrl
      });
      setAudioUrl('');
    }
  };

  const removeUploadedMusic = () => {
    setUploadedMusic(null);
    setAudioFile(null);
  };

  const handleGenerate = async () => {
    if ((!uploadedMusic && !chatPrompt) || !selectedGenre) return;

    let audioStorageUrl: string | undefined;

    if (uploadedMusic?.type === 'file' && uploadedMusic.file) {
      audioStorageUrl = (await uploadAudioToStorage(uploadedMusic.file)) || undefined;
    } else if (uploadedMusic?.type === 'url') {
      audioStorageUrl = uploadedMusic.url;
    }

    const result = await generateRemix({
      genre: selectedGenre,
      era: selectedEra,
      description: chatPrompt,
      audioUrl: audioStorageUrl,
      trackTitle: uploadedMusic?.name || 'My Track',
    });

    if (result) {
      navigate('/dashboard/music-result', {
        state: {
          trackTitle: uploadedMusic?.name || 'My Track',
          genre: selectedGenre,
          era: selectedEra,
          prompt: chatPrompt,
          uploadedMusic,
          trackId: result.trackId,
          fxConfig: result.fxConfig,
          audioUrl: audioStorageUrl,
        }
      });
    }
  };

  const isGenerating = isProcessing || isUploading;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-48 bg-card border-r border-border flex flex-col transform transition-transform duration-300 lg:transform-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-3 lg:p-4 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-foreground">
            BARIO
          </Link>
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden h-7 w-7"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 px-2 overflow-y-auto">
          {sidebarItems.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors mb-0.5 ${
                item.label === 'Create' 
                  ? 'text-foreground bg-accent' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-1">
          <Link
            to="/dashboard/settings"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span className="text-xs font-medium">Settings</span>
          </Link>
          <Link
            to="/dashboard/profile"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
          >
            <User className="h-4 w-4" />
            <span className="text-xs font-medium">Profile</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full lg:w-auto">
        <div className="p-3 lg:p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-4 lg:mb-6">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="lg:hidden h-8 w-8"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-bold text-foreground">Create</h1>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src="/src/assets/track-1.jpeg" />
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/profile" className="cursor-pointer text-xs">
                    Edit Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/settings" className="cursor-pointer text-xs">
                    Manage Subscription
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut} className="text-xs">
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Upload Section */}
          <Card className="p-4 lg:p-6 mb-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Upload Audio</h2>
            
            <div className="space-y-3">
              {/* File Upload */}
              <div>
                <Label htmlFor="file-upload-create" className="text-foreground text-xs">Upload Audio File</Label>
                <div className="mt-1.5">
                  <label htmlFor="file-upload-create" className="cursor-pointer">
                    <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary transition-colors">
                      <Upload className="h-6 w-6 mx-auto mb-1.5 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">MP3, WAV up to 50MB</p>
                    </div>
                    <input
                      id="file-upload-create"
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isGenerating}
                    />
                  </label>
                </div>
              </div>

              {/* URL Input */}
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label htmlFor="audio-url-create" className="text-foreground text-xs">Or paste music link</Label>
                  <p className="text-[10px] text-muted-foreground mb-1.5">Supports Spotify, SoundCloud, YouTube, Apple Music</p>
                  <Input
                    id="audio-url-create"
                    type="url"
                    placeholder="https://open.spotify.com/track/..."
                    value={audioUrl}
                    onChange={(e) => setAudioUrl(e.target.value)}
                    disabled={isGenerating}
                    className="h-8 text-xs"
                  />
                </div>
                <Button 
                  onClick={handleAddUrl}
                  className="bg-black text-white hover:bg-black/90 h-8 text-xs"
                  disabled={isGenerating || !audioUrl}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>

              {/* Uploaded Music Display */}
              {uploadedMusic && (
                <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                  {uploadedMusic.type === 'file' ? (
                    <FileAudio className="h-6 w-6 text-primary" />
                  ) : (
                    <LinkIcon className="h-6 w-6 text-primary" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-xs truncate">{uploadedMusic.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {uploadedMusic.type === 'file' ? 'Uploaded file' : 'From URL'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={removeUploadedMusic}
                    disabled={isGenerating}
                    className="h-6 w-6"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Conversion Settings */}
          <Card className="p-4 lg:p-6 mb-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Conversion Settings</h2>
            
            <div className="space-y-3">
              {/* Era Selection */}
              <div>
                <Label htmlFor="era-create" className="text-foreground text-xs">Select Era</Label>
                <Select value={selectedEra} onValueChange={setSelectedEra} disabled={isGenerating}>
                  <SelectTrigger id="era-create" className="mt-1.5 h-8 text-xs">
                    <SelectValue placeholder="Choose era" />
                  </SelectTrigger>
                  <SelectContent>
                    {eras.map((era) => (
                      <SelectItem key={era} value={era} className="text-xs">
                        {era}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Genre Selection */}
              <div>
                <Label htmlFor="genre-create" className="text-foreground text-xs">Select Genre</Label>
                <Select value={selectedGenre} onValueChange={setSelectedGenre} disabled={isGenerating}>
                  <SelectTrigger id="genre-create" className="mt-1.5 h-8 text-xs">
                    <SelectValue placeholder="Choose genre" />
                  </SelectTrigger>
                  <SelectContent>
                    {genres.map((genre) => (
                      <SelectItem key={genre} value={genre} className="text-xs">
                        {genre.charAt(0).toUpperCase() + genre.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Chat to make music */}
              <div>
                <Label htmlFor="chat-prompt-create" className="text-foreground text-xs">Chat to make music</Label>
                <Textarea
                  id="chat-prompt-create"
                  placeholder="Describe how you want your track to sound..."
                  value={chatPrompt}
                  onChange={(e) => setChatPrompt(e.target.value)}
                  className="mt-1.5 min-h-[80px] text-xs"
                  disabled={isGenerating}
                />
              </div>
            </div>
          </Card>

          {/* Generate Button */}
          <Button 
            onClick={handleGenerate}
            disabled={!((uploadedMusic || chatPrompt) && selectedGenre) || isGenerating}
            className="w-full bg-black text-white hover:bg-black/90 h-10 text-sm"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isUploading ? 'Uploading...' : 'Generating...'}
              </>
            ) : (
              <>
                <Music className="h-4 w-4 mr-2" />
                Generate
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Create;