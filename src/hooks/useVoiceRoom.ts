import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getFreshSession, isDemoSession } from '@/lib/authUtils';
import { toast } from 'sonner';

export interface VoiceRoomProvider {
  provider: 'livekit' | 'jitsi';
  url: string;
  roomName: string;
  token?: string;
  canPublish: boolean;
  config?: any;
}

export interface AudioParticipant {
  identity: string;
  name: string;
  isMuted: boolean;
  isSpeaking: boolean;
  audioLevel: number;
  handRaised?: boolean;
}

interface UseVoiceRoomProps {
  sessionId: string;
  userId: string;
  userName: string;
  isHost: boolean;
  onParticipantJoined?: (participant: AudioParticipant) => void;
  onParticipantLeft?: (identity: string) => void;
}

// Request microphone permission with error handling
const requestMicrophonePermission = async (): Promise<MediaStream | null> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      } 
    });
    console.log('Microphone permission granted');
    return stream;
  } catch (error: any) {
    console.error('Microphone permission error:', error);
    
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      toast.error('Microphone blocked – enable mic in browser settings', {
        duration: 5000,
        description: 'Click the lock icon in your address bar to allow microphone access'
      });
    } else if (error.name === 'NotFoundError') {
      toast.error('No microphone found', {
        description: 'Please connect a microphone and try again'
      });
    } else {
      toast.error('Failed to access microphone', {
        description: error.message
      });
    }
    return null;
  }
};

export const useVoiceRoom = ({
  sessionId,
  userId,
  userName,
  isHost,
  onParticipantJoined,
  onParticipantLeft,
}: UseVoiceRoomProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [participants, setParticipants] = useState<AudioParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<'livekit' | 'jitsi' | null>(null);
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);
  
  // LiveKit refs
  const roomRef = useRef<any>(null);
  const localTrackRef = useRef<any>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  
  // Jitsi refs
  const jitsiApiRef = useRef<any>(null);
  const jitsiContainerRef = useRef<HTMLDivElement | null>(null);
  const jitsiScriptLoaded = useRef(false);
  
  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  
  // Connection stability
  const connectionAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Cleanup audio elements
  const cleanupAudioElements = useCallback(() => {
    audioElementsRef.current.forEach((el, key) => {
      el.pause();
      el.srcObject = null;
      el.remove();
    });
    audioElementsRef.current.clear();
  }, []);

  const getVoiceRoomToken = async (): Promise<VoiceRoomProvider | null> => {
    try {
      // Handle demo sessions locally
      if (isDemoSession(sessionId)) {
        console.log('Demo session detected, using Jitsi');
        return {
          provider: 'jitsi',
          url: `https://meet.jit.si/bario-podcast-demo-${sessionId}`,
          roomName: `bario-podcast-demo-${sessionId}`,
          canPublish: isHost,
          config: {
            startWithAudioMuted: !isHost,
            startWithVideoMuted: true,
            disableVideo: true,
          }
        };
      }

      // Get fresh session for authenticated calls
      const session = await getFreshSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('join-voice-room', {
        body: { sessionId, userId, userName, isHost }
      });

      if (error) {
        console.error('Voice room token error:', error);
        throw error;
      }

      return data as VoiceRoomProvider;
    } catch (err) {
      console.error('Failed to get voice room token:', err);
      // Fallback to Jitsi on error
      return {
        provider: 'jitsi',
        url: `https://meet.jit.si/bario-podcast-${sessionId.replace(/-/g, '')}`,
        roomName: `bario-podcast-${sessionId.replace(/-/g, '')}`,
        canPublish: isHost,
        config: {
          startWithAudioMuted: !isHost,
          startWithVideoMuted: true,
          disableVideo: true,
        }
      };
    }
  };

  const connectLiveKit = async (config: VoiceRoomProvider) => {
    try {
      const { Room, RoomEvent, Track } = await import('livekit-client');
      
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Handle participant connection
      room.on(RoomEvent.ParticipantConnected, (participant: any) => {
        console.log('LiveKit: Participant connected:', participant.identity);
        const audioParticipant: AudioParticipant = {
          identity: participant.identity,
          name: participant.name || participant.identity,
          isMuted: true,
          isSpeaking: false,
          audioLevel: 0,
        };
        setParticipants(prev => {
          // Avoid duplicates
          if (prev.some(p => p.identity === participant.identity)) return prev;
          return [...prev, audioParticipant];
        });
        onParticipantJoined?.(audioParticipant);
      });

      room.on(RoomEvent.ParticipantDisconnected, (participant: any) => {
        console.log('LiveKit: Participant disconnected:', participant.identity);
        // Clean up audio element
        const audioEl = audioElementsRef.current.get(participant.identity);
        if (audioEl) {
          audioEl.pause();
          audioEl.srcObject = null;
          audioEl.remove();
          audioElementsRef.current.delete(participant.identity);
        }
        setParticipants(prev => prev.filter(p => p.identity !== participant.identity));
        onParticipantLeft?.(participant.identity);
      });

      // CRITICAL: Handle track subscriptions for audio playback
      room.on(RoomEvent.TrackSubscribed, (track: any, publication: any, participant: any) => {
        console.log('LiveKit: Track subscribed from', participant.identity, 'kind:', track.kind);
        
        if (track.kind === Track.Kind.Audio) {
          // Create audio element and attach track
          const audioElement = document.createElement('audio');
          audioElement.id = `audio-${participant.identity}`;
          audioElement.autoplay = true;
          audioElement.setAttribute('playsinline', 'true');
          audioElement.muted = false; // IMPORTANT: Not muted so we can hear
          
          // Attach the track to audio element
          track.attach(audioElement);
          
          // Add to DOM
          document.body.appendChild(audioElement);
          audioElementsRef.current.set(participant.identity, audioElement);
          
          // Force play
          audioElement.play().catch(err => {
            console.warn('Auto-play blocked, user interaction needed:', err);
          });
          
          console.log('LiveKit: Audio attached for', participant.identity);
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track: any, publication: any, participant: any) => {
        console.log('LiveKit: Track unsubscribed from', participant.identity);
        if (track.kind === Track.Kind.Audio) {
          // Detach and cleanup
          track.detach().forEach((el: HTMLElement) => el.remove());
          const audioEl = audioElementsRef.current.get(participant.identity);
          if (audioEl) {
            audioEl.remove();
            audioElementsRef.current.delete(participant.identity);
          }
        }
      });

      room.on(RoomEvent.TrackMuted, (publication: any, participant: any) => {
        if (publication.track?.kind === Track.Kind.Audio) {
          console.log('LiveKit: Track muted for', participant.identity);
          setParticipants(prev => prev.map(p => 
            p.identity === participant.identity ? { ...p, isMuted: true } : p
          ));
        }
      });

      room.on(RoomEvent.TrackUnmuted, (publication: any, participant: any) => {
        if (publication.track?.kind === Track.Kind.Audio) {
          console.log('LiveKit: Track unmuted for', participant.identity);
          setParticipants(prev => prev.map(p => 
            p.identity === participant.identity ? { ...p, isMuted: false } : p
          ));
        }
      });

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers: any[]) => {
        const speakerIds = new Set(speakers.map(s => s.identity));
        setParticipants(prev => prev.map(p => ({
          ...p,
          isSpeaking: speakerIds.has(p.identity),
        })));
      });

      room.on(RoomEvent.ConnectionStateChanged, (state: string) => {
        console.log('LiveKit: Connection state changed:', state);
      });

      // Connect to room
      console.log('LiveKit: Connecting to room...');
      await room.connect(config.url, config.token!);
      console.log('LiveKit: Connected successfully');
      
      roomRef.current = room;

      // If user can publish (host/speaker), enable microphone
      if (config.canPublish) {
        console.log('LiveKit: Enabling microphone for publisher...');
        try {
          await room.localParticipant.setMicrophoneEnabled(true);
          const micPub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
          if (micPub?.track) {
            localTrackRef.current = micPub.track;
            // Start muted
            await micPub.mute();
            setIsMuted(true);
          }
          console.log('LiveKit: Microphone enabled and muted');
        } catch (micError) {
          console.error('LiveKit: Failed to enable microphone:', micError);
          toast.error('Microphone blocked – enable mic in browser settings');
        }
      }

      // Add self to participants
      const selfParticipant: AudioParticipant = {
        identity: userId,
        name: userName,
        isMuted: true,
        isSpeaking: false,
        audioLevel: 0,
      };
      setParticipants([selfParticipant]);
      
      // Also add existing remote participants
      room.remoteParticipants.forEach((remoteParticipant: any) => {
        console.log('LiveKit: Adding existing participant:', remoteParticipant.identity);
        const audioParticipant: AudioParticipant = {
          identity: remoteParticipant.identity,
          name: remoteParticipant.name || remoteParticipant.identity,
          isMuted: true,
          isSpeaking: false,
          audioLevel: 0,
        };
        setParticipants(prev => [...prev, audioParticipant]);
        
        // Subscribe to existing audio tracks
        remoteParticipant.audioTrackPublications.forEach((publication: any) => {
          if (publication.track) {
          const audioElement = document.createElement('audio');
            audioElement.autoplay = true;
            audioElement.setAttribute('playsinline', 'true');
            audioElement.muted = false;
            publication.track.attach(audioElement);
            document.body.appendChild(audioElement);
            audioElementsRef.current.set(remoteParticipant.identity, audioElement);
            audioElement.play().catch(console.warn);
          }
        });
      });
      
      return true;
    } catch (err) {
      console.error('LiveKit connection error:', err);
      throw err;
    }
  };

  const loadJitsiScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (jitsiScriptLoaded.current || (window as any).JitsiMeetExternalAPI) {
        jitsiScriptLoaded.current = true;
        resolve();
        return;
      }

      const existingScript = document.querySelector('script[src="https://meet.jit.si/external_api.js"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => {
          jitsiScriptLoaded.current = true;
          resolve();
        });
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Jitsi API')));
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      
      script.onload = () => {
        jitsiScriptLoaded.current = true;
        resolve();
      };
      
      script.onerror = () => reject(new Error('Failed to load Jitsi API'));
      
      document.head.appendChild(script);
    });
  };

  const connectJitsi = async (config: VoiceRoomProvider) => {
    await loadJitsiScript();

    return new Promise<boolean>((resolve, reject) => {
      try {
        // Create a hidden container for Jitsi
        let container = document.getElementById('jitsi-container') as HTMLDivElement | null;
        if (!container) {
          container = document.createElement('div');
          container.id = 'jitsi-container';
          container.style.cssText = 'position:fixed;bottom:0;right:0;width:1px;height:1px;overflow:hidden;z-index:-1;';
          document.body.appendChild(container);
        }
        jitsiContainerRef.current = container;

        const domain = 'meet.jit.si';
        const options = {
          roomName: config.roomName,
          parentNode: container,
          width: 1,
          height: 1,
          configOverwrite: {
            startWithAudioMuted: !config.canPublish,
            startWithVideoMuted: true,
            disableDeepLinking: true,
            startAudioOnly: true,
            prejoinPageEnabled: false,
            enableClosePage: false,
            disableVideo: true,
            disableThirdPartyRequests: true,
            enableWelcomePage: false,
            ...config.config?.configOverwrite,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            TOOLBAR_BUTTONS: [],
            filmStripOnly: false,
            DISABLE_VIDEO_BACKGROUND: true,
            MOBILE_APP_PROMO: false,
            ...config.config?.interfaceConfigOverwrite,
          },
          userInfo: {
            displayName: userName,
          },
        };

        const api = new (window as any).JitsiMeetExternalAPI(domain, options);
        jitsiApiRef.current = api;

        let joined = false;

        api.addEventListener('videoConferenceJoined', () => {
          console.log('Jitsi conference joined successfully');
          joined = true;
          
          // Disable video immediately
          api.executeCommand('toggleVideo');
          
          // Set initial audio state based on canPublish
          if (!config.canPublish) {
            api.executeCommand('toggleAudio'); // Mute if can't publish
          }
          
          // Add self to participants
          const selfParticipant: AudioParticipant = {
            identity: userId,
            name: userName,
            isMuted: !config.canPublish,
            isSpeaking: false,
            audioLevel: 0,
          };
          setParticipants([selfParticipant]);
          setIsMuted(!config.canPublish);
          resolve(true);
        });

        api.addEventListener('participantJoined', (data: any) => {
          console.log('Jitsi participant joined:', data);
          const audioParticipant: AudioParticipant = {
            identity: data.id,
            name: data.displayName || 'Participant',
            isMuted: true,
            isSpeaking: false,
            audioLevel: 0,
          };
          setParticipants(prev => [...prev, audioParticipant]);
          onParticipantJoined?.(audioParticipant);
        });

        api.addEventListener('participantLeft', (data: any) => {
          console.log('Jitsi participant left:', data);
          setParticipants(prev => prev.filter(p => p.identity !== data.id));
          onParticipantLeft?.(data.id);
        });

        api.addEventListener('audioMuteStatusChanged', (data: any) => {
          console.log('Audio mute status changed:', data);
          if (data.id === 'local') {
            setIsMuted(data.muted);
          } else {
            setParticipants(prev => prev.map(p => 
              p.identity === data.id ? { ...p, isMuted: data.muted } : p
            ));
          }
        });

        api.addEventListener('dominantSpeakerChanged', (data: any) => {
          setParticipants(prev => prev.map(p => ({
            ...p,
            isSpeaking: p.identity === data.id,
          })));
        });

        api.addEventListener('videoConferenceLeft', () => {
          console.log('Left Jitsi conference');
        });

        // Timeout for join
        setTimeout(() => {
          if (!joined) {
            reject(new Error('Jitsi join timeout'));
          }
        }, 15000);

      } catch (err) {
        console.error('Jitsi init error:', err);
        reject(err);
      }
    });
  };

  const connect = useCallback(async () => {
    if (isConnected || isConnecting || !sessionId || !userId) return;

    setIsConnecting(true);
    setError(null);
    connectionAttemptRef.current++;
    const currentAttempt = connectionAttemptRef.current;

    try {
      // Request mic permission upfront for hosts/speakers
      if (isHost) {
        console.log('Requesting microphone permission...');
        const stream = await requestMicrophonePermission();
        if (stream) {
          localStreamRef.current = stream;
          setMicPermissionGranted(true);
          // Stop the test stream - LiveKit will create its own
          stream.getTracks().forEach(track => track.stop());
        } else {
          // Even if mic is blocked, listeners can still hear
          console.log('Mic permission not granted, continuing as listener...');
        }
      }

      const config = await getVoiceRoomToken();
      if (!config) {
        throw new Error('Failed to get voice room configuration');
      }

      // Check if this attempt is still valid
      if (currentAttempt !== connectionAttemptRef.current) {
        console.log('Connection attempt superseded');
        return;
      }

      console.log('Voice room config:', config.provider, 'canPublish:', config.canPublish);
      setProvider(config.provider);

      if (config.provider === 'livekit' && config.token) {
        await connectLiveKit(config);
      } else {
        await connectJitsi(config);
      }

      setIsConnected(true);
      setIsMuted(true); // Always start muted
      toast.success('Connected to audio room');
    } catch (err) {
      console.error('Connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect');
      toast.error('Failed to connect to audio');
      
      // Retry connection after delay
      if (currentAttempt === connectionAttemptRef.current && connectionAttemptRef.current < 3) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Retrying connection...');
          setIsConnecting(false);
          connect();
        }, 2000);
      }
    } finally {
      if (currentAttempt === connectionAttemptRef.current) {
        setIsConnecting(false);
      }
    }
  }, [sessionId, userId, userName, isHost, isConnected, isConnecting]);

  const disconnect = useCallback(async () => {
    try {
      // Clear any pending reconnect
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Clean up audio elements
      cleanupAudioElements();

      if (roomRef.current) {
        await roomRef.current.disconnect();
        roomRef.current = null;
      }
      
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }

      if (jitsiContainerRef.current) {
        jitsiContainerRef.current.remove();
        jitsiContainerRef.current = null;
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }

      localTrackRef.current = null;
      setIsConnected(false);
      setParticipants([]);
      setProvider(null);
      setMicPermissionGranted(false);
      connectionAttemptRef.current = 0;
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  }, [cleanupAudioElements]);

  const toggleMute = useCallback(async () => {
    try {
      if (provider === 'livekit' && roomRef.current) {
        const room = roomRef.current;
        const { Track } = await import('livekit-client');
        
        if (isMuted) {
          // Unmute - ensure mic is enabled first
          await room.localParticipant.setMicrophoneEnabled(true);
          const micPub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
          if (micPub) {
            await micPub.unmute();
            localTrackRef.current = micPub.track;
          }
          setIsMuted(false);
          toast.success('Microphone ON');
        } else {
          // Mute
          const micPub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
          if (micPub) {
            await micPub.mute();
          }
          setIsMuted(true);
          toast('Microphone OFF');
        }
      } else if (provider === 'jitsi' && jitsiApiRef.current) {
        jitsiApiRef.current.executeCommand('toggleAudio');
        // State will be updated via event listener
      }
    } catch (err) {
      console.error('Toggle mute error:', err);
      toast.error('Failed to toggle microphone');
    }
  }, [isMuted, provider]);

  const enableMicrophone = useCallback(async () => {
    try {
      // First request permission if not granted
      if (!micPermissionGranted) {
        const stream = await requestMicrophonePermission();
        if (!stream) {
          return; // Permission denied, error already shown
        }
        stream.getTracks().forEach(track => track.stop());
        setMicPermissionGranted(true);
      }

      if (provider === 'livekit' && roomRef.current) {
        const { Track } = await import('livekit-client');
        await roomRef.current.localParticipant.setMicrophoneEnabled(true);
        const micPub = roomRef.current.localParticipant.getTrackPublication(Track.Source.Microphone);
        if (micPub?.track) {
          localTrackRef.current = micPub.track;
          await micPub.unmute();
        }
        setIsMuted(false);
        toast.success('Microphone enabled');
      } else if (provider === 'jitsi' && jitsiApiRef.current) {
        if (isMuted) {
          jitsiApiRef.current.executeCommand('toggleAudio');
        }
      }
    } catch (err) {
      console.error('Enable mic error:', err);
      toast.error('Microphone blocked – enable mic in browser settings');
    }
  }, [provider, isMuted, micPermissionGranted]);

  // Host can mute a specific participant
  const muteParticipant = useCallback(async (participantId: string) => {
    if (!isHost) return;
    
    try {
      if (provider === 'jitsi' && jitsiApiRef.current) {
        jitsiApiRef.current.executeCommand('muteParticipant', participantId);
      }
      // Update local state
      setParticipants(prev => prev.map(p => 
        p.identity === participantId ? { ...p, isMuted: true } : p
      ));
    } catch (err) {
      console.error('Mute participant error:', err);
    }
  }, [isHost, provider]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      toast.success('Recording started');
    } catch (err) {
      console.error('Recording error:', err);
      toast.error('Failed to start recording');
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!mediaRecorderRef.current || !isRecording) return null;

    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!;

      mediaRecorder.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(blob);

        recordedChunksRef.current = [];
        mediaRecorderRef.current = null;
        setIsRecording(false);
        toast.success('Recording stopped');
      };

      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    });
  }, [isRecording]);

  const saveEpisode = useCallback(async (title: string, description?: string) => {
    const session = await getFreshSession();
    if (!session) {
      toast.error('Please sign in to save episode');
      return null;
    }

    const audioData = await stopRecording();
    
    if (!isDemoSession(sessionId)) {
      const { data, error } = await supabase.functions.invoke('podcast-recording', {
        body: {
          action: 'save-episode',
          sessionId,
          userId,
          title,
          description,
          audioData
        }
      });

      if (error) {
        toast.error('Failed to save episode');
        return null;
      }

      toast.success('Episode saved!');
      return data?.episode;
    }

    toast.success('Demo episode saved!');
    return { id: 'demo-episode' };
  }, [sessionId, userId, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isConnecting,
    isMuted,
    isRecording,
    participants,
    error,
    provider,
    micPermissionGranted,
    connect,
    disconnect,
    toggleMute,
    enableMicrophone,
    muteParticipant,
    startRecording,
    stopRecording,
    saveEpisode,
  };
};
