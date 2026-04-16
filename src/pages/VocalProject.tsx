import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Upload, Music, Loader2, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useVocalProject } from '@/hooks/useVocalProject';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import VocalProjectStatus from '@/components/VocalProjectStatus';

const genres = [
  'pop', 'rap', 'rock', 'r&b', 'classical', 'jazz', 'soul & funk',
  'afro', 'indie & alternative', 'latin music', 'dance & edm',
  'reggaeton', 'electronic', 'country', 'metal', 'k-pop',
  'reggae', 'blues', 'folk', 'lofi', 'acoustic',
  'caribbean', 'japanese music', 'amapiano', 'gospel', 'instrumental',
  'trap', 'funk', 'hiphop'
];

const VocalProjectPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { project, isStarting, isPolling, startProject, startPolling, statusLabel, progress } = useVocalProject();

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [selectedGenre, setSelectedGenre] = useState('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // If we have a projectId in URL, start polling it
  const existingProjectId = searchParams.get('id');

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (existingProjectId) {
      startPolling(existingProjectId);
    }
  }, [existingProjectId, startPolling]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setAudioFile(e.target.files[0]);
  };

  const handleSubmit = async () => {
    if (!audioFile || !selectedGenre || !user) return;

    setIsUploading(true);
    try {
      // Upload to storage
      const ext = audioFile.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage.from('vocal-projects').upload(path, audioFile);
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('vocal-projects').getPublicUrl(data.path);

      const projectId = await startProject(publicUrl, selectedGenre, description);
      if (projectId) {
        startPolling(projectId);
        // Update URL without full navigation
        window.history.replaceState({}, '', `/vocal-project?id=${projectId}`);
      }
    } catch (err) {
      toast({ title: 'Upload Failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectVariation = (index: number) => {
    if (!project) return;
    const finalUrls = (project.final_urls || []) as string[];
    navigate('/dashboard/music-result', {
      state: {
        trackTitle: `Vocal Song - ${project.genre}`,
        genre: project.genre,
        audioUrl: finalUrls[index],
        prompt: project.generated_prompt,
      },
    });
  };

  // Show progress view if we have a project
  if (project) {
    return (
      <VocalProjectStatus
        project={project}
        statusLabel={statusLabel}
        progress={progress}
        isPolling={isPolling}
        onBack={() => navigate('/ai-remix')}
        onSelectVariation={handleSelectVariation}
      />
    );
  }

  const isSubmitting = isStarting || isUploading;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto p-4 sm:p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/ai-remix')} className="text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Create from Vocal</h1>
            <p className="text-xs text-white/40 mt-0.5">Upload your raw vocal and we'll create a full song</p>
          </div>
        </div>

        {/* Upload */}
        <Card className="bg-white/5 border-white/10 p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Mic className="h-5 w-5 text-white/60" />
            <h2 className="text-lg font-semibold text-white">Upload Your Vocal</h2>
          </div>

          <label htmlFor="vocal-upload" className="cursor-pointer block">
            <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              audioFile ? 'border-white/30 bg-white/5' : 'border-white/10 hover:border-white/20'
            }`}>
              {audioFile ? (
                <>
                  <Music className="h-8 w-8 mx-auto mb-2 text-white/60" />
                  <p className="text-sm text-white font-medium">{audioFile.name}</p>
                  <p className="text-xs text-white/40 mt-1">Click to change</p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto mb-2 text-white/30" />
                  <p className="text-sm text-white/50">Click to upload your raw vocal recording</p>
                  <p className="text-xs text-white/30 mt-1">MP3, WAV up to 50MB • No beat, just your voice</p>
                </>
              )}
            </div>
            <input id="vocal-upload" type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} disabled={isSubmitting} />
          </label>
        </Card>

        {/* Genre */}
        <Card className="bg-white/5 border-white/10 p-6 mb-4">
          <Label className="text-white text-sm font-medium">Target Genre</Label>
          <Select value={selectedGenre} onValueChange={setSelectedGenre} disabled={isSubmitting}>
            <SelectTrigger className="mt-2 bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Choose a genre for your song" />
            </SelectTrigger>
            <SelectContent>
              {genres.map((g) => (
                <SelectItem key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        {/* Description */}
        <Card className="bg-white/5 border-white/10 p-6 mb-6">
          <Label className="text-white text-sm font-medium">Describe your vision (optional)</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. 'Upbeat summer vibe with tropical instruments and groovy bassline'"
            className="mt-2 bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[80px]"
            disabled={isSubmitting}
          />
        </Card>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={!audioFile || !selectedGenre || isSubmitting}
          className="w-full bg-white text-black hover:bg-white/80 h-12 text-base font-semibold"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              {isUploading ? 'Uploading...' : 'Starting pipeline...'}
            </>
          ) : (
            <>
              <Mic className="h-5 w-5 mr-2" />
              Create Song from Vocal
            </>
          )}
        </Button>

        <p className="text-[10px] text-white/20 text-center mt-3">
          Processing takes 3–8 minutes. Free users get 1 full song + 2 previews.
        </p>
      </div>
    </div>
  );
};

export default VocalProjectPage;
