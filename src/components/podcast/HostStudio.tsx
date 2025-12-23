import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Mic, MicOff, Radio, Users, Music, Share2, 
  HandMetal, Volume2, X, Plus, MessageSquare, Play, Pause
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  { id: '1', title: 'Lo-Fi Beats', artist: 'ChillHop', url: 'https://example.com/lofi.mp3' },
  { id: '2', title: 'Jazz Vibes', artist: 'Smooth Jazz', url: 'https://example.com/jazz.mp3' },
  { id: '3', title: 'Afrobeats Mix', artist: 'Various', url: 'https://example.com/afro.mp3' },
  { id: '4', title: 'Hip-Hop Classics', artist: 'Various', url: 'https://example.com/hiphop.mp3' },
];

const HostStudio = ({ isOpen, onClose, session }: HostStudioProps) => {
  const { user } = useAuth();
  const [isMuted, setIsMuted] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [listenerCount, setListenerCount] = useState(0);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [currentMusic, setCurrentMusic] = useState<typeof CURATED_MUSIC[0] | null>(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [title, setTitle] = useState(session?.title || '');
  const [sessionId, setSessionId] = useState(session?.id || '');
  const [raisedHands, setRaisedHands] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (session?.id) {
      setSessionId(session.id);
      setTitle(session.title);
      setIsLive(session.status === 'live');
      fetchRaisedHands();
      subscribeToUpdates(session.id);
    }
    return () => {
      stopAudio();
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
    
    const { data: participants } = await supabase
      .from('podcast_participants')
      .select('*')
      .eq('session_id', sid);
    
    if (participants) {
      setListenerCount(participants.length);
      setRaisedHands(participants.filter(p => p.hand_raised));
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

    // Request microphone access
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
    } catch (err) {
      toast.error('Microphone access denied');
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
      toast.error('Failed to start session');
      return;
    }

    // Join as host
    await supabase.from('podcast_participants').insert({
      session_id: data.id,
      user_id: user.id,
      role: 'host',
      is_muted: false
    });

    setSessionId(data.id);
    setIsLive(true);
    setIsMuted(false);
    subscribeToUpdates(data.id);
    toast.success('You are now LIVE!');
  };

  const endSession = async () => {
    if (!sessionId) return;

    await supabase
      .from('podcast_sessions')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', sessionId);

    // Create episode from session
    if (user) {
      await supabase.from('podcast_episodes').insert({
        session_id: sessionId,
        host_id: user.id,
        title: title,
        description: `Recorded live session: ${title}`
      });
    }

    stopAudio();
    setIsLive(false);
    toast.success('Session ended & saved as episode');
    onClose();
  };

  const stopAudio = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const toggleMute = async () => {
    if (mediaStreamRef.current) {
      const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
        toast(isMuted ? 'Microphone ON' : 'Microphone OFF');
        
        // Update in database
        if (sessionId && user) {
          await supabase
            .from('podcast_participants')
            .update({ is_muted: !isMuted })
            .eq('session_id', sessionId)
            .eq('user_id', user.id);
        }
      }
    } else {
      setIsMuted(!isMuted);
      toast(isMuted ? 'Microphone ON' : 'Microphone OFF');
    }
  };

  const playSound = (soundId: string, label: string) => {
    // Create audio context for sound effect
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

  const playMusic = (music: typeof CURATED_MUSIC[0]) => {
    setCurrentMusic(music);
    setShowMusicPicker(false);
    setIsMusicPlaying(true);
    toast(`Now playing: ${music.title}`);
  };

  const toggleMusic = () => {
    setIsMusicPlaying(!isMusicPlaying);
    toast(isMusicPlaying ? 'Music paused' : 'Music playing');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black/95 border-white/10 max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2 text-sm">
            <Radio className={`h-4 w-4 ${isLive ? 'text-red-500 animate-pulse' : 'text-white/60'}`} />
            Host Studio
          </DialogTitle>
        </DialogHeader>

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
            <Button
              onClick={toggleMute}
              size="lg"
              className={`rounded-full w-14 h-14 ${
                isMuted ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
              }`}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>

            {!isLive ? (
              <Button
                onClick={startSession}
                size="lg"
                className="bg-red-600 hover:bg-red-500 text-white px-6 h-12"
              >
                <Radio className="h-4 w-4 mr-2" />
                Go Live
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
          </div>

          {isLive && (
            <>
              {/* Stats Bar */}
              <div className="flex items-center justify-center gap-4 py-2 bg-white/5 rounded-lg">
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-purple-400" />
                  <span className="text-xs text-white">{listenerCount} listening</span>
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
