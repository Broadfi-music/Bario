import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Mic, MicOff, Hand, UserPlus, Volume2, Loader2, LogOut, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useVoiceRoom } from '@/hooks/useVoiceRoom';
import AuthPromptModal from './AuthPromptModal';
import { getFreshSession, isDemoSession } from '@/lib/authUtils';

interface Participant {
  id: string;
  user_id: string;
  role: 'host' | 'co_host' | 'speaker' | 'listener';
  is_muted: boolean;
  hand_raised: boolean;
  joined_at: string;
}

interface SpaceParticipantsProps {
  sessionId: string;
  hostId: string;
  isHost: boolean;
  title?: string;
  hostName?: string;
  hostAvatar?: string | null;
  onLeave?: () => void;
  onSwitchSession?: () => void;
}

const getAvatarColor = (id: string) => {
  const colors = [
    'from-orange-500 to-red-500',
    'from-blue-500 to-purple-500',
    'from-green-500 to-teal-500',
    'from-pink-500 to-rose-500',
    'from-yellow-500 to-orange-500',
    'from-indigo-500 to-blue-500',
  ];
  const index = id.charCodeAt(0) % colors.length;
  return colors[index];
};

const getDisplayName = (userId: string) => {
  const names = ['TNTR', 'Raymond', 'Teresa', 'Susana', 'Steven', 'Benny', 'Sheldon', 'Billy', 'Dan', 'CW', 'Ron', 'JD', 'Okie', 'STARR', 'John', 'Lonnie'];
  const index = userId.charCodeAt(0) % names.length;
  return names[index];
};

const SpaceParticipants = ({ sessionId, hostId, isHost, title, hostName, hostAvatar, onLeave, onSwitchSession }: SpaceParticipantsProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [myParticipation, setMyParticipation] = useState<Participant | null>(null);
  const [isBanned, setIsBanned] = useState(false);
  const [previousSessionId, setPreviousSessionId] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Voice Room Hook (with Jitsi fallback)
  const {
    isConnected: isAudioConnected,
    isConnecting: isAudioConnecting,
    isMuted,
    participants: audioParticipants,
    error: audioError,
    micPermissionGranted,
    connect: connectAudio,
    disconnect: disconnectAudio,
    toggleMute,
    enableMicrophone,
  } = useVoiceRoom({
    sessionId,
    userId: user?.id || '',
    userName: user?.email?.split('@')[0] || 'Listener',
    isHost,
  });

  // Show mic permission error
  useEffect(() => {
    if (audioError && audioError.includes('Microphone')) {
      toast.error(audioError, {
        duration: 5000,
        description: 'Click the lock icon in your address bar to allow microphone access'
      });
    }
  }, [audioError]);

  // Check if user is banned from this session
  const checkBanStatus = useCallback(async () => {
    if (!user || isDemoSession(sessionId)) return;
    const { data } = await supabase
      .from('podcast_banned_users')
      .select('id')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .maybeSingle();
    
    setIsBanned(!!data);
  }, [sessionId, user]);

  useEffect(() => {
    fetchParticipants();
    checkBanStatus();

    const channel = supabase
      .channel(`participants-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'podcast_participants',
          filter: `session_id=eq.${sessionId}`
        },
        () => fetchParticipants()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'podcast_banned_users',
          filter: `session_id=eq.${sessionId}`
        },
        () => {
          checkBanStatus();
          // If user gets kicked, disconnect and leave
          if (user && myParticipation) {
            checkBanStatus().then(() => {
              if (isBanned) {
                disconnectAudio();
                setMyParticipation(null);
                toast.error('You have been removed from this session');
              }
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      disconnectAudio();
    };
  }, [sessionId, user]);

  // Check if user was promoted to speaker and enable mic
  useEffect(() => {
    if (myParticipation && (myParticipation.role === 'speaker' || myParticipation.role === 'co_host')) {
      if (isAudioConnected) {
        enableMicrophone();
      }
    }
  }, [myParticipation?.role, isAudioConnected]);

  const fetchParticipants = async () => {
    // Skip database calls for demo sessions
    if (isDemoSession(sessionId)) return;
    
    const { data } = await supabase
      .from('podcast_participants')
      .select('*')
      .eq('session_id', sessionId)
      .order('joined_at', { ascending: true });
    
    if (data) {
      setParticipants(data as Participant[]);
      if (user) {
        const myP = data.find(p => p.user_id === user.id);
        setMyParticipation(myP as Participant || null);
      }
    }
  };

  // Leave current session
  const leaveSession = async () => {
    if (!user || !myParticipation) return;

    await disconnectAudio();
    
    await supabase
      .from('podcast_participants')
      .delete()
      .eq('id', myParticipation.id);
    
    setMyParticipation(null);
    toast.success('Left the space');
    onLeave?.();
  };

  // Kick a participant (host only)
  const kickParticipant = async (participantId: string, participantUserId: string) => {
    if (!isHost) return;

    await supabase
      .from('podcast_participants')
      .delete()
      .eq('id', participantId);
    
    toast.success('Participant removed');
  };

  // Ban a participant (host only)
  const banParticipant = async (participantId: string, participantUserId: string) => {
    if (!isHost || !user) return;

    // First kick them
    await supabase
      .from('podcast_participants')
      .delete()
      .eq('id', participantId);

    // Then ban them
    await supabase.from('podcast_banned_users').insert({
      session_id: sessionId,
      user_id: participantUserId,
      banned_by: user.id,
      reason: 'Removed by host'
    });
    
    toast.success('Participant banned from session');
  };

  const MAX_PARTICIPANTS = 12; // Limit for free LiveKit tier

  const joinSession = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    // For demo sessions, simulate joining
    if (isDemoSession(sessionId)) {
      toast.success('Joined the space!');
      await connectAudio();
      return;
    }

    // Check if banned
    if (isBanned) {
      toast.error('You are banned from this session');
      return;
    }

    // Check if already joined
    if (myParticipation) {
      toast.info('You are already in this space');
      return;
    }

    // Check participant limit
    if (participants.length >= MAX_PARTICIPANTS) {
      toast.error(`Session is full (max ${MAX_PARTICIPANTS} participants)`);
      return;
    }

    // Ensure fresh auth session
    const session = await getFreshSession();
    if (!session) {
      toast.error('Session expired. Please sign in again.');
      return;
    }

    // Leave previous session if in one
    if (previousSessionId && previousSessionId !== sessionId && !isDemoSession(previousSessionId)) {
      await supabase
        .from('podcast_participants')
        .delete()
        .eq('session_id', previousSessionId)
        .eq('user_id', user.id);
      await disconnectAudio();
    }

    const { error } = await supabase.from('podcast_participants').insert({
      session_id: sessionId,
      user_id: user.id,
      role: 'listener',
      is_muted: true
    });

    if (error) {
      console.error('Join session error:', error);
      if (error.code === '23505') {
        toast.info('You are already in this space');
      } else {
        toast.error('Failed to join session');
      }
    } else {
      setPreviousSessionId(sessionId);
      toast.success('Joined the space!');
      await connectAudio();
    }
  };

  const toggleHandRaise = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (!myParticipation) {
      // Auto-join first then raise hand
      await joinSession();
      return;
    }

    const { error } = await supabase
      .from('podcast_participants')
      .update({ hand_raised: !myParticipation.hand_raised })
      .eq('id', myParticipation.id);

    if (error) {
      toast.error('Failed to update');
    } else {
      toast.success(myParticipation.hand_raised ? 'Hand lowered' : 'Hand raised!');
    }
  };

  const handleToggleMute = async () => {
    if (!myParticipation) return;
    
    // Only speakers and above can unmute
    if (myParticipation.role === 'listener' && isMuted) {
      toast.error('Request to speak first');
      return;
    }

    await toggleMute();

    // Update in database
    await supabase
      .from('podcast_participants')
      .update({ is_muted: !isMuted })
      .eq('id', myParticipation.id);
  };

  const goToHostProfile = () => {
    navigate(`/podcast-host/${hostId}`);
  };

  // Merge database participants with audio participants for speaking indicators
  const getParticipantAudioState = (userId: string) => {
    const audioP = audioParticipants.find(ap => ap.identity === userId);
    return audioP || null;
  };

  // Only show real participants - no demo/dummy data
  // If no participants, just show the host placeholder
  const displayParticipants: Participant[] = participants.length === 0 
    ? [{ id: 'host-placeholder', user_id: hostId, role: 'host', is_muted: false, hand_raised: false, joined_at: '' }]
    : participants;

  const listenerCount = displayParticipants.filter(p => p.role === 'listener').length;

  return (
    <div className="flex flex-col h-full bg-black px-3 py-2">
      {/* Title */}
      <div className="mb-2">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-bold text-white line-clamp-2 flex-1">
            {title || 'Live Podcast Session'}
          </h1>
          {isAudioConnected && (
            <span className="text-[8px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded-full shrink-0">
              Audio Live
            </span>
          )}
        </div>
        <p className="text-xs text-white/40">{listenerCount} listeners • {participants.length}/{MAX_PARTICIPANTS} capacity</p>
      </div>

      {/* Participants Grid - Compact Twitter Space Style with normal scroll */}
      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 gap-2 pb-4">
          {displayParticipants.map((p) => {
            const isHostRole = p.role === 'host';
            const isCoHost = p.role === 'co_host';
            const isSpeaker = p.role === 'speaker';
            const name = isHostRole && hostName ? hostName : getDisplayName(p.user_id);
            const avatarColor = getAvatarColor(p.user_id);
            const avatarUrl = isHostRole && hostAvatar ? hostAvatar : null;
            
            // Get real-time audio state
            const audioState = getParticipantAudioState(p.user_id);
            const isSpeaking = audioState?.isSpeaking || false;
            const isParticipantMuted = audioState ? audioState.isMuted : p.is_muted;
            
            const canKick = isHost && !isHostRole && p.user_id !== user?.id;
            
            return (
              <div 
                key={p.id} 
                className="flex flex-col items-center gap-0.5 cursor-pointer group relative"
                onClick={isHostRole ? goToHostProfile : undefined}
              >
                <div className="relative">
                  {/* Avatar with speaking ring */}
                  <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center overflow-hidden transition-all ${
                    isHostRole ? 'ring-2 ring-purple-500 ring-offset-1 ring-offset-black' : ''
                  } ${isSpeaking ? 'ring-2 ring-green-500 ring-offset-1 ring-offset-black animate-pulse' : ''}`}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-xs font-bold">
                        {name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  
                  {/* Speaking indicator */}
                  {!isParticipantMuted && (isHostRole || isCoHost || isSpeaker) && (
                    <div className={`absolute -bottom-0.5 -right-0.5 rounded-full p-0.5 ${isSpeaking ? 'bg-green-500' : 'bg-green-500/50'}`}>
                      <Volume2 className="w-2 h-2 text-white" />
                    </div>
                  )}

                  {/* Hand raised indicator - Twitter Spaces style */}
                  {p.hand_raised && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg animate-bounce ring-2 ring-black">
                      <span className="text-[10px]">✋</span>
                    </div>
                  )}

                  {/* Kick/Ban overlay for host */}
                  {canKick && (
                    <div className="absolute inset-0 bg-black/70 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center gap-0.5 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); kickParticipant(p.id, p.user_id); }}
                        className="p-1 bg-red-500/80 rounded-full hover:bg-red-500"
                        title="Kick"
                      >
                        <LogOut className="w-2.5 h-2.5 text-white" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); banParticipant(p.id, p.user_id); }}
                        className="p-1 bg-orange-500/80 rounded-full hover:bg-orange-500"
                        title="Ban"
                      >
                        <Ban className="w-2.5 h-2.5 text-white" />
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Name */}
                <span className="text-[9px] text-white/80 font-medium text-center truncate w-full">
                  {name}
                </span>
                
                {/* Role Label */}
                {(isHostRole || isCoHost) && (
                  <span className={`text-[8px] ${isHostRole ? 'text-purple-400' : 'text-white/50'}`}>
                    {isHostRole ? '🎙️ Host' : 'Co-host'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Controls - All in one compact row */}
      <div className="flex items-center justify-center py-2 gap-1.5 border-t border-white/5 mt-2 flex-wrap">
        {/* Audio control */}
        {myParticipation && myParticipation.role !== 'listener' && (
          <Button
            onClick={handleToggleMute}
            disabled={!isAudioConnected}
            size="icon"
            variant="ghost"
            className={`h-8 w-8 rounded-full border ${isMuted ? 'border-red-500/50 text-red-400' : 'border-green-500/50 text-green-400'}`}
          >
            {isMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          </Button>
        )}

        {/* Request button */}
        <button 
          onClick={toggleHandRaise}
          disabled={isBanned}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full border transition-colors text-xs ${
            myParticipation?.hand_raised 
              ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400' 
              : 'border-white/20 text-white/60 hover:text-white hover:border-white/40'
          } ${isBanned ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Hand className="h-3 w-3" />
          <span>{myParticipation?.hand_raised ? 'Requested' : 'Request'}</span>
        </button>

        {/* Join Space button */}
        {!myParticipation && !isBanned && (
          <Button
            onClick={joinSession}
            disabled={isAudioConnecting}
            size="sm"
            className="bg-purple-600 hover:bg-purple-500 rounded-full px-3 h-7 text-xs"
          >
            {isAudioConnecting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <UserPlus className="h-3 w-3 mr-1" />
                Join
              </>
            )}
          </Button>
        )}

        {/* Leave Session button */}
        {myParticipation && (
          <Button
            onClick={leaveSession}
            size="sm"
            variant="ghost"
            className="rounded-full px-2.5 h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <LogOut className="h-3 w-3 mr-1" />
            Leave
          </Button>
        )}

        {/* Banned indicator */}
        {isBanned && (
          <span className="text-xs text-red-400 px-2">Banned from session</span>
        )}
      </div>

      {/* Auth Prompt Modal */}
      <AuthPromptModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        action="join live podcast sessions"
      />
    </div>
  );
};

export default SpaceParticipants;
