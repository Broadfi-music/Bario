import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Mic, MicOff, Hand, Volume2, Loader2, LogOut, Ban, Plus, Users, Trophy, Music } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAgoraAudio } from '@/hooks/useAgoraAudio';
import AuthPromptModal from './AuthPromptModal';
import TopEngagementModal from './TopEngagementModal';
import DailyRankingModal from './DailyRankingModal';
import { getFreshSession, isDemoSession, isValidUUID } from '@/lib/authUtils';

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

// Fallback display name - only used if profile fetch fails
const getFallbackName = (userId: string) => {
  return userId.slice(0, 6);
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
  const [isFollowing, setIsFollowing] = useState(false);
  const [showEngagementModal, setShowEngagementModal] = useState(false);
  const [showDailyRanking, setShowDailyRanking] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [engagementCount, setEngagementCount] = useState(0);
  const [listenerCountState, setListenerCountState] = useState(0);
  const [profileMap, setProfileMap] = useState<Map<string, { full_name: string | null; username: string | null; avatar_url: string | null }>>(new Map());
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

  // Auto-connect audio for listening (without joining session as participant)
  // This allows listeners to hear the stream without clicking "Join Session"
  const [isListening, setIsListening] = useState(false);
  
  useEffect(() => {
    // Auto-connect to audio as a listener when viewing the session
    // Listeners can hear without needing to click join
    const autoConnectAudio = async () => {
      if (!isAudioConnected && !isAudioConnecting && !isListening && sessionId) {
        console.log('🔊 Auto-connecting audio for listening...');
        setIsListening(true);
        try {
          await connectAudio(sessionId);
        } catch (err) {
          console.error('Auto-connect failed:', err);
          setIsListening(false);
        }
      }
    };

    // Small delay to allow component to mount
    const timer = setTimeout(autoConnectAudio, 1000);
    return () => clearTimeout(timer);
  }, [sessionId, isAudioConnected, isAudioConnecting]);

  // Listen for session ending - when host ends session, all listeners should leave
  useEffect(() => {
    if (isDemoSession(sessionId)) return;
    
    const checkSessionStatus = async () => {
      const { data: session } = await supabase
        .from('podcast_sessions')
        .select('status, ended_at')
        .eq('id', sessionId)
        .single();
      
      if (session && session.status === 'ended') {
        console.log('📴 Session has ended by host');
        toast.info('This session has ended');
        disconnectAudio();
        setMyParticipation(null);
        onLeave?.();
        navigate('/podcasts');
      }
    };

    const sessionChannel = supabase
      .channel(`session-status-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'podcast_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload: any) => {
          console.log('📡 Session update received:', payload.new);
          if (payload.new.status === 'ended') {
            console.log('📴 Host ended the session - disconnecting all listeners');
            toast.info('The host has ended this session');
            disconnectAudio();
            setMyParticipation(null);
            onLeave?.();
            // Navigate back to podcasts feed
            navigate('/podcasts');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
    };
  }, [sessionId, disconnectAudio, onLeave, navigate]);

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

  // Check follow status for host
  useEffect(() => {
    if (!user || !hostId || isDemoSession(sessionId) || !isValidUUID(hostId)) return;
    const checkFollow = async () => {
      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', hostId)
        .maybeSingle();
      setIsFollowing(!!data);
    };
    checkFollow();
  }, [user, hostId, sessionId]);

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
      
      // Fetch profiles for all participants
      const userIds = data.map(p => p.user_id).filter(isValidUUID);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, username, avatar_url')
          .in('user_id', userIds);
        
        if (profiles) {
          const newMap = new Map(profiles.map(p => [p.user_id, p]));
          setProfileMap(newMap);
        }
      }
      
      setListenerCountState(data.length);
      setEngagementCount(data.length + Math.floor(Math.random() * 5));
    }
  };

  const leaveSession = async () => {
    if (!user) return;

    // Disconnect audio first
    await disconnectAudio();
    
    // Remove from participants if we have a participation record
    if (myParticipation) {
      await supabase
        .from('podcast_participants')
        .delete()
        .eq('id', myParticipation.id);
    }
    
    setMyParticipation(null);
    toast.success('Left the space');
    onLeave?.();
    navigate('/podcasts');
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
  const MAX_SPEAKERS = 4; // 1 host + 3 speakers/co-hosts maximum

  // Count current speakers (host, co_host, speaker roles)
  const currentSpeakers = participants.filter(p => 
    p.role === 'host' || p.role === 'co_host' || p.role === 'speaker'
  ).length;

  const canPromoteToSpeaker = currentSpeakers < MAX_SPEAKERS;

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

      // Insert as listener with mic ON by default - user controls their own mic
      const { error } = await supabase.from('podcast_participants').insert({
        session_id: sessionId,
        user_id: user.id,
        role: 'listener',
        is_muted: false // MIC ON by default - everyone can speak
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
    
    // Allow mute/unmute for speakers, co-hosts, and hosts
    if (myParticipation.role === 'listener') {
      toast.error('Request to speak first');
      return;
    }

    await toggleMute();

    // Sync mute state to DB
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

  // listenerCount is tracked via listenerCountState

  return (
    <div className="flex flex-col h-full bg-black px-3 py-2">
      {/* Session Header - like DemoLiveSpace */}
      <div className="pb-2 border-b border-white/5 mb-2">
        <div className="flex items-start gap-2">
          {/* Host avatar + name */}
          <button
            onClick={() => navigate(`/podcast-host/${hostId}`)}
            className="flex flex-col items-center shrink-0 hover:opacity-80 transition-opacity"
          >
            <div className="w-6 h-6 rounded-full overflow-hidden">
              {hostAvatar ? (
                <img src={hostAvatar} alt={hostName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500" />
              )}
            </div>
            <span className="text-[8px] text-white/60 font-medium mt-0.5 truncate max-w-[50px]">{hostName || 'Host'}</span>
          </button>

          {/* Title + engagement row */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h1 className="text-white font-semibold text-sm truncate">
                {title || 'Live Session'}
              </h1>
              <div className="flex items-center gap-1 text-white/60 shrink-0 ml-2">
                <Users className="h-3.5 w-3.5" />
                <span className="text-xs">{listenerCountState}</span>
              </div>
            </div>

            {/* Engagement, D1, Follow */}
            <div className="flex items-center gap-2 mt-1">
              {/* Top Engagement */}
              <button onClick={() => setShowEngagementModal(true)} className="flex items-center gap-1 hover:opacity-80 transition-opacity">
                <span className="text-[10px] text-white/50 font-medium">{engagementCount} engaged</span>
              </button>

              {/* D1 Ranking */}
              <button onClick={() => setShowDailyRanking(true)} className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-yellow-500/20 hover:bg-yellow-500/30 transition-colors">
                <Trophy className="w-3 h-3 text-yellow-400" />
                <span className="text-[10px] text-yellow-400 font-semibold">D1</span>
              </button>

              {/* Follow Button */}
              <button
                onClick={async () => {
                  if (!user) {
                    toast.error('Please log in to follow');
                    return;
                  }
                  if (isFollowing) {
                    await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', hostId);
                    setIsFollowing(false);
                    toast.success('Unfollowed');
                  } else {
                    await supabase.from('follows').insert({ follower_id: user.id, following_id: hostId });
                    setIsFollowing(true);
                    toast.success('Following!');
                  }
                }}
                className={`h-5 px-2 rounded text-[10px] font-semibold transition-colors ${
                  isFollowing
                    ? 'bg-white/10 text-white hover:bg-white/20'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            </div>

            {/* Audio connection status */}
            <div className="flex items-center gap-2 mt-1">
              {isAudioConnected && (
                <span className="text-[8px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  Live Audio
                </span>
              )}
              {isAudioConnecting && (
                <span className="text-[8px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Connecting...
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Participants Grid */}
      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 gap-2 pb-4">
          {displayParticipants.map((p) => {
            const isHostRole = p.role === 'host';
            const isCoHost = p.role === 'co_host';
            const isSpeaker = p.role === 'speaker';
            const profile = profileMap.get(p.user_id);
            const name = isHostRole && hostName ? hostName : (profile?.full_name || profile?.username || getFallbackName(p.user_id));
            const avatarColor = getAvatarColor(p.user_id);
            const avatarUrl = isHostRole && hostAvatar ? hostAvatar : (profile?.avatar_url || null);
            
            const audioState = getParticipantAudioState(p.user_id);
            const isSpeaking = audioState?.isSpeaking || false;
            const isParticipantMuted = audioState ? audioState.isMuted : p.is_muted;
            
            const canKick = isHost && !isHostRole && p.user_id !== user?.id;
            const isMe = p.user_id === user?.id;
            
            const avatarElement = (
              <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center overflow-hidden transition-all cursor-pointer hover:opacity-80 ${
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
            );

            return (
              <div 
                key={p.id} 
                className="flex flex-col items-center gap-0.5 group relative"
              >
                <div className="relative">
                  {isMe ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="relative">
                          {avatarElement}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-36 p-1.5 bg-zinc-900 border-white/10 rounded-xl shadow-xl"
                        side="top"
                        sideOffset={8}
                      >
                        <div className="flex flex-col gap-1">
                          {myParticipation && (myParticipation.role === 'host' || myParticipation.role === 'co_host' || myParticipation.role === 'speaker') && (
                            <button
                              onClick={handleToggleMute}
                              disabled={!isAudioConnected}
                              className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-xs font-medium text-white hover:bg-white/10 transition-colors"
                            >
                              {isMuted ? (
                                <>
                                  <MicOff className="w-3.5 h-3.5 text-red-400" />
                                  <span>Unmute Mic</span>
                                </>
                              ) : (
                                <>
                                  <Mic className="w-3.5 h-3.5 text-green-400" />
                                  <span>Mute Mic</span>
                                </>
                              )}
                            </button>
                          )}
                          <button
                            onClick={leaveSession}
                            className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Leave Session</span>
                          </button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : isHostRole ? (
                    <button onClick={goToHostProfile} className="relative">
                      {avatarElement}
                    </button>
                  ) : canKick ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="relative">
                          {avatarElement}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-36 p-1.5 bg-zinc-900 border-white/10 rounded-xl shadow-xl"
                        side="top"
                        sideOffset={8}
                      >
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => kickParticipant(p.id, p.user_id)}
                            className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-xs font-medium text-white hover:bg-white/10 transition-colors"
                          >
                            <LogOut className="w-3.5 h-3.5 text-red-400" />
                            <span>Kick</span>
                          </button>
                          <button
                            onClick={() => banParticipant(p.id, p.user_id)}
                            className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Ban</span>
                          </button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <div>{avatarElement}</div>
                  )}
                  
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

                  {isParticipantMuted && isMe && myParticipation?.role !== 'listener' && (
                    <div className="absolute -bottom-0.5 -right-0.5 rounded-full p-0.5 bg-red-500/50">
                      <MicOff className="w-2 h-2 text-white" />
                    </div>
                  )}

                  {p.hand_raised && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg animate-bounce ring-2 ring-black">
                      <span className="text-[10px]">✋</span>
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

          {/* Invite Slots - Click to join session automatically */}
          {Array.from({ length: Math.max(0, MAX_SPEAKERS - currentSpeakers) }).map((_, i) => (
            <div key={`invite-slot-${i}`} className="flex flex-col items-center gap-0.5">
              <button
                onClick={async () => {
                  if (!user) {
                    setShowAuthModal(true);
                    return;
                  }
                  // If already joined, request to speak
                  if (myParticipation) {
                    if (myParticipation.hand_raised) {
                      toast.info('Request already sent!');
                      return;
                    }
                    toggleHandRaise();
                    return;
                  }
                  // Auto-join session as listener
                  await joinSession();
                }}
                disabled={isJoining || isAudioConnecting}
                className={`w-11 h-11 rounded-full border-2 border-dashed flex items-center justify-center transition-colors ${
                  isJoining || isAudioConnecting
                    ? 'border-white/10 bg-white/5'
                    : myParticipation?.hand_raised
                      ? 'border-yellow-500/50 bg-yellow-500/10'
                      : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                }`}
              >
                {isJoining || isAudioConnecting ? (
                  <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
                ) : (
                  <Plus className={`w-4 h-4 ${myParticipation?.hand_raised ? 'text-yellow-400' : 'text-white/40'}`} />
                )}
              </button>
              <span className="text-[9px] text-white/30">Join</span>
            </div>
          ))}
        </div>
      </div>

      {/* Audio connection status bar */}
      {isAudioConnecting && (
        <div className="flex items-center justify-center py-1.5 border-t border-white/5 mt-2">
          <span className="text-[10px] text-yellow-400 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> Connecting audio...
          </span>
        </div>
      )}

      <AuthPromptModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />

      <TopEngagementModal
        isOpen={showEngagementModal}
        onClose={() => setShowEngagementModal(false)}
        sessionId={sessionId}
        onSendGift={() => { setShowEngagementModal(false); setShowGiftModal(true); }}
      />

      <DailyRankingModal
        isOpen={showDailyRanking}
        onClose={() => setShowDailyRanking(false)}
        sessionId={sessionId}
        onSendGift={() => { setShowDailyRanking(false); setShowGiftModal(true); }}
      />
    </div>
  );
};

export default SpaceParticipants;
