import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Plus, X, FileAudio, Link as LinkIcon, Music, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useAudioRemix } from '@/hooks/useAudioRemix';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UploadedMusic {
  type: 'file' | 'url';
  name: string;
  url?: string;
  file?: File;
}

const NewRemix = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { generateRemix, isProcessing } = useAudioRemix();
  const { toast } = useToast();
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
        toast({
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

    // Upload file to storage if it's a file upload
    if (uploadedMusic?.type === 'file' && uploadedMusic.file) {
      const uploadedUrl = await uploadAudioToStorage(uploadedMusic.file);
      if (!uploadedUrl) {
        toast({
          title: 'Upload Failed',
          description: 'Could not upload audio file. Please try again.',
          variant: 'destructive',
        });
        return; // Stop if upload fails
      }
      audioStorageUrl = uploadedUrl;
    } else if (uploadedMusic?.type === 'url') {
      audioStorageUrl = uploadedMusic.url;
    }

    // Ensure we have audio to process
    if (!audioStorageUrl && uploadedMusic) {
      toast({
        title: 'No Audio',
        description: 'Please upload an audio file or provide a valid URL.',
        variant: 'destructive',
      });
      return;
    }

    // Generate remix with AI
    const result = await generateRemix({
      genre: selectedGenre,
      era: selectedEra,
      description: chatPrompt,
      audioUrl: audioStorageUrl,
      trackTitle: uploadedMusic?.name || 'My Remix',
    });

    if (result) {
      // Navigate to music result page with the FX config
      navigate('/dashboard/music-result', {
        state: {
          trackTitle: uploadedMusic?.name || 'My Remix',
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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">New Remix</h1>
        </div>

        {/* Upload Section */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Upload Audio</h2>
          
          <div className="space-y-4">
            {/* File Upload */}
            <div>
              <Label htmlFor="file-upload" className="text-foreground">Upload Audio File</Label>
              <div className="mt-2">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">MP3, WAV up to 50MB</p>
                  </div>
                  <input
                    id="file-upload"
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
                <Label htmlFor="audio-url" className="text-foreground">Or paste music link</Label>
                <p className="text-xs text-muted-foreground mb-2">Supports Spotify, SoundCloud, YouTube, Apple Music</p>
                <Input
                  id="audio-url"
                  type="url"
                  placeholder="https://open.spotify.com/track/..."
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  disabled={isGenerating}
                />
              </div>
              <Button 
                onClick={handleAddUrl}
                className="bg-black text-white hover:bg-black/90"
                disabled={isGenerating || !audioUrl}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {/* Uploaded Music Display */}
            {uploadedMusic && (
              <div className="bg-muted rounded-lg p-4 flex items-center gap-3">
                {uploadedMusic.type === 'file' ? (
                  <FileAudio className="h-8 w-8 text-primary" />
                ) : (
                  <LinkIcon className="h-8 w-8 text-primary" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-foreground">{uploadedMusic.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {uploadedMusic.type === 'file' ? 'Uploaded file' : 'From URL'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={removeUploadedMusic}
                  disabled={isGenerating}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Conversion Settings */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Conversion Settings</h2>
          
          <div className="space-y-4">
            {/* Era Selection */}
            <div>
              <Label htmlFor="era" className="text-foreground">Select Era</Label>
              <Select value={selectedEra} onValueChange={setSelectedEra} disabled={isGenerating}>
                <SelectTrigger id="era" className="mt-2">
                  <SelectValue placeholder="Choose era" />
                </SelectTrigger>
                <SelectContent>
                  {eras.map((era) => (
                    <SelectItem key={era} value={era}>
                      {era}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Genre Selection */}
            <div>
              <Label htmlFor="genre" className="text-foreground">Select Genre</Label>
              <Select value={selectedGenre} onValueChange={setSelectedGenre} disabled={isGenerating}>
                <SelectTrigger id="genre" className="mt-2">
                  <SelectValue placeholder="Choose genre" />
                </SelectTrigger>
                <SelectContent>
                  {genres.map((genre) => (
                    <SelectItem key={genre} value={genre}>
                      {genre.charAt(0).toUpperCase() + genre.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Chat to make music */}
            <div>
              <Label htmlFor="chat-prompt" className="text-foreground">Chat to make music</Label>
              <Textarea
                id="chat-prompt"
                placeholder="Describe how you want your remix to sound... e.g., 'Make it more upbeat with heavy bass and tropical vibes'"
                value={chatPrompt}
                onChange={(e) => setChatPrompt(e.target.value)}
                className="mt-2 min-h-[100px]"
                disabled={isGenerating}
              />
            </div>
          </div>
        </Card>

        {/* Generate Button */}
        <Button 
          onClick={handleGenerate}
          disabled={!((uploadedMusic || chatPrompt) && selectedGenre) || isGenerating}
          className="w-full bg-black text-white hover:bg-black/90 h-12 text-lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              {isUploading ? 'Uploading...' : 'Generating...'}
            </>
          ) : (
            <>
              <Music className="h-5 w-5 mr-2" />
              Generate Remix
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default NewRemix;