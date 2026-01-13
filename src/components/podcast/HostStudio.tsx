import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getFreshSession, isDemoSession } from '@/lib/authUtils';
import { 
  Mic, MicOff, Radio, Users, Music, Share2, 
  HandMetal, Volume2, X, Plus, MessageSquare, Play, Pause,
  Circle, StopCircle, Upload, List, Trash2, Minimize2, Maximize2, VolumeX, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAgoraAudio } from '@/hooks/useAgoraAudio';
import { useHostPlaylists } from '@/hooks/useHostPlaylists';

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
  { id: 'clap', label: '👏', name: 'Clap', frequency: 800, duration: 150 },
  { id: 'airhorn', label: '📢', name: 'Airhorn', frequency: 400, duration: 300 },
  { id: 'drum', label: '🥁', name: 'Drum', frequency: 150, duration: 200 },
  { id: 'laugh', label: '😂', name: 'Laugh', frequency: 500, duration: 400 },
  { id: 'wow', label: '😮', name: 'Wow', frequency: 300, duration: 250 },
  { id: 'boo', label: '👎', name: 'Boo', frequency: 200, duration: 350 },
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
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [currentMusic, setCurrentMusic] = useState<(typeof CURATED_MUSIC[0] & { url?: string }) | null>(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [title, setTitle] = useState(session?.title || '');
  const [sessionId, setSessionId] = useState(session?.id || '');
  const [raisedHands, setRaisedHands] = useState<ParticipantInfo[]>([]);
  const [allParticipants, setAllParticipants] = useState<ParticipantInfo[]>([]);
  const [uploadedMusic, setUploadedMusic] = useState<UploadedMusic[]>([]);
  const [isUploadingMusic, setIsUploadingMusic] = useState(false);
  const [showPlaylistManager, setShowPlaylistManager] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState(MAX_SESSION_DURATION_SECONDS);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Persistent Playlists
  const {
    playlists,
    loading: playlistsLoading,
    createPlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    deletePlaylist
  } = useHostPlaylists();

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

  const playSound = (sound: typeof SOUND_EFFECTS[0]) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = sound.frequency;
    oscillator.type = sound.id === 'drum' ? 'triangle' : sound.id === 'airhorn' ? 'sawtooth' : 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration / 1000);
    
    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      audioContext.close();
    }, sound.duration);
    
    toast(`${sound.label} played!`);
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

  // Multi-file upload handler
  const handleMusicUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const audioFiles = Array.from(files).filter(file => file.type.startsWith('audio/'));
    if (audioFiles.length === 0) {
      toast.error('Please upload audio files');
      return;
    }

    setIsUploadingMusic(true);
    
    try {
      const authSession = await getFreshSession();
      if (!authSession) {
        toast.error('Please sign in to upload music');
        return;
      }

      const uploadedTracks: UploadedMusic[] = [];

      for (const file of audioFiles) {
        const fileName = `${user?.id}/${Date.now()}-${file.name}`;
        const { data, error } = await supabase.storage
          .from('user-uploads')
          .upload(fileName, file);

        if (error) {
          console.error('Upload error:', error);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('user-uploads')
          .getPublicUrl(fileName);

        uploadedTracks.push({
          id: Date.now().toString() + Math.random(),
          title: file.name.replace(/\.[^/.]+$/, ''),
          artist: 'Uploaded',
          url: publicUrl,
          type: 'playlist'
        });
      }

      if (uploadedTracks.length > 0) {
        setUploadedMusic(prev => [...prev, ...uploadedTracks]);
        toast.success(`${uploadedTracks.length} track(s) uploaded successfully!`);
      }
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

        {/* Hidden audio element for music playback */}
        <audio ref={audioRef} className="hidden" onEnded={() => setIsMusicPlaying(false)} />
        
        {/* Hidden file input for multi-file music upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          multiple
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

              {/* Sound Effects */}
              <div className="space-y-1.5">
                <h4 className="text-[10px] text-white/60 uppercase tracking-wider">Sound Effects</h4>
                <div className="grid grid-cols-6 gap-1.5">
                  {SOUND_EFFECTS.map((sound) => (
                    <button
                      key={sound.id}
                      onClick={() => playSound(sound)}
                      className="p-2.5 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-center active:scale-95"
                    >
                      <span className="text-lg">{sound.label}</span>
                    </button>
                  ))}
                </div>
              </div>

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

              {/* Music Section */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] text-white/60 uppercase tracking-wider">Background Music</h4>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPlaylistManager(true)}
                      className="h-6 text-xs"
                    >
                      <List className="h-3 w-3 mr-1" />
                      Playlists ({playlists.length})
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingMusic}
                      className="h-6 text-xs"
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      {isUploadingMusic ? '...' : 'Upload'}
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

                {/* Saved Playlists Quick Access */}
                {playlists.length > 0 && (
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {playlists.slice(0, 3).map(playlist => (
                      <button
                        key={playlist.id}
                        onClick={() => {
                          setSelectedPlaylistId(playlist.id);
                          setShowPlaylistManager(true);
                        }}
                        className="flex-shrink-0 px-2 py-1 bg-purple-500/10 rounded text-[10px] text-purple-400 hover:bg-purple-500/20"
                      >
                        {playlist.name} ({playlist.tracks.length})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Raised Hands */}
              {raisedHands.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] text-yellow-400 uppercase tracking-wider flex items-center gap-1">
                    <HandMetal className="h-3 w-3" /> Wants to Speak ({currentSpeakers}/{MAX_SPEAKERS} speakers)
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

        {/* Playlist Manager Modal */}
        {showPlaylistManager && (
          <div className="absolute inset-0 bg-black/95 flex flex-col rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-white/10">
              <h4 className="text-white font-medium text-sm flex items-center gap-2">
                <List className="h-4 w-4" />
                Your Playlists
              </h4>
              <Button variant="ghost" size="icon" onClick={() => setShowPlaylistManager(false)} className="h-6 w-6">
                <X className="h-3 w-3" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* Create New Playlist */}
              <div className="flex gap-2">
                <Input
                  placeholder="New playlist name..."
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  className="bg-white/5 border-white/10 text-white text-xs h-8"
                />
                <Button
                  size="sm"
                  onClick={async () => {
                    if (newPlaylistName.trim()) {
                      await createPlaylist(newPlaylistName.trim());
                      setNewPlaylistName('');
                    }
                  }}
                  className="h-8 px-3 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Create
                </Button>
              </div>

              {playlistsLoading ? (
                <p className="text-white/40 text-xs text-center py-4">Loading playlists...</p>
              ) : playlists.length === 0 ? (
                <p className="text-white/40 text-xs text-center py-4">No playlists yet. Create one above!</p>
              ) : (
                <div className="space-y-2">
                  {playlists.map(playlist => (
                    <div key={playlist.id} className="bg-white/5 rounded-lg p-2">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-white font-medium">{playlist.name}</p>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deletePlaylist(playlist.id)}
                            className="h-5 w-5 text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {playlist.tracks.length === 0 ? (
                        <p className="text-[10px] text-white/40">No tracks. Upload music and add to this playlist.</p>
                      ) : (
                        <div className="space-y-1">
                          {playlist.tracks.map(track => (
                            <div
                              key={track.id}
                              className="flex items-center gap-2 p-1.5 bg-white/5 rounded hover:bg-white/10 cursor-pointer"
                              onClick={() => {
                                playMusic({ id: track.id, title: track.title, artist: 'Playlist', url: track.audio_url });
                                setShowPlaylistManager(false);
                              }}
                            >
                              <Play className="h-3 w-3 text-purple-400" />
                              <span className="text-[10px] text-white truncate flex-1">{track.title}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeTrackFromPlaylist(playlist.id, track.id);
                                }}
                                className="h-4 w-4 text-white/40 hover:text-red-400"
                              >
                                <X className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Add uploaded music to this playlist */}
                      {uploadedMusic.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-white/10">
                          <p className="text-[10px] text-white/40 mb-1">Add uploaded track:</p>
                          <div className="flex flex-wrap gap-1">
                            {uploadedMusic.filter(m => !playlist.tracks.some(t => t.audio_url === m.url)).map(music => (
                              <button
                                key={music.id}
                                onClick={() => addTrackToPlaylist(playlist.id, { audio_url: music.url, title: music.title })}
                                className="text-[9px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30"
                              >
                                + {music.title}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default HostStudio;
