import { Link, useNavigate } from 'react-router-dom';
import { Home, Library, Sparkles, User, Settings, Menu, X, Gift, Upload as UploadIcon, Plus, Music, Image, Link as LinkIcon, ChevronLeft, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface TrackUpload {
  id: string;
  title: string;
  file: File | null;
  description: string;
  spotifyUrl: string;
  appleUrl: string;
  soundcloudUrl: string;
  youtubeUrl: string;
}

const Upload = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadType, setUploadType] = useState<'single' | 'album'>('single');
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumDescription, setAlbumDescription] = useState('');
  const [genre, setGenre] = useState('');
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [tracks, setTracks] = useState<TrackUpload[]>([
    { id: '1', title: '', file: null, description: '', spotifyUrl: '', appleUrl: '', soundcloudUrl: '', youtubeUrl: '' }
  ]);
  
  const coverInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setCoverPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAudioChange = (trackId: string, file: File) => {
    setTracks(prev => prev.map(t => 
      t.id === trackId ? { ...t, file, title: t.title || file.name.replace(/\.[^/.]+$/, '') } : t
    ));
  };

  const addTrack = () => {
    setTracks(prev => [...prev, {
      id: Date.now().toString(),
      title: '',
      file: null,
      description: '',
      spotifyUrl: '',
      appleUrl: '',
      soundcloudUrl: '',
      youtubeUrl: ''
    }]);
  };

  const removeTrack = (trackId: string) => {
    if (tracks.length > 1) {
      setTracks(prev => prev.filter(t => t.id !== trackId));
    }
  };

  const updateTrack = (trackId: string, field: keyof TrackUpload, value: string) => {
    setTracks(prev => prev.map(t => 
      t.id === trackId ? { ...t, [field]: value } : t
    ));
  };

  const handleUpload = async () => {
    if (!user) {
      toast.error('Please sign in to upload');
      return;
    }

    const validTracks = tracks.filter(t => t.file && t.title);
    if (validTracks.length === 0) {
      toast.error('Please add at least one track with a title');
      return;
    }

    setIsUploading(true);

    try {
      // Upload cover image if provided
      let coverImageUrl = '';
      if (coverImage) {
        const coverPath = `${user.id}/${Date.now()}-cover.${coverImage.name.split('.').pop()}`;
        const { error: coverError } = await supabase.storage
          .from('user-uploads')
          .upload(coverPath, coverImage);
        
        if (coverError) throw coverError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('user-uploads')
          .getPublicUrl(coverPath);
        coverImageUrl = publicUrl;
      }

      // Create album if multiple tracks
      let albumId: string | undefined;
      if (uploadType === 'album' && albumTitle) {
        const { data: albumData, error: albumError } = await supabase.functions.invoke('user-upload', {
          body: {
            action: 'create-album',
            title: albumTitle,
            description: albumDescription,
            coverImageUrl,
            genre,
          }
        });

        if (albumError) throw albumError;
        albumId = albumData.album?.id;
      }

      // Upload each track
      for (const track of validTracks) {
        if (!track.file) continue;

        // Upload audio file
        const audioPath = `${user.id}/${Date.now()}-${track.file.name}`;
        const { error: audioError } = await supabase.storage
          .from('user-uploads')
          .upload(audioPath, track.file);

        if (audioError) throw audioError;

        const { data: { publicUrl: audioUrl } } = supabase.storage
          .from('user-uploads')
          .getPublicUrl(audioPath);

        // Get audio duration
        const audio = new Audio();
        audio.src = URL.createObjectURL(track.file);
        const durationMs = await new Promise<number>((resolve) => {
          audio.onloadedmetadata = () => resolve(Math.floor(audio.duration * 1000));
          audio.onerror = () => resolve(0);
        });

        // Create upload record
        const { error: uploadError } = await supabase.functions.invoke('user-upload', {
          body: {
            action: 'create-upload',
            title: track.title,
            description: track.description,
            audioUrl,
            coverImageUrl: coverImageUrl || '/src/assets/card-1.png',
            genre,
            albumId,
            spotifyUrl: track.spotifyUrl,
            appleUrl: track.appleUrl,
            soundcloudUrl: track.soundcloudUrl,
            youtubeUrl: track.youtubeUrl,
            durationMs,
          }
        });

        if (uploadError) throw uploadError;
      }

      toast.success(`Successfully uploaded ${validTracks.length} track(s)!`);
      navigate('/dashboard/library');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload');
    } finally {
      setIsUploading(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  const sidebarItems = [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: Library, label: 'Library', path: '/dashboard/library' },
    { icon: Sparkles, label: 'Create', path: '/dashboard/create' },
    { icon: Sparkles, label: 'Megashuffle', path: '/dashboard/megashuffle' },
    { icon: Gift, label: 'Reward & Earn', path: '/dashboard/rewards' },
    { icon: UploadIcon, label: 'Upload', path: '/dashboard/upload' },
  ];

  const genres = [
    'Pop', 'Hip-Hop', 'R&B', 'Rock', 'Electronic', 'Afrobeats', 'Amapiano', 
    'Reggae', 'Jazz', 'Classical', 'Country', 'Latin', 'K-Pop', 'Other'
  ];

  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-48 bg-card border-r border-border flex flex-col transform transition-transform duration-300 lg:transform-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-3 lg:p-4 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-foreground">BARIO</Link>
          <Button variant="ghost" size="icon" className="lg:hidden h-7 w-7" onClick={() => setSidebarOpen(false)}>
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
                item.label === 'Upload' ? 'text-foreground bg-accent' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto w-full lg:w-auto">
        <div className="p-3 lg:p-6 max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="h-8 w-8">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">Upload Music</h1>
          </div>

          <Card className="p-4 lg:p-6 space-y-6">
            {/* Upload Type */}
            <div className="flex gap-4">
              <Button
                variant={uploadType === 'single' ? 'default' : 'outline'}
                onClick={() => setUploadType('single')}
                className="flex-1"
              >
                <Music className="h-4 w-4 mr-2" />
                Single Track
              </Button>
              <Button
                variant={uploadType === 'album' ? 'default' : 'outline'}
                onClick={() => setUploadType('album')}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-2" />
                Album / EP
              </Button>
            </div>

            {/* Album Info */}
            {uploadType === 'album' && (
              <div className="space-y-4 p-4 bg-accent/30 rounded-lg">
                <div>
                  <Label className="text-xs">Album Title</Label>
                  <Input
                    value={albumTitle}
                    onChange={(e) => setAlbumTitle(e.target.value)}
                    placeholder="Enter album title"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Album Description</Label>
                  <Textarea
                    value={albumDescription}
                    onChange={(e) => setAlbumDescription(e.target.value)}
                    placeholder="Describe your album..."
                    className="mt-1"
                    rows={2}
                  />
                </div>
              </div>
            )}

            {/* Cover Image */}
            <div>
              <Label className="text-xs">Cover Art</Label>
              <div
                onClick={() => coverInputRef.current?.click()}
                className="mt-1 border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
              >
                {coverPreview ? (
                  <img src={coverPreview} alt="Cover" className="w-32 h-32 mx-auto rounded-lg object-cover" />
                ) : (
                  <div className="space-y-2">
                    <Image className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Click to upload cover image</p>
                  </div>
                )}
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                className="hidden"
              />
            </div>

            {/* Genre */}
            <div>
              <Label className="text-xs">Genre</Label>
              <Select value={genre} onValueChange={setGenre}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select genre" />
                </SelectTrigger>
                <SelectContent>
                  {genres.map(g => (
                    <SelectItem key={g} value={g.toLowerCase()}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tracks */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-xs">Tracks</Label>
                {uploadType === 'album' && (
                  <Button variant="outline" size="sm" onClick={addTrack}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Track
                  </Button>
                )}
              </div>

              {tracks.map((track, index) => (
                <Card key={track.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-muted-foreground">Track {index + 1}</span>
                    {tracks.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeTrack(track.id)} className="h-6 w-6">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs">Audio File</Label>
                    <Input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => e.target.files?.[0] && handleAudioChange(track.id, e.target.files[0])}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Track Title</Label>
                    <Input
                      value={track.title}
                      onChange={(e) => updateTrack(track.id, 'title', e.target.value)}
                      placeholder="Enter track title"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Description</Label>
                    <Textarea
                      value={track.description}
                      onChange={(e) => updateTrack(track.id, 'description', e.target.value)}
                      placeholder="Describe your track..."
                      className="mt-1"
                      rows={2}
                    />
                  </div>

                  {/* Social Links */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs flex items-center gap-1">
                        <LinkIcon className="h-3 w-3" /> Spotify
                      </Label>
                      <Input
                        value={track.spotifyUrl}
                        onChange={(e) => updateTrack(track.id, 'spotifyUrl', e.target.value)}
                        placeholder="Spotify link"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs flex items-center gap-1">
                        <LinkIcon className="h-3 w-3" /> Apple Music
                      </Label>
                      <Input
                        value={track.appleUrl}
                        onChange={(e) => updateTrack(track.id, 'appleUrl', e.target.value)}
                        placeholder="Apple Music link"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs flex items-center gap-1">
                        <LinkIcon className="h-3 w-3" /> SoundCloud
                      </Label>
                      <Input
                        value={track.soundcloudUrl}
                        onChange={(e) => updateTrack(track.id, 'soundcloudUrl', e.target.value)}
                        placeholder="SoundCloud link"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs flex items-center gap-1">
                        <LinkIcon className="h-3 w-3" /> YouTube
                      </Label>
                      <Input
                        value={track.youtubeUrl}
                        onChange={(e) => updateTrack(track.id, 'youtubeUrl', e.target.value)}
                        placeholder="YouTube link"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>Uploading...</>
              ) : (
                <>
                  <UploadIcon className="h-4 w-4 mr-2" />
                  Upload {tracks.filter(t => t.file).length} Track(s)
                </>
              )}
            </Button>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Upload;