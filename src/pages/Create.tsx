import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Plus, X, FileAudio, Link as LinkIcon, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';

interface UploadedMusic {
  type: 'file' | 'url';
  name: string;
  url?: string;
}

const Create = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [chatPrompt, setChatPrompt] = useState('');
  const [uploadedMusic, setUploadedMusic] = useState<UploadedMusic | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const genres = [
    'amapiano', 'trap', 'funk', 'hiphop', 'country', '80s', 
    'R&B', 'soul', 'pop', 'genz', 'jazz', 'reggae', 'gospel', 'instrumental'
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAudioFile(file);
      setUploadedMusic({
        type: 'file',
        name: file.name
      });
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

  const handleGenerate = () => {
    if ((uploadedMusic || chatPrompt) && selectedGenre) {
      navigate('/dashboard/music-result', {
        state: {
          trackTitle: uploadedMusic?.name || 'My Track',
          genre: selectedGenre,
          prompt: chatPrompt,
          uploadedMusic
        }
      });
    }
  };

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
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Create</h1>
        </div>

        {/* Upload Section */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Upload Audio</h2>
          
          <div className="space-y-4">
            {/* File Upload */}
            <div>
              <Label htmlFor="file-upload-create" className="text-foreground">Upload Audio File</Label>
              <div className="mt-2">
                <label htmlFor="file-upload-create" className="cursor-pointer">
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">MP3, WAV up to 50MB</p>
                  </div>
                  <input
                    id="file-upload-create"
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            </div>

            {/* URL Input */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="audio-url-create" className="text-foreground">Or paste music link</Label>
                <p className="text-xs text-muted-foreground mb-2">Supports Spotify, SoundCloud, YouTube, Apple Music</p>
                <Input
                  id="audio-url-create"
                  type="url"
                  placeholder="https://open.spotify.com/track/..."
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleAddUrl}
                className="bg-black text-white hover:bg-black/90"
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
            {/* Genre Selection */}
            <div>
              <Label htmlFor="genre-create" className="text-foreground">Select Genre</Label>
              <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                <SelectTrigger id="genre-create" className="mt-2">
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
              <Label htmlFor="chat-prompt-create" className="text-foreground">Chat to make music</Label>
              <Textarea
                id="chat-prompt-create"
                placeholder="Describe how you want your track to sound... e.g., 'Make it more upbeat with heavy bass and tropical vibes'"
                value={chatPrompt}
                onChange={(e) => setChatPrompt(e.target.value)}
                className="mt-2 min-h-[100px]"
              />
            </div>
          </div>
        </Card>

        {/* Generate Button */}
        <Button 
          onClick={handleGenerate}
          disabled={!((uploadedMusic || chatPrompt) && selectedGenre)}
          className="w-full bg-black text-white hover:bg-black/90 h-12 text-lg"
        >
          <Music className="h-5 w-5 mr-2" />
          Generate
        </Button>
      </div>
    </div>
  );
};

export default Create;
