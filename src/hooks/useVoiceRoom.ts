import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getFreshSession, isDemoSession } from '@/lib/authUtils';

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
}

interface UseVoiceRoomProps {
  sessionId: string;
  userId: string;
  userName: string;
  isHost: boolean;
  onParticipantJoined?: (participant: AudioParticipant) => void;
  onParticipantLeft?: (identity: string) => void;
}

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
  const [isMuted, setIsMuted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [participants, setParticipants] = useState<AudioParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<'livekit' | 'jitsi' | null>(null);
  
  // LiveKit refs
  const roomRef = useRef<any>(null);
  const localTrackRef = useRef<any>(null);
  
  // Jitsi refs
  const jitsiApiRef = useRef<any>(null);
  const jitsiContainerRef = useRef<HTMLDivElement | null>(null);
  
  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

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
      });

      room.on(RoomEvent.ParticipantConnected, (participant: any) => {
        const audioParticipant: AudioParticipant = {
          identity: participant.identity,
          name: participant.name || participant.identity,
          isMuted: true,
          isSpeaking: false,
          audioLevel: 0,
        };
        setParticipants(prev => [...prev, audioParticipant]);
        onParticipantJoined?.(audioParticipant);
      });

      room.on(RoomEvent.ParticipantDisconnected, (participant: any) => {
        setParticipants(prev => prev.filter(p => p.identity !== participant.identity));
        onParticipantLeft?.(participant.identity);
      });

      room.on(RoomEvent.TrackMuted, (publication: any, participant: any) => {
        if (publication.track?.kind === Track.Kind.Audio) {
          setParticipants(prev => prev.map(p => 
            p.identity === participant.identity ? { ...p, isMuted: true } : p
          ));
        }
      });

      room.on(RoomEvent.TrackUnmuted, (publication: any, participant: any) => {
        if (publication.track?.kind === Track.Kind.Audio) {
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

      await room.connect(config.url, config.token!);
      
      if (config.canPublish) {
        await room.localParticipant.enableCameraAndMicrophone();
        await room.localParticipant.setCameraEnabled(false);
        localTrackRef.current = room.localParticipant.audioTrackPublications.values().next().value?.track;
      }

      roomRef.current = room;
      
      // Add self to participants
      const selfParticipant: AudioParticipant = {
        identity: userId,
        name: userName,
        isMuted: !config.canPublish,
        isSpeaking: false,
        audioLevel: 0,
      };
      setParticipants([selfParticipant]);
      
      return true;
    } catch (err) {
      console.error('LiveKit connection error:', err);
      throw err;
    }
  };

  const connectJitsi = async (config: VoiceRoomProvider) => {
    return new Promise<boolean>((resolve, reject) => {
      // Load Jitsi external API
      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      
      script.onload = () => {
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
              ...config.config?.configOverwrite,
            },
            interfaceConfigOverwrite: {
              SHOW_JITSI_WATERMARK: false,
              SHOW_WATERMARK_FOR_GUESTS: false,
              TOOLBAR_BUTTONS: [],
              filmStripOnly: false,
              DISABLE_VIDEO_BACKGROUND: true,
              ...config.config?.interfaceConfigOverwrite,
            },
            userInfo: {
              displayName: userName,
            },
          };

          const api = new (window as any).JitsiMeetExternalAPI(domain, options);
          jitsiApiRef.current = api;

          api.addEventListener('videoConferenceJoined', () => {
            console.log('Jitsi conference joined');
            // Disable video immediately
            api.executeCommand('toggleVideo');
            
            // Add self to participants
            const selfParticipant: AudioParticipant = {
              identity: userId,
              name: userName,
              isMuted: !config.canPublish,
              isSpeaking: false,
              audioLevel: 0,
            };
            setParticipants([selfParticipant]);
            resolve(true);
          });

          api.addEventListener('participantJoined', (data: any) => {
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
            setParticipants(prev => prev.filter(p => p.identity !== data.id));
            onParticipantLeft?.(data.id);
          });

          api.addEventListener('audioMuteStatusChanged', (data: any) => {
            if (data.id === 'local') {
              setIsMuted(data.muted);
            }
          });

          api.addEventListener('videoConferenceLeft', () => {
            console.log('Left Jitsi conference');
          });

        } catch (err) {
          console.error('Jitsi init error:', err);
          reject(err);
        }
      };

      script.onerror = () => {
        reject(new Error('Failed to load Jitsi API'));
      };

      document.head.appendChild(script);
    });
  };

  const connect = useCallback(async () => {
    if (isConnected || isConnecting || !sessionId || !userId) return;

    setIsConnecting(true);
    setError(null);

    try {
      const config = await getVoiceRoomToken();
      if (!config) {
        throw new Error('Failed to get voice room configuration');
      }

      console.log('Voice room config:', config.provider);
      setProvider(config.provider);

      if (config.provider === 'livekit' && config.token) {
        await connectLiveKit(config);
      } else {
        await connectJitsi(config);
      }

      setIsConnected(true);
      setIsMuted(!config.canPublish);
    } catch (err) {
      console.error('Connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setIsConnecting(false);
    }
  }, [sessionId, userId, userName, isHost, isConnected, isConnecting]);

  const disconnect = useCallback(async () => {
    try {
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

      localTrackRef.current = null;
      setIsConnected(false);
      setParticipants([]);
      setProvider(null);
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  }, []);

  const toggleMute = useCallback(async () => {
    try {
      if (provider === 'livekit' && localTrackRef.current) {
        if (isMuted) {
          await localTrackRef.current.unmute();
        } else {
          await localTrackRef.current.mute();
        }
        setIsMuted(!isMuted);
      } else if (provider === 'jitsi' && jitsiApiRef.current) {
        jitsiApiRef.current.executeCommand('toggleAudio');
        // State will be updated via event listener
      }
    } catch (err) {
      console.error('Toggle mute error:', err);
    }
  }, [isMuted, provider]);

  const enableMicrophone = useCallback(async () => {
    try {
      if (provider === 'livekit' && roomRef.current) {
        await roomRef.current.localParticipant.setMicrophoneEnabled(true);
        localTrackRef.current = roomRef.current.localParticipant.audioTrackPublications.values().next().value?.track;
        setIsMuted(false);
      } else if (provider === 'jitsi' && jitsiApiRef.current) {
        jitsiApiRef.current.executeCommand('toggleAudio');
      }
    } catch (err) {
      console.error('Enable mic error:', err);
    }
  }, [provider]);

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

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setIsRecording(true);
    } catch (err) {
      console.error('Start recording error:', err);
      throw err;
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          setIsRecording(false);
          resolve(base64);
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current.stop();
    });
  }, []);

  const saveEpisode = useCallback(async (title: string, description: string) => {
    const audioData = await stopRecording();
    if (!audioData) return;

    try {
      const session = await getFreshSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('podcast-recording', {
        body: { sessionId, title, description, audioData }
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Save episode error:', err);
      throw err;
    }
  }, [sessionId]);

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
    connect,
    disconnect,
    toggleMute,
    enableMicrophone,
    startRecording,
    stopRecording,
    saveEpisode,
  };
};
