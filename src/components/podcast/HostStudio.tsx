import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getFreshSession, isDemoSession } from '@/lib/authUtils';
import { 
  Mic, MicOff, Radio, Users, Music, Share2, 
  HandMetal, Volume2, X, Plus, MessageSquare, Play, Pause,
  Circle, StopCircle, Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useVoiceRoom } from '@/hooks/useVoiceRoom';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useVoiceRoom } from '@/hooks/useVoiceRoom';

interface HostStudioProps {
  isOpen: boolean;
  onClose: () => void;
  session?: {
    id: string;
    title: string;
    status: string;
  } | null;
}

const SOUND_EFFECTS = [
  { id: 'clap', label: '👏', name: 'Clap' },
  { id: 'airhorn', label: '📢', name: 'Airhorn' },
  { id: 'drum', label: '🥁', name: 'Drum' },
  { id: 'laugh', label: '😂', name: 'Laugh' },
  { id: 'wow', label: '😮', name: 'Wow' },
  { id: 'boo', label: '👎', name: 'Boo' },
];

const CURATED_MUSIC = [
  { id: '1', title: 'Lo-Fi Beats', artist: 'ChillHop', url: '' },
  { id: '2', title: 'Jazz Vibes', artist: 'Smooth Jazz', url: '' },
  { id: '3', title: 'Afrobeats Mix', artist: 'Various', url: '' },
  { id: '4', title: 'Hip-Hop Classics', artist: 'Various', url: '' },
];

interface UploadedMusic {
  id: string;
  title: string;
  artist: string;
  url: string;
  type: 'background' | 'playlist';
}

const HostStudio = ({ isOpen, onClose, session }: HostStudioProps) => {
  const { user } = useAuth();
  const [isLive, setIsLive] = useState(false);
  const [listenerCount, setListenerCount] = useState(0);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [currentMusic, setCurrentMusic] = useState<(typeof CURATED_MUSIC[0] & { url?: string }) | null>(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [title, setTitle] = useState(session?.title || '');
  const [sessionId, setSessionId] = useState(session?.id || '');
  const [raisedHands, setRaisedHands] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [uploadedMusic, setUploadedMusic] = useState<UploadedMusic[]>([]);
  const [isUploadingMusic, setIsUploadingMusic] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice Room Hook with Jitsi fallback
  const {
    isConnected: isAudioConnected,
    isConnecting: isAudioConnecting,
    isMuted,
    isRecording,
    participants: audioParticipants,
    provider: audioProvider,
    connect: connectAudio,
    disconnect: disconnectAudio,
    toggleMute,
    enableMicrophone,
    startRecording,
    saveEpisode,
  } = useVoiceRoom({
    sessionId: sessionId || session?.id || '',
    userId: user?.id || '',
    userName: user?.email?.split('@')[0] || 'Host',
    isHost: true,
  });

  useEffect(() => {
    if (session?.id) {
      setSessionId(session.id);
      setTitle(session.title);
      setIsLive(session.status === 'live');
      fetchRaisedHands();
      subscribeToUpdates(session.id);
    }
    return () => {
      disconnectAudio();
    };
  }, [session]);

  const subscribeToUpdates = (sid: string) => {
    const channel = supabase
      .channel(`studio-${sid}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'podcast_participants',
          filter: `session_id=eq.${sid}`
        },
        () => fetchRaisedHands()
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'podcast_comments',
          filter: `session_id=eq.${sid}`
        },
        (payload) => {
          setComments(prev => [...prev.slice(-9), payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchRaisedHands = async () => {
    if (!sessionId && !session?.id) return;
    const sid = sessionId || session?.id;
    
    if (sid && isDemoSession(sid)) return;

    const authSession = await getFreshSession();
    if (!authSession) return;
    
    const { data: participants } = await supabase
      .from('podcast_participants')
      .select('*')
      .eq('session_id', sid);
    
    if (participants) {
      setListenerCount(participants.length);
      setRaisedHands(participants.filter((p: any) => p.hand_raised));
    }
  };

  const startSession = async () => {
    if (!user) {
      toast.error('Please sign in first');
      return;
    }
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    const authSession = await getFreshSession();
    if (!authSession) {
      toast.error('Session expired. Please sign in again.');
      return;
    }

    const { data, error } = await supabase
      .from('podcast_sessions')
      .insert({
        host_id: user.id,
        title: title.trim(),
        status: 'live',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Start session error:', error);
      toast.error('Failed to start session');
      return;
    }

    await supabase.from('podcast_participants').insert({
      session_id: data.id,
      user_id: user.id,
      role: 'host',
      is_muted: false
    });

    setSessionId(data.id);
    setIsLive(true);
    subscribeToUpdates(data.id);

    await connectAudio();
    
    toast.success('You are now LIVE!');
  };

  const endSession = async () => {
    if (!sessionId) return;

    if (isRecording) {
      await saveEpisode(title, `Recorded live session: ${title}`);
    }

    await supabase
      .from('podcast_sessions')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (user && !isRecording) {
      await supabase.from('podcast_episodes').insert({
        session_id: sessionId,
        host_id: user.id,
        title: title,
        description: `Recorded live session: ${title}`
      });
    }

    await disconnectAudio();
    setIsLive(false);
    toast.success('Session ended & saved as episode');
    onClose();
  };

  const playSound = (soundId: string, label: string) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = soundId === 'airhorn' ? 400 : 600;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.1;
    
    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      audioContext.close();
    }, 200);
    
    toast(`${label} played!`);
  };

  const promoteSpeaker = async (participantId: string) => {
    const authSession = await getFreshSession();
    if (!authSession) return;

    await supabase
      .from('podcast_participants')
      .update({ role: 'speaker', hand_raised: false, is_muted: false })
      .eq('id', participantId);
    
    toast.success('Promoted to speaker');
    fetchRaisedHands();
  };

  const shareSession = () => {
    const url = `${window.location.origin}/podcasts?session=${sessionId}`;
    navigator.clipboard.writeText(url);
    toast.success('Session link copied!');
  };

  const playMusic = (music: typeof CURATED_MUSIC[0] | UploadedMusic) => {
    setCurrentMusic(music);
    setShowMusicPicker(false);
    
    if (music.url && audioRef.current) {
      audioRef.current.src = music.url;
      audioRef.current.play();
      setIsMusicPlaying(true);
    } else {
      setIsMusicPlaying(true);
    }
    toast(`Now playing: ${music.title}`);
  };

  const toggleMusic = () => {
    if (audioRef.current) {
      if (isMusicPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
    setIsMusicPlaying(!isMusicPlaying);
    toast(isMusicPlaying ? 'Music paused' : 'Music playing');
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      await saveEpisode(title, `Recorded live session: ${title}`);
    } else {
      await startRecording();
    }
  };

  const handleMusicUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast.error('Please upload an audio file');
      return;
    }

    setIsUploadingMusic(true);
    
    try {
      const authSession = await getFreshSession();
      if (!authSession) {
        toast.error('Please sign in to upload music');
        return;
      }

      const fileName = `${user?.id}/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('user-uploads')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(fileName);

      const newMusic: UploadedMusic = {
        id: Date.now().toString(),
        title: file.name.replace(/\.[^/.]+$/, ''),
        artist: 'Uploaded',
        url: publicUrl,
        type: 'playlist'
      };

      setUploadedMusic(prev => [...prev, newMusic]);
      toast.success('Music uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload music');
    } finally {
      setIsUploadingMusic(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAudioIconClick = async () => {
    if (!isLive) {
      // Test microphone before going live
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        toast.success('Microphone is ready!');
      } catch (error) {
        console.error('Microphone error:', error);
        toast.error('Unable to access microphone. Please check permissions.');
      }
    } else {
      await toggleMute();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black/95 border-white/10 max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2 text-sm">
            <Radio className={`h-4 w-4 ${isLive ? 'text-red-500 animate-pulse' : 'text-white/60'}`} />
            Host Studio
            {isAudioConnected && (
              <span className="ml-auto text-[10px] px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">
                {audioProvider === 'jitsi' ? 'Jitsi' : 'LiveKit'} Connected
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Hidden audio element for music playback */}
        <audio ref={audioRef} className="hidden" onEnded={() => setIsMusicPlaying(false)} />
        
        {/* Hidden file input for music upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleMusicUpload}
        />

        <div className="space-y-4">
          {/* Session Title */}
          {!isLive && (
            <div className="space-y-1">
              <label className="text-[10px] text-white/60 uppercase">Session Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's your podcast about?"
                className="bg-white/5 border-white/10 text-white text-sm h-9"
              />
            </div>
          )}

          {/* Live Controls */}
          <div className="flex items-center justify-center gap-3">
            {/* Audio/Mic button - always clickable for testing */}
            <Button
              onClick={handleAudioIconClick}
              size="lg"
              className={`rounded-full w-14 h-14 ${
                isLive 
                  ? (isMuted ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400')
                  : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
              }`}
            >
              {isMuted || !isLive ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>

            {!isLive ? (
              <Button
                onClick={startSession}
                size="lg"
                disabled={isAudioConnecting}
                className="bg-red-600 hover:bg-red-500 text-white px-6 h-12"
              >
                {isAudioConnecting ? (
                  <>Connecting...</>
                ) : (
                  <>
                    <Radio className="h-4 w-4 mr-2" />
                    Go Live
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={endSession}
                size="lg"
                variant="destructive"
                className="px-6 h-12"
              >
                End Session
              </Button>
            )}

            {/* Recording button */}
            {isLive && (
              <Button
                onClick={handleToggleRecording}
                size="lg"
                className={`rounded-full w-14 h-14 ${
                  isRecording ? 'bg-red-500 animate-pulse' : 'bg-white/10'
                }`}
              >
                {isRecording ? (
                  <StopCircle className="h-5 w-5 text-white" />
                ) : (
                  <Circle className="h-5 w-5 text-red-400" />
                )}
              </Button>
            )}
          </div>

          {isRecording && (
            <p className="text-center text-xs text-red-400 animate-pulse">
              ● Recording in progress...
            </p>
          )}

          {isLive && (
            <>
              {/* Stats Bar */}
              <div className="flex items-center justify-center gap-4 py-2 bg-white/5 rounded-lg">
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-purple-400" />
                  <span className="text-xs text-white">{audioParticipants.length || listenerCount} listening</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <HandMetal className="h-3.5 w-3.5 text-yellow-400" />
                  <span className="text-xs text-white">{raisedHands.length} hands</span>
                </div>
                <Button variant="ghost" size="sm" onClick={shareSession} className="h-7 text-xs">
                  <Share2 className="h-3 w-3 mr-1" />
                  Share
                </Button>
              </div>

              {/* Audio Participants */}
              {audioParticipants.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] text-white/60 uppercase tracking-wider">Audio Participants</h4>
                  <div className="flex flex-wrap gap-2">
                    {audioParticipants.map((p) => (
                      <div
                        key={p.identity}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
                          p.isSpeaking ? 'bg-green-500/20 ring-1 ring-green-500' : 'bg-white/5'
                        }`}
                      >
                        {p.isMuted ? (
                          <MicOff className="h-3 w-3 text-red-400" />
                        ) : (
                          <Volume2 className={`h-3 w-3 ${p.isSpeaking ? 'text-green-400' : 'text-white/40'}`} />
                        )}
                        <span className="text-white">{p.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sound Effects */}
              <div className="space-y-1.5">
                <h4 className="text-[10px] text-white/60 uppercase tracking-wider">Sound Effects</h4>
                <div className="grid grid-cols-6 gap-1.5">
                  {SOUND_EFFECTS.map((sound) => (
                    <button
                      key={sound.id}
                      onClick={() => playSound(sound.id, sound.label)}
                      className="p-2.5 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-center"
                    >
                      <span className="text-lg">{sound.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Music Section */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] text-white/60 uppercase tracking-wider">Background Music</h4>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingMusic}
                      className="h-6 text-xs"
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      {isUploadingMusic ? 'Uploading...' : 'Upload'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowMusicPicker(true)}
                      className="h-6 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
                
                {currentMusic && (
                  <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleMusic}
                      className="h-8 w-8 bg-purple-500/30"
                    >
                      {isMusicPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{currentMusic.title}</p>
                      <p className="text-[10px] text-white/60">{currentMusic.artist}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setCurrentMusic(null)} className="h-6 w-6">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Raised Hands */}
              {raisedHands.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] text-yellow-400 uppercase tracking-wider flex items-center gap-1">
                    <HandMetal className="h-3 w-3" /> Wants to Speak
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {raisedHands.map((p) => (
                      <Button
                        key={p.id}
                        onClick={() => promoteSpeaker(p.id)}
                        size="sm"
                        className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 h-7 text-xs"
                      >
                        Allow User {p.user_id.slice(0, 4)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Live Comments */}
              <div className="space-y-1.5">
                <h4 className="text-[10px] text-white/60 uppercase tracking-wider flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" /> Live Comments
                </h4>
                <div className="h-24 overflow-y-auto bg-white/5 rounded-lg p-2 space-y-0.5">
                  {comments.map((c, i) => (
                    <div key={i} className="text-[10px]">
                      <span className="text-purple-400">User: </span>
                      <span className="text-white/80">{c.content}</span>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-[10px] text-white/40 text-center py-4">
                      Comments will appear here...
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Music Picker Modal */}
        {showMusicPicker && (
          <div className="absolute inset-0 bg-black/90 flex items-center justify-center rounded-lg">
            <div className="bg-white/5 rounded-xl p-3 w-full max-w-xs space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-medium text-sm">Select Music</h4>
                <Button variant="ghost" size="icon" onClick={() => setShowMusicPicker(false)} className="h-6 w-6">
                  <X className="h-3 w-3" />
                </Button>
              </div>
              
              {/* Uploaded Music */}
              {uploadedMusic.length > 0 && (
                <>
                  <p className="text-[10px] text-white/40 uppercase">Your Uploads</p>
                  {uploadedMusic.map((music) => (
                    <button
                      key={music.id}
                      onClick={() => playMusic(music)}
                      className="w-full flex items-center gap-2 p-2 bg-purple-500/10 rounded-lg hover:bg-purple-500/20 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded bg-purple-500/30 flex items-center justify-center">
                        <Music className="h-4 w-4 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-xs text-white">{music.title}</p>
                        <p className="text-[10px] text-white/60">{music.artist}</p>
                      </div>
                    </button>
                  ))}
                </>
              )}

              <p className="text-[10px] text-white/40 uppercase">Curated</p>
              {CURATED_MUSIC.map((music) => (
                <button
                  key={music.id}
                  onClick={() => playMusic(music)}
                  className="w-full flex items-center gap-2 p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded bg-purple-500/30 flex items-center justify-center">
                    <Music className="h-4 w-4 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-white">{music.title}</p>
                    <p className="text-[10px] text-white/60">{music.artist}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default HostStudio;
