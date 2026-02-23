import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getFreshSession, isDemoSession } from '@/lib/authUtils';
import { 
  Mic, MicOff, Radio, Users, Share2, 
  HandMetal, Volume2, X,
  Circle, StopCircle, Minimize2, Maximize2, VolumeX, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAgoraAudio } from '@/hooks/useAgoraAudio';

interface HostStudioProps {
  isOpen: boolean;
  onClose: () => void;
  session?: {
    id: string;
    title: string;
    status: string;
  } | null;
}


interface ParticipantInfo {
  id: string;
  user_id: string;
  role: string;
  is_muted: boolean;
  hand_raised: boolean;
}

const MAX_SESSION_DURATION_SECONDS = 60 * 60; // 1 hour max for Agora free plan

const HostStudio = ({ isOpen, onClose, session }: HostStudioProps) => {
  const { user } = useAuth();
  const [isLive, setIsLive] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [listenerCount, setListenerCount] = useState(0);
  const [title, setTitle] = useState(session?.title || '');
  const [sessionId, setSessionId] = useState(session?.id || '');
  const [raisedHands, setRaisedHands] = useState<ParticipantInfo[]>([]);
  const [allParticipants, setAllParticipants] = useState<ParticipantInfo[]>([]);
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState(MAX_SESSION_DURATION_SECONDS);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Agora Audio Hook - Reliable audio rooms
  const {
    isConnected: isAudioConnected,
    isConnecting: isAudioConnecting,
    isMuted,
    isRecording,
    participants: audioParticipants,
    error: audioError,
    connect: connectAudio,
    disconnect: disconnectAudio,
    toggleMute,
    enableMicrophone,
    startRecording,
    saveEpisode,
  } = useAgoraAudio({
    sessionId: sessionId || session?.id || '',
    userId: user?.id || '',
    userName: user?.email?.split('@')[0] || 'Host',
    isHost: true,
  });

  // Format recording duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format remaining time for display (mm:ss)
  const formatRemainingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 1-hour session timer - auto-end when time runs out
  useEffect(() => {
    if (isLive && sessionStartTime) {
      timerIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
        const remaining = MAX_SESSION_DURATION_SECONDS - elapsed;
        
        setRemainingTime(remaining);
        
        // Warning at 5 minutes remaining
        if (remaining === 300) {
          toast.warning('5 minutes remaining in your session!');
        }
        
        // Warning at 1 minute remaining
        if (remaining === 60) {
          toast.warning('1 minute remaining! Session will end soon.');
        }
        
        // Auto-end session when time is up
        if (remaining <= 0) {
          toast.error('Session time limit reached (1 hour). Ending session...');
          endSession();
        }
      }, 1000);
    }
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isLive, sessionStartTime]);

  // Check for existing live session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      if (!user) return;
      
      const { data: existingSession } = await supabase
        .from('podcast_sessions')
        .select('*')
        .eq('host_id', user.id)
        .eq('status', 'live')
        .single();
      
      if (existingSession) {
        console.log('🔄 Found existing live session:', existingSession.id);
        setSessionId(existingSession.id);
        setTitle(existingSession.title);
        setIsLive(true);
        
        // Calculate remaining time based on when session started
        if (existingSession.started_at) {
          const startTime = new Date(existingSession.started_at).getTime();
          setSessionStartTime(startTime);
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          setRemainingTime(Math.max(0, MAX_SESSION_DURATION_SECONDS - elapsed));
        }
        
        subscribeToUpdates(existingSession.id);
        fetchRaisedHands();
        
        // Reconnect to Agora audio
        if (!isAudioConnected && !isAudioConnecting) {
          console.log('🔌 Reconnecting to audio...');
          await connectAudio(existingSession.id);
        }
      }
    };

    if (isOpen && user) {
      checkExistingSession();
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (session?.id) {
      setSessionId(session.id);
      setTitle(session.title);
      setIsLive(session.status === 'live');
      fetchRaisedHands();
      subscribeToUpdates(session.id);
    }

    // Warn user before closing tab if live
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isLive) {
        e.preventDefault();
        e.returnValue = 'You have a live session running. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Only disconnect audio - don't end session on navigate away
      // Session will persist until explicitly ended
    };
  }, [session, isLive, sessionId]);

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
      setAllParticipants(participants as ParticipantInfo[]);
      setRaisedHands(participants.filter((p: any) => p.hand_raised) as ParticipantInfo[]);
    }
  };

  // Track previous raised hands to detect new requests
  const prevRaisedHandsRef = useRef<string[]>([]);
  
  useEffect(() => {
    if (!isLive || raisedHands.length === 0) {
      prevRaisedHandsRef.current = raisedHands.map(h => h.id);
      return;
    }
    
    const prevIds = new Set(prevRaisedHandsRef.current);
    const newRequests = raisedHands.filter(h => !prevIds.has(h.id));
    
    newRequests.forEach(req => {
      toast(`User ${req.user_id.slice(0, 6)} wants to speak`, {
        duration: 10000,
        action: {
          label: 'Accept',
          onClick: () => promoteSpeaker(req.id),
        },
      });
    });
    
    prevRaisedHandsRef.current = raisedHands.map(h => h.id);
  }, [raisedHands, isLive]);

  // Host mute a participant
  const muteParticipant = async (participantId: string, shouldMute: boolean) => {
    const authSession = await getFreshSession();
    if (!authSession) return;

    await supabase
      .from('podcast_participants')
      .update({ is_muted: shouldMute })
      .eq('id', participantId);
    
    toast.success(shouldMute ? 'Participant muted' : 'Participant unmuted');
    fetchRaisedHands();
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

    try {
      // Check for existing live session to prevent duplicates
      const { data: existingSession } = await supabase
        .from('podcast_sessions')
        .select('id, title')
        .eq('host_id', user.id)
        .eq('status', 'live')
        .is('ended_at', null)
        .maybeSingle();
      
      if (existingSession) {
        console.log('🔄 Using existing live session:', existingSession.id);
        setSessionId(existingSession.id);
        setTitle(existingSession.title);
        setIsLive(true);
        subscribeToUpdates(existingSession.id);
        
        // Connect to audio for existing session
        if (!isAudioConnected && !isAudioConnecting) {
          await connectAudio(existingSession.id);
        }
        
        toast.info('Reconnected to your existing live session');
        return;
      }

      // Fetch user profile for cover image
      const { data: profileData } = await supabase
        .from('profiles')
        .select('avatar_url, cover_image_url')
        .eq('user_id', user.id)
        .single();

      const coverImage = profileData?.cover_image_url || profileData?.avatar_url || `https://api.dicebear.com/9.x/shapes/svg?seed=${user.id}&size=400&backgroundColor=0a0a0a,1a1a2e,16213e`;

      const { data, error } = await supabase
        .from('podcast_sessions')
        .insert({
          host_id: user.id,
          title: title.trim(),
          status: 'live',
          started_at: new Date().toISOString(),
          cover_image_url: coverImage
        })
        .select()
        .single();

      if (error) {
        console.error('Start session error:', error);
        toast.error('Failed to start session');
        return;
      }

      const newSessionId = data.id;
      console.log('🎙️ Session created:', newSessionId);
      
      // Set session start time for 1-hour timer
      setSessionStartTime(Date.now());
      setRemainingTime(MAX_SESSION_DURATION_SECONDS);

      await supabase.from('podcast_participants').insert({
        session_id: newSessionId,
        user_id: user.id,
        role: 'host',
        is_muted: false
      });

      setSessionId(newSessionId);
      setIsLive(true);
      subscribeToUpdates(newSessionId);

      // Pass the session ID directly to connectAudio to avoid state timing issues
      await connectAudio(newSessionId);
      
      // Auto-start recording when going live
      console.log('🎙️ Auto-starting recording...');
      setTimeout(() => {
        startRecording();
      }, 1500); // Wait for audio track to be established
      
      // Notify all followers that host went live
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('user_id', user.id)
          .single();

        await supabase.functions.invoke('create-notification', {
          body: {
            notify_followers: true,
            source_user_id: user.id,
            type: 'follow_live',
            title: '🔴 Live Now!',
            message: `${profile?.full_name || 'Someone you follow'} just went live: ${title.trim()}`,
            icon_url: profile?.avatar_url || null,
            action_url: `/podcasts?session=${newSessionId}`,
          },
        });
      } catch (notifErr) {
        console.log('Notification send failed (non-critical):', notifErr);
      }

      toast.success('You are now LIVE!');
    } catch (err) {
      console.error('Failed to start session:', err);
      toast.error('Failed to start session');
    }
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


  const MAX_SPEAKERS = 4; // 1 host + 3 speakers/co-hosts maximum

  // Count current speakers
  const currentSpeakers = allParticipants.filter(p => 
    p.role === 'host' || p.role === 'co_host' || p.role === 'speaker'
  ).length;

  const promoteSpeaker = async (participantId: string) => {
    const authSession = await getFreshSession();
    if (!authSession) return;

    // Check speaker limit
    if (currentSpeakers >= MAX_SPEAKERS) {
      toast.error(`Maximum ${MAX_SPEAKERS} speakers reached (1 host + 3 co-hosts/speakers)`);
      return;
    }

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


  const handleToggleRecording = async () => {
    if (isRecording) {
      await saveEpisode(title, `Recorded live session: ${title}`);
    } else {
      await startRecording();
    }
  };


  // Track mic permission state
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);

  const handleAudioIconClick = async () => {
    if (!isLive) {
      // Test microphone before going live
      setIsMicTesting(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        setMicPermissionGranted(true);
        toast.success('Microphone is ready! Click "Go Live" to start.');
      } catch (error) {
        console.error('Microphone error:', error);
        setMicPermissionGranted(false);
        toast.error('Unable to access microphone. Please check permissions.');
      } finally {
        setIsMicTesting(false);
      }
    } else {
      // Toggle mute when live
      await toggleMute();
    }
  };

  // Minimized view when live
  if (isMinimized && isLive) {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-black/95 border border-white/10 rounded-xl p-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="animate-pulse w-2 h-2 bg-red-500 rounded-full"></span>
            <span className="text-xs text-white font-medium">LIVE</span>
          </div>
          <span className="text-xs text-white/60">{listenerCount} listeners</span>
          <Button
            onClick={toggleMute}
            size="icon"
            className={`h-8 w-8 rounded-full ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}
          >
            {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Button
            onClick={() => setIsMinimized(false)}
            size="icon"
            className="h-8 w-8 bg-white/10"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            onClick={endSession}
            size="sm"
            variant="destructive"
            className="h-8 px-3 text-xs"
          >
            End
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black/95 border-white/10 max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2 text-sm">
            <Radio className={`h-4 w-4 ${isLive ? 'text-red-500 animate-pulse' : 'text-white/60'}`} />
            Host Studio
            {isAudioConnecting && (
              <span className="ml-2 text-[10px] px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Connecting audio...
              </span>
            )}
            {isAudioConnected && !isAudioConnecting && (
              <span className="ml-2 text-[10px] px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                Audio Live
              </span>
            )}
            {isLive && remainingTime > 0 && (
              <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${
                remainingTime <= 300 ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/60'
              }`}>
                ⏱️ {formatRemainingTime(remainingTime)}
              </span>
            )}
            {audioError && (
              <span className="ml-2 text-[10px] px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full flex items-center gap-1">
                ⚠️ Audio Error
              </span>
            )}
            {isLive && (
              <Button
                onClick={() => { setIsMinimized(true); onClose(); }}
                size="icon"
                variant="ghost"
                className="ml-auto h-6 w-6"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            )}
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
            {/* Audio/Mic button - shows mic ready state before live */}
            <Button
              onClick={handleAudioIconClick}
              disabled={isMicTesting}
              size="lg"
              className={`rounded-full w-14 h-14 ${
                isLive 
                  ? (isMuted ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30')
                  : micPermissionGranted 
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
              }`}
            >
              {isMicTesting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isLive ? (
                isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />
              ) : micPermissionGranted ? (
                <Mic className="h-5 w-5" />
              ) : (
                <MicOff className="h-5 w-5" />
              )}
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
            <div className="flex items-center justify-center gap-2 py-2 bg-red-500/10 rounded-lg border border-red-500/30">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              <span className="text-xs text-red-400 font-medium">Recording in progress...</span>
            </div>
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
                        key={p.id}
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

              {/* All Participants with Mute Controls */}
              {allParticipants.filter(p => p.role !== 'host').length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] text-white/60 uppercase tracking-wider">Participants ({allParticipants.length - 1})</h4>
                  <div className="flex flex-wrap gap-2">
                    {allParticipants.filter(p => p.role !== 'host').map((p) => (
                      <div
                        key={p.id}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
                          p.hand_raised ? 'bg-yellow-500/20 ring-1 ring-yellow-500' : 'bg-white/5'
                        }`}
                      >
                        {p.hand_raised && <HandMetal className="h-3 w-3 text-yellow-400" />}
                        <span className="text-white">User {p.user_id.slice(0, 4)}</span>
                        <button
                          onClick={() => muteParticipant(p.id, !p.is_muted)}
                          className={`p-1 rounded-full ${p.is_muted ? 'bg-red-500/20' : 'bg-green-500/20'}`}
                        >
                          {p.is_muted ? (
                            <VolumeX className="h-3 w-3 text-red-400" />
                          ) : (
                            <Volume2 className="h-3 w-3 text-green-400" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raised Hands */}
              {raisedHands.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] text-yellow-400 uppercase tracking-wider flex items-center gap-1">
                    <HandMetal className="h-3 w-3" /> Wants to Speak ({currentSpeakers}/{MAX_SPEAKERS} speakers)
                    {raisedHands.length > 0 && (
                      <span className="ml-1 bg-yellow-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                        {raisedHands.length}
                      </span>
                    )}
                  </h4>
                  {currentSpeakers >= MAX_SPEAKERS && (
                    <p className="text-[10px] text-red-400 bg-red-500/10 px-2 py-1 rounded">
                      ⚠️ Maximum {MAX_SPEAKERS} speakers reached (1 host + 3 co-hosts/speakers). Remove a speaker to add more.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {raisedHands.map((p) => (
                      <Button
                        key={p.id}
                        onClick={() => promoteSpeaker(p.id)}
                        size="sm"
                        disabled={currentSpeakers >= MAX_SPEAKERS}
                        className={`h-7 text-xs ${currentSpeakers >= MAX_SPEAKERS ? 'bg-gray-500/20 text-gray-400' : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'}`}
                      >
                        Allow User {p.user_id.slice(0, 4)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

            </>
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default HostStudio;
