import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Mic, MicOff, Radio, Users, Music, Share2, 
  HandMetal, Volume2, Pause, Play, X, Plus,
  Sparkles, MessageSquare, Settings
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
  { id: 'clap', label: '👏 Clap', audio: null },
  { id: 'airhorn', label: '📢 Airhorn', audio: null },
  { id: 'drum', label: '🥁 Drum Roll', audio: null },
  { id: 'laugh', label: '😂 Laugh', audio: null },
  { id: 'wow', label: '😮 Wow', audio: null },
  { id: 'boo', label: '👎 Boo', audio: null },
];

const CURATED_MUSIC = [
  { id: '1', title: 'Lo-Fi Beats', artist: 'ChillHop', playing: false },
  { id: '2', title: 'Jazz Vibes', artist: 'Smooth Jazz', playing: false },
  { id: '3', title: 'Afrobeats Mix', artist: 'Various', playing: false },
  { id: '4', title: 'Hip-Hop Classics', artist: 'Various', playing: false },
];

const HostStudio = ({ isOpen, onClose, session }: HostStudioProps) => {
  const { user } = useAuth();
  const [isMuted, setIsMuted] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [listenerCount, setListenerCount] = useState(0);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [currentMusic, setCurrentMusic] = useState<typeof CURATED_MUSIC[0] | null>(null);
  const [title, setTitle] = useState(session?.title || '');
  const [sessionId, setSessionId] = useState(session?.id || '');
  const [raisedHands, setRaisedHands] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);

  useEffect(() => {
    if (session?.id) {
      setSessionId(session.id);
      setTitle(session.title);
      setIsLive(session.status === 'live');
      
      // Fetch participants with raised hands
      fetchRaisedHands();
      
      // Subscribe to updates
      const channel = supabase
        .channel(`studio-${session.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'podcast_participants',
            filter: `session_id=eq.${session.id}`
          },
          () => fetchRaisedHands()
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'podcast_comments',
            filter: `session_id=eq.${session.id}`
          },
          (payload) => {
            setComments(prev => [...prev.slice(-9), payload.new]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [session]);

  const fetchRaisedHands = async () => {
    if (!session?.id) return;
    
    const { data: participants } = await supabase
      .from('podcast_participants')
      .select('*')
      .eq('session_id', session.id);
    
    if (participants) {
      setListenerCount(participants.length);
      setRaisedHands(participants.filter(p => p.hand_raised));
    }
  };

  const startSession = async () => {
    if (!user || !title.trim()) {
      toast.error('Please enter a title');
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
    toast.success('You are now LIVE!');
  };

  const endSession = async () => {
    if (!sessionId) return;

    await supabase
      .from('podcast_sessions')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', sessionId);

    setIsLive(false);
    toast.success('Session ended');
    onClose();
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    toast(isMuted ? 'Microphone ON' : 'Microphone OFF');
  };

  const playSound = (soundId: string) => {
    // Sound effect placeholder - would connect to actual audio
    toast(`Playing ${soundId} sound effect`);
  };

  const promoteSpeaker = async (participantId: string) => {
    await supabase
      .from('podcast_participants')
      .update({ role: 'speaker', hand_raised: false, is_muted: false })
      .eq('id', participantId);
    
    toast.success('Promoted to speaker');
  };

  const shareSession = () => {
    const url = `${window.location.origin}/podcasts?session=${sessionId}`;
    navigator.clipboard.writeText(url);
    toast.success('Session link copied!');
  };

  const playMusic = (music: typeof CURATED_MUSIC[0]) => {
    setCurrentMusic(music);
    setShowMusicPicker(false);
    toast(`Now playing: ${music.title}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black/95 border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Radio className={`h-5 w-5 ${isLive ? 'text-red-500 animate-pulse' : 'text-white/60'}`} />
            Host Studio
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Session Title */}
          {!isLive && (
            <div className="space-y-2">
              <label className="text-xs text-white/60">Session Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's your podcast about?"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          )}

          {/* Live Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button
              onClick={toggleMute}
              size="lg"
              className={`rounded-full w-16 h-16 ${
                isMuted ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
              }`}
            >
              {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </Button>

            {!isLive ? (
              <Button
                onClick={startSession}
                size="lg"
                className="bg-red-600 hover:bg-red-500 text-white px-8"
              >
                <Radio className="h-5 w-5 mr-2" />
                Go Live
              </Button>
            ) : (
              <Button
                onClick={endSession}
                size="lg"
                variant="destructive"
                className="px-8"
              >
                End Session
              </Button>
            )}
          </div>

          {isLive && (
            <>
              {/* Stats Bar */}
              <div className="flex items-center justify-center gap-6 py-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-400" />
                  <span className="text-sm text-white">{listenerCount} listening</span>
                </div>
                <div className="flex items-center gap-2">
                  <HandMetal className="h-4 w-4 text-yellow-400" />
                  <span className="text-sm text-white">{raisedHands.length} hands</span>
                </div>
                <Button variant="ghost" size="sm" onClick={shareSession}>
                  <Share2 className="h-4 w-4 mr-1" />
                  Share
                </Button>
              </div>

              {/* Sound Effects */}
              <div className="space-y-2">
                <h4 className="text-xs text-white/60 uppercase tracking-wider">Sound Effects</h4>
                <div className="grid grid-cols-6 gap-2">
                  {SOUND_EFFECTS.map((sound) => (
                    <button
                      key={sound.id}
                      onClick={() => playSound(sound.id)}
                      className="p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-center"
                    >
                      <span className="text-lg">{sound.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Music Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs text-white/60 uppercase tracking-wider">Background Music</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMusicPicker(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Music
                  </Button>
                </div>
                
                {currentMusic && (
                  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                    <div className="w-10 h-10 rounded bg-purple-500/30 flex items-center justify-center">
                      <Music className="h-5 w-5 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white">{currentMusic.title}</p>
                      <p className="text-xs text-white/60">{currentMusic.artist}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setCurrentMusic(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Raised Hands */}
              {raisedHands.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs text-yellow-400 uppercase tracking-wider flex items-center gap-1">
                    <HandMetal className="h-3 w-3" /> Wants to Speak
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {raisedHands.map((p) => (
                      <Button
                        key={p.id}
                        onClick={() => promoteSpeaker(p.id)}
                        size="sm"
                        className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                      >
                        Allow to Speak
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Live Comments */}
              <div className="space-y-2">
                <h4 className="text-xs text-white/60 uppercase tracking-wider flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" /> Live Comments
                </h4>
                <div className="h-32 overflow-y-auto bg-white/5 rounded-lg p-2 space-y-1">
                  {comments.map((c, i) => (
                    <div key={i} className="text-xs">
                      <span className="text-purple-400">User: </span>
                      <span className="text-white/80">{c.content}</span>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-xs text-white/40 text-center py-4">
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
          <div className="absolute inset-0 bg-black/90 flex items-center justify-center">
            <div className="bg-white/5 rounded-xl p-4 w-full max-w-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-medium">Select Music</h4>
                <Button variant="ghost" size="icon" onClick={() => setShowMusicPicker(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {CURATED_MUSIC.map((music) => (
                <button
                  key={music.id}
                  onClick={() => playMusic(music)}
                  className="w-full flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded bg-purple-500/30 flex items-center justify-center">
                    <Music className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-white">{music.title}</p>
                    <p className="text-xs text-white/60">{music.artist}</p>
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
