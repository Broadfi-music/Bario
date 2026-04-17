import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Upload, Music, Loader2, Mic, Disc3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useVocalProject } from '@/hooks/useVocalProject';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import VocalProjectStatus from '@/components/VocalProjectStatus';

const VocalProjectPage = () => {
  const MAX_AUDIO_FILE_SIZE = 50 * 1024 * 1024;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { project, isStarting, isPolling, startProject, startPolling, statusLabel, progress } = useVocalProject();

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const existingProjectId = searchParams.get('id');

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (existingProjectId) startPolling(existingProjectId);
  }, [existingProjectId, startPolling]);

  const handleFileUpload = (setter: (f: File | null) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > MAX_AUDIO_FILE_SIZE) {
        toast({ title: 'File too large', description: 'Please upload an audio file smaller than 50MB.', variant: 'destructive' });
        e.target.value = '';
        return;
      }
      setter(file);
    };

  const uploadToBucket = async (file: File, suffix: string): Promise<string> => {
    if (!user) throw new Error('Not authenticated');
    const ext = file.name.split('.').pop() || 'wav';
    const path = `${user.id}/${Date.now()}-${suffix}.${ext}`;
    const { error } = await supabase.storage.from('vocal-projects').upload(path, file, {
      contentType: file.type || undefined,
      upsert: true,
    });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('vocal-projects').getPublicUrl(path);
    return publicUrl;
  };

  const handleSubmit = async () => {
    if (!audioFile || !user) return;
    setIsUploading(true);
    try {
      const vocalUrl = await uploadToBucket(audioFile, 'vocal');
      const referenceUrl = referenceFile ? await uploadToBucket(referenceFile, 'reference') : undefined;

      const projectId = await startProject(vocalUrl, '', description, referenceUrl);
      if (projectId) {
        startPolling(projectId);
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
    const masteredUrls = (project.mastered_urls || []) as string[];
    const finalUrls = masteredUrls.filter(Boolean).length > 0
      ? masteredUrls.filter(Boolean)
      : (project.final_urls || []) as string[];
    navigate('/music-result', {
      state: {
        mode: 'vocal-project',
        trackTitle: `Vocal Song${project.genre ? ' - ' + project.genre : ''}`,
        genre: project.genre || 'Auto-detected',
        prompt: project.generated_prompt,
        originalVocalUrl: project.clean_vocal_url || project.original_vocal_url,
        songOptions: finalUrls,
        selectedVariation: index,
        backTo: `/vocal-project?id=${project.id}`,
      },
    });
  };

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
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/ai-remix')} className="text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Create from Vocal</h1>
            <p className="text-xs text-white/40 mt-0.5">Upload your vocal — we analyze, generate, mix & master.</p>
          </div>
        </div>

        <Card className="bg-white/5 border-white/10 p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Mic className="h-5 w-5 text-white/60" />
            <h2 className="text-lg font-semibold text-white">Upload your vocal</h2>
          </div>
          <label htmlFor="vocal-upload" className="cursor-pointer block">
            <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              audioFile ? 'border-white/30 bg-white/5' : 'border-white/10 hover:border-white/20'
            }`}>
              {audioFile ? (
                <>
                  <Music className="h-8 w-8 mx-auto mb-2 text-white/60" />
                  <p className="text-sm text-white font-medium">{audioFile.name}</p>
                  <p className="text-xs text-white/40 mt-1">Click to change file</p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto mb-2 text-white/30" />
                  <p className="text-sm text-white/50">Click to upload your raw vocal recording</p>
                  <p className="text-xs text-white/30 mt-1">MP3, WAV up to 50MB • Just your voice, no beat</p>
                </>
              )}
            </div>
            <input id="vocal-upload" type="file" accept="audio/*" className="hidden" onChange={handleFileUpload(setAudioFile)} disabled={isSubmitting} />
          </label>
        </Card>

        <Card className="bg-white/5 border-white/10 p-6 mb-4">
          <Label className="text-white text-sm font-medium">Describe your vision (optional)</Label>
          <p className="text-[11px] text-white/30 mt-1 mb-2">
            We auto-detect BPM, key and energy from your vocal. Add details to guide the style.
          </p>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. 'Upbeat summer Afrobeats vibe' or 'Dark moody trap with 808s'"
            className="bg-white/5 border-white/10 text-white placeholder:text-white/25 min-h-[80px]"
            disabled={isSubmitting}
          />
        </Card>

        <Card className="bg-white/5 border-white/10 p-6 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Disc3 className="h-4 w-4 text-white/60" />
            <Label className="text-white text-sm font-medium">Master to sound like this (optional)</Label>
          </div>
          <p className="text-[11px] text-white/30 mb-3">
            Upload a finished song — we'll match its loudness, EQ and tone during mastering.
          </p>
          <label htmlFor="reference-upload" className="cursor-pointer block">
            <div className={`border-2 border-dashed rounded-xl p-5 text-center transition-colors ${
              referenceFile ? 'border-white/30 bg-white/5' : 'border-white/10 hover:border-white/20'
            }`}>
              {referenceFile ? (
                <p className="text-sm text-white/80">{referenceFile.name}</p>
              ) : (
                <p className="text-xs text-white/40">Click to upload a reference track (MP3, WAV)</p>
              )}
            </div>
            <input id="reference-upload" type="file" accept="audio/*" className="hidden" onChange={handleFileUpload(setReferenceFile)} disabled={isSubmitting} />
          </label>
        </Card>

        <Button
          onClick={handleSubmit}
          disabled={!audioFile || isSubmitting}
          className="w-full bg-white text-black hover:bg-white/80 h-12 text-base font-semibold"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              {isUploading ? 'Uploading…' : 'Starting pipeline…'}
            </>
          ) : (
            <>
              <Mic className="h-5 w-5 mr-2" />
              Create song from vocal
            </>
          )}
        </Button>

        <p className="text-[10px] text-white/20 text-center mt-3">
          Processing takes 3–6 minutes. You'll get 3 mastered songs to choose from.
        </p>
      </div>
    </div>
  );
};

export default VocalProjectPage;
