import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Mic, MicOff, Hand, Volume2, Loader2, LogOut, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAgoraAudio } from '@/hooks/useAgoraAudio';
import AuthPromptModal from './AuthPromptModal';
import { getFreshSession, isDemoSession } from '@/lib/authUtils';

// Audio waveform animation component
const AudioWaveform = ({ isActive }: { isActive: boolean }) => {
  if (!isActive) return null;
  
  return (
    <div className="flex items-center gap-[2px] h-3">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="w-[3px] bg-green-500 rounded-full animate-pulse"
          style={{
            height: `${Math.random() * 8 + 4}px`,
            animationDelay: `${i * 0.1}s`,
            animationDuration: '0.4s',
          }}
        />
      ))}
    </div>
  );
};

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
  const [isJoining, setIsJoining] = useState(false);
  const previousRoleRef = useRef<string | null>(null);

  // Agora Audio Hook - Reliable audio rooms
  const {
    isConnected: isAudioConnected,
    isConnecting: isAudioConnecting,
    isMuted,
    canPublish,
    participants: audioParticipants,
    error: audioError,
    connect: connectAudio,
    disconnect: disconnectAudio,
    reconnect: reconnectAudio,
    toggleMute,
    enableMicrophone,
  } = useAgoraAudio({
    sessionId,
    userId: user?.id || '',
    userName: user?.email?.split('@')[0] || 'Listener',
    isHost,
    onParticipantJoined: (participant) => {
      console.log('[Agora] Audio participant joined:', participant.name);
      fetchParticipants();
    },
    onParticipantLeft: (identity) => {
      console.log('[Agora] Audio participant left:', identity);
      fetchParticipants();
    },
  });

  // Show audio error
  useEffect(() => {
    if (audioError) {
      toast.error(audioError, { duration: 5000 });
    }
  }, [audioError]);

  // Initialize previousRoleRef when we first get participant data
  useEffect(() => {
    if (myParticipation && previousRoleRef.current === null) {
      previousRoleRef.current = myParticipation.role;
      console.log('📌 Initialized previousRoleRef to:', myParticipation.role);
    }
  }, [myParticipation]);

  // CRITICAL: When user is promoted to speaker, WAIT for DB sync then reconnect to get fresh token
  useEffect(() => {
    if (!myParticipation || !isAudioConnected) return;
    
    const currentRole = myParticipation.role;
    const prevRole = previousRoleRef.current;
    
    // Skip if we haven't initialized the previous role yet
    if (prevRole === null) return;
    
    // Check if user was just promoted from listener to speaker/co_host
    if (prevRole === 'listener' && (currentRole === 'speaker' || currentRole === 'co_host')) {
      console.log('🎤 User promoted from listener to', currentRole, '- waiting for DB sync...');
      toast.info('You were promoted! Connecting your microphone...');
      
      // CRITICAL: Wait 1.5s for database to fully sync before reconnecting
      // This ensures the agora-token function gets the updated role
      const timer = setTimeout(async () => {
        console.log('🔄 DB sync complete, reconnecting for publisher token...');
        await reconnectAudio();
      }, 1500);
      
      // Update previous role ref immediately to prevent multiple triggers
      previousRoleRef.current = currentRole;
      
      return () => clearTimeout(timer);
    }
    
    // Update previous role ref for non-promotion changes
    previousRoleRef.current = currentRole;
  }, [myParticipation?.role, isAudioConnected, reconnectAudio]);

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

  const fetchParticipants = async () => {
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

  const kickParticipant = async (participantId: string, participantUserId: string) => {
    if (!isHost) return;

    await supabase
      .from('podcast_participants')
      .delete()
      .eq('id', participantId);
    
    toast.success('Participant removed');
  };

  const banParticipant = async (participantId: string, participantUserId: string) => {
    if (!isHost || !user) return;

    await supabase
      .from('podcast_participants')
      .delete()
      .eq('id', participantId);

    await supabase.from('podcast_banned_users').insert({
      session_id: sessionId,
      user_id: participantUserId,
      banned_by: user.id,
      reason: 'Removed by host'
    });
    
    toast.success('Participant banned from session');
  };

  const MAX_PARTICIPANTS = 100;

  const joinSession = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (isJoining) return;
    setIsJoining(true);

    try {
      // For demo sessions, just connect audio
      if (isDemoSession(sessionId)) {
        await connectAudio(sessionId);
        toast.success('Joined the space!');
        return;
      }

      if (isBanned) {
        toast.error('You are banned from this session');
        return;
      }

      // If already joined, just connect audio
      if (myParticipation) {
        if (!isAudioConnected && !isAudioConnecting) {
          await connectAudio(sessionId);
        }
        return;
      }

      if (participants.length >= MAX_PARTICIPANTS) {
        toast.error(`Session is full (max ${MAX_PARTICIPANTS} participants)`);
        return;
      }

      const session = await getFreshSession();
      if (!session) {
        toast.error('Session expired. Please sign in again.');
        return;
      }

      // Leave previous session if needed
      if (previousSessionId && previousSessionId !== sessionId && !isDemoSession(previousSessionId)) {
        await supabase
          .from('podcast_participants')
          .delete()
          .eq('session_id', previousSessionId)
          .eq('user_id', user.id);
        await disconnectAudio();
      }

      // Insert as listener - automatic join, no approval needed
      const { error } = await supabase.from('podcast_participants').insert({
        session_id: sessionId,
        user_id: user.id,
        role: 'listener',
        is_muted: true
      });

      if (error) {
        if (error.code === '23505') {
          // Already in session - just connect audio
          if (!isAudioConnected && !isAudioConnecting) {
            await connectAudio(sessionId);
          }
          return;
        }
        toast.error('Failed to join session');
        return;
      }
      
      setPreviousSessionId(sessionId);
      
      // Immediately refresh participants to show user in the list
      await fetchParticipants();
      
      // Connect to audio with explicit sessionId - user will hear host immediately
      await connectAudio(sessionId);
      
      toast.success('Joined! You can now hear everyone.');
    } finally {
      setIsJoining(false);
    }
  };

  const toggleHandRaise = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (!myParticipation) {
      await joinSession();
      return;
    }

    // Optimistic update - immediately show the change
    const newHandRaised = !myParticipation.hand_raised;
    setMyParticipation(prev => prev ? { ...prev, hand_raised: newHandRaised } : null);
    toast.success(newHandRaised ? 'Hand raised!' : 'Hand lowered');

    // Then update database
    const { error } = await supabase
      .from('podcast_participants')
      .update({ hand_raised: newHandRaised })
      .eq('id', myParticipation.id);

    if (error) {
      // Revert on error
      setMyParticipation(prev => prev ? { ...prev, hand_raised: !newHandRaised } : null);
      toast.error('Failed to update');
    }
  };

  const handleToggleMute = async () => {
    if (!myParticipation) return;
    
    if (myParticipation.role === 'listener' && isMuted) {
      toast.error('Request to speak first');
      return;
    }

    await toggleMute();

    await supabase
      .from('podcast_participants')
      .update({ is_muted: !isMuted })
      .eq('id', myParticipation.id);
  };

  const goToHostProfile = () => {
    navigate(`/podcast-host/${hostId}`);
  };

  // Get audio state for a participant
  const getParticipantAudioState = (odUserId: string) => {
    return audioParticipants.find(ap => ap.id === odUserId);
  };

  // Show real participants, or host placeholder if empty
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
            <span className="text-[8px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded-full shrink-0 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              Live Audio
            </span>
          )}
          {isAudioConnecting && (
            <span className="text-[8px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full shrink-0 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Connecting...
            </span>
          )}
        </div>
        <p className="text-xs text-white/40">{listenerCount} listeners</p>
      </div>

      {/* Participants Grid */}
      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 gap-2 pb-4">
          {displayParticipants.map((p) => {
            const isHostRole = p.role === 'host';
            const isCoHost = p.role === 'co_host';
            const isSpeaker = p.role === 'speaker';
            const name = isHostRole && hostName ? hostName : getDisplayName(p.user_id);
            const avatarColor = getAvatarColor(p.user_id);
            const avatarUrl = isHostRole && hostAvatar ? hostAvatar : null;
            
            const audioState = getParticipantAudioState(p.user_id);
            const isSpeaking = audioState?.isSpeaking || false;
            const isParticipantMuted = audioState ? audioState.isMuted : p.is_muted;
            
            const canKick = isHost && !isHostRole && p.user_id !== user?.id;
            const isMe = p.user_id === user?.id;
            
            return (
              <div 
                key={p.id} 
                className="flex flex-col items-center gap-0.5 cursor-pointer group relative"
                onClick={isHostRole ? goToHostProfile : undefined}
              >
                <div className="relative">
                  <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center overflow-hidden transition-all ${
                    isHostRole ? 'ring-2 ring-purple-500 ring-offset-1 ring-offset-black' : ''
                  } ${isSpeaking ? 'ring-2 ring-green-500 ring-offset-1 ring-offset-black animate-pulse' : ''} ${
                    isMe ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-black' : ''
                  }`}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-xs font-bold">
                        {name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  
                  {/* Audio waveform animation when speaking */}
                  {isSpeaking && !isParticipantMuted && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                      <AudioWaveform isActive={true} />
                    </div>
                  )}
                  
                  {/* Mic status indicator */}
                  {!isParticipantMuted && (isHostRole || isCoHost || isSpeaker) && !isSpeaking && (
                    <div className="absolute -bottom-0.5 -right-0.5 rounded-full p-0.5 bg-green-500/50">
                      <Volume2 className="w-2 h-2 text-white" />
                    </div>
                  )}

                  {p.hand_raised && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg animate-bounce ring-2 ring-black">
                      <span className="text-[10px]">✋</span>
                    </div>
                  )}

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
                
                <span className="text-[9px] text-white/80 font-medium text-center truncate w-full">
                  {isMe ? `${name} (You)` : name}
                </span>
                
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

      {/* Bottom Controls */}
      <div className="flex items-center justify-center py-2 gap-1.5 border-t border-white/5 mt-2 flex-wrap">
        {/* Mic control for speakers/hosts */}
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

        {/* Request to speak button */}
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

        {/* Join/Leave Button */}
        {!myParticipation ? (
          <Button
            onClick={joinSession}
            disabled={isBanned || isJoining || isAudioConnecting}
            size="sm"
            className="h-7 px-3 text-xs bg-green-600 hover:bg-green-700"
          >
            {isJoining || isAudioConnecting ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Joining...
              </>
            ) : (
              'Join Session'
            )}
          </Button>
        ) : (
          <Button
            onClick={leaveSession}
            size="sm"
            variant="outline"
            className="h-7 px-3 text-xs border-white/20 text-white/60 hover:text-red-400 hover:border-red-400/50"
          >
            Leave
          </Button>
        )}
      </div>

      <AuthPromptModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  );
};

export default SpaceParticipants;
