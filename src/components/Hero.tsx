import { ThreeTextAnimation } from './ThreeTextAnimation';
import { FloatingAlbumCard } from './FloatingAlbumCard';
import { Button } from '@/components/ui/button';
import { Sparkles, Plus, X, Link as LinkIcon, FileAudio, History, Loader2, Radio } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createRemixJob,
  createSourcePreview,
  fetchLibrary,
  fetchRuntimeCheck,
  resolveBackendUrl,
  type LibraryEntryResponse,
  type RuntimeCheckResponse,
} from '@/lib/aiRemixApi';
import { toast } from 'sonner';
import album1 from '@/assets/album-1.jpeg';
import album2 from '@/assets/album-2.jpeg';
import album3 from '@/assets/album-3.jpeg';
import wavegrower from '@/assets/wavegrower.gif';

interface UploadedMusic {
  id: string;
  type: 'file' | 'url';
  name: string;
  url?: string;
  file?: File;
  kindLabel: string;
}

interface HeroProps {
  mode?: 'demo' | 'backend';
}

const BACKEND_GENRES = [
  'Amapiano',
  'Trap',
  'Funk',
  'Hip Hop',
  'Country',
  '80s',
  'R&B',
  'Soul',
  'Pop',
  'Gen Z',
  'Jazz',
  'Reggae',
  'Gospel',
  'Instrumental',
] as const;

const FILE_ACCEPT =
  'audio/*,video/*,.mp3,.wav,.mpeg,.m4a,.aac,.flac,.ogg,.mp4,.mov,.avi,.mkv,.webm';

export const Hero = ({ mode = 'demo' }: HeroProps) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [songUrl, setSongUrl] = useState('');
  const [uploadedMusic, setUploadedMusic] = useState<UploadedMusic[]>([]);
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);
  const [chatPrompt, setChatPrompt] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [runtime, setRuntime] = useState<RuntimeCheckResponse | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [historyEntries, setHistoryEntries] = useState<LibraryEntryResponse[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'backend') {
      return;
    }

    let cancelled = false;

    const loadRuntime = async () => {
      try {
        const response = await fetchRuntimeCheck();
        if (!cancelled) {
          setRuntime(response);
          setRuntimeError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setRuntimeError(error instanceof Error ? error.message : 'Could not load runtime status.');
        }
      }
    };

    loadRuntime();

    return () => {
      cancelled = true;
    };
  }, [mode]);

  useEffect(() => {
    if (!isHistoryDialogOpen || mode !== 'backend') {
      return;
    }

    let cancelled = false;

    const loadHistory = async () => {
      try {
        setHistoryLoading(true);
        const entries = await fetchLibrary(20);
        if (!cancelled) {
          setHistoryEntries(entries);
          setHistoryError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setHistoryError(error instanceof Error ? error.message : 'Could not load remix history.');
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [isHistoryDialogOpen, mode]);

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) {
      const nextUploads = files.map((file, index) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${index}`,
        type: 'file' as const,
        name: file.name,
        file,
        kindLabel: file.type.startsWith('video/') ? 'Video file' : 'Audio file',
      }));
      setUploadedMusic((current) => [...current, ...nextUploads]);
      setActiveUploadId((current) => current ?? nextUploads[0].id);
      setIsUploadDialogOpen(false);
      e.target.value = '';
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
      
      const nextUpload = {
        id: `${musicName}-${Date.now()}`,
        type: 'url' as const,
        name: musicName,
        url: songUrl,
        kindLabel: 'Streaming link',
      };
      setUploadedMusic((current) => [...current, nextUpload]);
      setActiveUploadId((current) => current ?? nextUpload.id);
      setSongUrl('');
      setIsUploadDialogOpen(false);
    }
  };

  const removeUploadedMusic = (uploadId: string) => {
    setUploadedMusic((current) => {
      const filtered = current.filter((item) => item.id !== uploadId);
      setActiveUploadId((currentActive) => {
        if (currentActive !== uploadId) {
          return currentActive;
        }
        return filtered[0]?.id ?? null;
      });
      return filtered;
    });
  };

  const activeUpload = uploadedMusic.find((item) => item.id === activeUploadId) ?? uploadedMusic[0] ?? null;

  const formatTimestamp = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  const runtimeSummary = (() => {
    if (mode !== 'backend') {
      return null;
    }
    if (runtime) {
      const separatorLabel =
        runtime.separator_provider === 'replicate'
          ? `Replicate ${runtime.separator_model ?? 'separator'}`
          : `Local ${runtime.separator_model ?? 'separator'}`;
      const generatorLabel =
        runtime.generator_provider === 'replicate'
          ? `Replicate ${runtime.generator_model ?? 'generator'}`
          : `Local ${runtime.generator_model ?? 'generator'}`;
      return `${separatorLabel} | ${generatorLabel}`;
    }
    if (runtimeError) {
      return null;
    }
    return 'Checking remix runtime...';
  })();

  const replicateActive =
    runtime?.separator_provider === 'replicate' && runtime?.generator_provider === 'replicate';

  const promptExamples = [
    'Turn this into Gen Z 80s with flute and stronger drums',
    'Make it amapiano with deeper bass and a cleaner groove',
    'Only remix the hook and keep the vocals upfront',
  ];

  const handleCreate = async () => {
    if (mode === 'demo') {
      if (activeUpload || chatPrompt) {
        navigate('/music-result', {
          state: {
            trackTitle: activeUpload?.name || 'My Remix',
            genre: selectedGenre || 'Custom',
            prompt: chatPrompt,
            uploadedMusic: activeUpload,
          },
        });
      }
      return;
    }

    if (!activeUpload) {
      toast.error('Upload a song or add a song URL first.');
      return;
    }

    if (!selectedGenre) {
      toast.error('Choose a genre before creating the remix.');
      return;
    }

    try {
      setIsCreating(true);
      let preview:
        | {
            input_audio_public_url: string;
            input_public_url: string;
            source_media_kind: string;
          }
        | undefined;
      try {
        preview = await createSourcePreview({
          file: activeUpload.type === 'file' ? activeUpload.file : undefined,
          songUrl: activeUpload.type === 'url' ? activeUpload.url : undefined,
        });
      } catch {
        preview = undefined;
      }
      const formData = new FormData();
      formData.append('genre', selectedGenre);
      if (chatPrompt.trim()) {
        formData.append('remix_prompt', chatPrompt.trim());
      }
      formData.append('source_label', activeUpload.name);

      if (activeUpload.type === 'file' && activeUpload.file) {
        formData.append('song_file', activeUpload.file);
      } else if (activeUpload.type === 'url' && activeUpload.url) {
        formData.append('song_url', activeUpload.url);
      }

      const created = await createRemixJob(formData);

      // Navigate to result page with state
      navigate('/music-result', {
        state: {
          trackTitle: activeUpload?.name || 'My Remix',
          genre: selectedGenre,
          prompt: chatPrompt,
          uploadedMusic: activeUpload,
          backendJobId: created.job_id,
          backPath: '/ai-remix',
          sourcePreviewAudioUrl: preview ? resolveBackendUrl(preview.input_audio_public_url) : undefined,
          sourcePreviewUrl: preview ? resolveBackendUrl(preview.input_public_url) : undefined,
          sourceMediaKind: preview?.source_media_kind,
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not start the remix job.');
    } finally {
      setIsCreating(false);
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
          {uploadedMusic.length > 0 && (
            <div className="flex items-center justify-center">
              <div className="w-full max-w-3xl space-y-2">
                <div className="text-left text-[11px] uppercase tracking-[0.22em] text-foreground/45">
                  Uploaded sources ({uploadedMusic.length}) {activeUpload ? '| click to choose the remix source' : ''}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {uploadedMusic.map((item) => {
                    const isActive = item.id === activeUpload?.id;
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 rounded-2xl border px-4 py-2 backdrop-blur-sm transition-colors ${
                          isActive
                            ? 'border-[#4ade80]/40 bg-[#4ade80]/10'
                            : 'border-foreground/20 bg-foreground/10'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveUploadId(item.id)}
                          className="flex items-center gap-3 text-left"
                        >
                          {item.type === 'file' ? (
                            <FileAudio className="h-5 w-5 text-foreground/80" />
                          ) : (
                            <LinkIcon className="h-5 w-5 text-foreground/80" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-foreground">{item.name}</p>
                            <p className="text-xs text-foreground/60">{item.kindLabel}</p>
                          </div>
                        </button>
                        <button
                          onClick={() => removeUploadedMusic(item.id)}
                          className="ml-1 text-foreground/60 hover:text-foreground transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
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
                    placeholder="Describe how to remix this song..."
                    value={chatPrompt}
                    onChange={(e) => setChatPrompt(e.target.value)}
                    className="flex-1 bg-transparent text-foreground placeholder:text-foreground/40 outline-none text-sm"
                  />
                </div>
                {mode === 'backend' && (
                  <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] px-3 py-2 text-left text-[11px] leading-relaxed text-foreground/55">
                    Prompt it like an AI remix copilot for the active source. Example: "{promptExamples[0]}"
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <select 
                    value={selectedGenre}
                    onChange={(e) => setSelectedGenre(e.target.value)}
                    className="text-foreground/60 text-xs px-2 py-2 border border-foreground/10 rounded-lg bg-background flex-1"
                  >
                    <option value="">Genre</option>
                    {BACKEND_GENRES.map((genre) => (
                      <option key={genre} value={genre}>
                        {genre}
                      </option>
                    ))}
                  </select>
                  <Button 
                    onClick={handleCreate}
                    disabled={isCreating}
                    className="bg-background hover:bg-background/80 text-foreground rounded-full px-4 text-xs border border-foreground/20"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    {isCreating ? 'Creating...' : 'Create'}
                  </Button>
                  {mode === 'backend' && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsHistoryDialogOpen(true)}
                      className="rounded-full border-foreground/20 bg-background px-4 text-xs text-foreground hover:bg-background/80"
                    >
                      <History className="mr-1 h-3 w-3" />
                      History
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Desktop Layout */}
              <div className="hidden sm:flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsUploadDialogOpen(true)}
                    className="text-foreground/60 hover:text-foreground transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                  <input 
                    type="text" 
                    placeholder="Describe how to remix this song, for example: make it Gen Z 80s with flute and tighter drums"
                    value={chatPrompt}
                    onChange={(e) => setChatPrompt(e.target.value)}
                    className="flex-1 bg-transparent text-foreground placeholder:text-foreground/40 outline-none text-base md:text-lg"
                  />
                  <input 
                    ref={fileInputRef}
                    type="file"
                    accept={FILE_ACCEPT}
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <select 
                    value={selectedGenre}
                    onChange={(e) => setSelectedGenre(e.target.value)}
                    className="text-foreground/60 hover:text-foreground transition-colors text-sm px-3 py-2 border border-foreground/10 rounded-lg bg-background"
                  >
                    <option value="">Genre</option>
                    {BACKEND_GENRES.map((genre) => (
                      <option key={genre} value={genre}>
                        {genre}
                      </option>
                    ))}
                  </select>
                  <Button 
                    onClick={handleCreate}
                    disabled={isCreating}
                    className="bg-background hover:bg-background/80 text-foreground rounded-full px-6 border border-foreground/20"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {isCreating ? 'Creating...' : 'Create'}
                  </Button>
                  {mode === 'backend' && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsHistoryDialogOpen(true)}
                      className="rounded-full border-foreground/20 bg-background/50 px-5 text-foreground hover:bg-background/80"
                    >
                      <History className="mr-2 h-4 w-4" />
                      History
                    </Button>
                  )}
                </div>
                {mode === 'backend' && (
                  <div className="flex flex-wrap items-center gap-2 pl-1 text-left">
                    <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-foreground/40">
                      Prompt ideas
                    </span>
                    {promptExamples.map((example) => (
                      <button
                        key={example}
                        type="button"
                        onClick={() => setChatPrompt(example)}
                        className="rounded-full border border-foreground/10 bg-foreground/[0.03] px-3 py-1.5 text-xs text-foreground/65 transition-colors hover:border-foreground/20 hover:bg-foreground/[0.07] hover:text-foreground"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                )}
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
            <DialogDescription className="text-foreground/60">
              Upload a track or paste a streaming link to send it into the AI remix backend.
            </DialogDescription>
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
                Upload one or more music/video files
              </Button>
              <p className="text-xs text-foreground/60">
                Supports MP3, WAV, MPEG, M4A, AAC, FLAC, OGG, MP4, MOV, AVI, MKV, and WEBM.
              </p>
              <input 
                ref={fileInputRef}
                type="file"
                accept={FILE_ACCEPT}
                multiple
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

      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-3xl border-foreground/20 bg-background text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">Remix History</DialogTitle>
            <DialogDescription className="text-foreground/60">
              Review stored songs and remixes from the AI remix backend.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-2">
            {historyLoading && (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-foreground/10 bg-foreground/5 px-4 py-8 text-sm text-foreground/70">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading history...
              </div>
            )}

            {!historyLoading && historyError && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {historyError}
              </div>
            )}

            {!historyLoading && !historyError && historyEntries.length === 0 && (
              <div className="rounded-2xl border border-foreground/10 bg-foreground/5 px-4 py-8 text-center text-sm text-foreground/60">
                No remixed songs have been saved yet.
              </div>
            )}

            {!historyLoading &&
              !historyError &&
              historyEntries.map((entry) => (
                <div
                  key={entry.entry_id}
                  className="rounded-2xl border border-foreground/10 bg-foreground/5 p-4"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{entry.title}</h3>
                      <p className="text-sm text-foreground/60">
                        {entry.genre} | {formatTimestamp(entry.created_at)}
                      </p>
                    </div>
                    <span className="rounded-full border border-foreground/10 bg-background/60 px-3 py-1 text-xs text-foreground/70">
                      {entry.source_audio_public_url ? 'Audio source' : entry.source_media_kind === 'video' ? 'Video source' : 'Audio source'}
                    </span>
                  </div>

                  {entry.comparison_summary && (
                    <p className="mt-3 text-sm leading-relaxed text-foreground/70">
                      {entry.comparison_summary}
                    </p>
                  )}

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-foreground/10 bg-background/40 p-3">
                      <p className="mb-2 text-xs font-medium uppercase tracking-[0.22em] text-foreground/50">
                        Original
                      </p>
                      {entry.source_audio_public_url ? (
                        <audio
                          controls
                          preload="none"
                          src={resolveBackendUrl(entry.source_audio_public_url)}
                          className="w-full"
                        />
                      ) : entry.source_public_url && entry.source_media_kind !== 'video' ? (
                        <audio
                          controls
                          preload="none"
                          src={resolveBackendUrl(entry.source_public_url)}
                          className="w-full"
                        />
                      ) : (
                        <p className="text-sm text-foreground/50">Original source unavailable.</p>
                      )}
                    </div>

                    <div className="rounded-xl border border-foreground/10 bg-background/40 p-3">
                      <p className="mb-2 text-xs font-medium uppercase tracking-[0.22em] text-foreground/50">
                        Remix
                      </p>
                      {entry.remix_public_url ? (
                        <audio
                          controls
                          preload="none"
                          src={resolveBackendUrl(entry.remix_public_url)}
                          className="w-full"
                        />
                      ) : (
                        <p className="text-sm text-foreground/50">Remix output unavailable.</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
};
