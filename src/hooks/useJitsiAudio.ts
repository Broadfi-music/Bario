import { useState, useCallback, useRef, useEffect } from 'react';

export interface AudioParticipant {
  id: string;
  name: string;
  isMuted: boolean;
  isSpeaking: boolean;
  audioLevel: number;
  isLocal: boolean;
}

interface UseJitsiAudioProps {
  sessionId: string;
  userId: string;
  userName: string;
  isHost: boolean;
  onParticipantJoin?: (participant: AudioParticipant) => void;
  onParticipantLeave?: (participantId: string) => void;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export const useJitsiAudio = ({
  sessionId,
  userId,
  userName,
  isHost,
  onParticipantJoin,
  onParticipantLeave,
}: UseJitsiAudioProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [participants, setParticipants] = useState<AudioParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const jitsiApiRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const loadJitsiScript = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.JitsiMeetExternalAPI) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Jitsi script'));
      document.head.appendChild(script);
    });
  }, []);

  const updateParticipants = useCallback(() => {
    if (!jitsiApiRef.current) return;

    try {
      const participantInfo = jitsiApiRef.current.getParticipantsInfo();
      console.log('[Jitsi] Participants info:', participantInfo);

      const newParticipants: AudioParticipant[] = participantInfo.map((p: any) => ({
        id: p.participantId || `jitsi-${Math.random().toString(36).substr(2, 9)}`,
        name: p.displayName || 'Unknown',
        isMuted: p.muted || false,
        isSpeaking: false,
        audioLevel: 0,
        isLocal: p.local || false,
      }));

      setParticipants(newParticipants);
    } catch (err) {
      console.error('[Jitsi] Error updating participants:', err);
    }
  }, []);

  const connect = useCallback(async () => {
    if (isConnecting || isConnected) return;

    setIsConnecting(true);
    setError(null);

    try {
      console.log('[Jitsi] Loading Jitsi script...');
      await loadJitsiScript();
      console.log('[Jitsi] Jitsi script loaded');

      // Create a hidden container for Jitsi
      if (!containerRef.current) {
        containerRef.current = document.createElement('div');
        containerRef.current.id = 'jitsi-container';
        containerRef.current.style.width = '1px';
        containerRef.current.style.height = '1px';
        containerRef.current.style.position = 'absolute';
        containerRef.current.style.left = '-9999px';
        document.body.appendChild(containerRef.current);
      }

      const roomName = `bario-podcast-${sessionId.replace(/-/g, '').substring(0, 20)}`;
      console.log('[Jitsi] Joining room:', roomName);

      // Initialize Jitsi Meet API with audio-only config
      const api = new window.JitsiMeetExternalAPI('meet.jit.si', {
        roomName,
        parentNode: containerRef.current,
        userInfo: {
          displayName: userName || 'Participant',
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: true,
          disableVideo: true,
          enableClosePage: false,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          enableNoisyMicDetection: false,
          enableNoAudioDetection: false,
          p2p: {
            enabled: true,
          },
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          TOOLBAR_BUTTONS: [],
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          filmStripOnly: false,
          DISABLE_VIDEO_BACKGROUND: true,
        },
      });

      jitsiApiRef.current = api;

      // Set up event listeners
      api.addListener('videoConferenceJoined', () => {
        console.log('[Jitsi] Conference joined successfully');
        setIsConnected(true);
        setIsConnecting(false);
        updateParticipants();
      });

      api.addListener('participantJoined', (participant: any) => {
        console.log('[Jitsi] Participant joined:', participant);
        updateParticipants();
        if (onParticipantJoin) {
          onParticipantJoin({
            id: participant.id,
            name: participant.displayName || 'Unknown',
            isMuted: false,
            isSpeaking: false,
            audioLevel: 0,
            isLocal: false,
          });
        }
      });

      api.addListener('participantLeft', (participant: any) => {
        console.log('[Jitsi] Participant left:', participant);
        updateParticipants();
        if (onParticipantLeave) {
          onParticipantLeave(participant.id);
        }
      });

      api.addListener('audioMuteStatusChanged', (status: any) => {
        console.log('[Jitsi] Audio mute status changed:', status);
        setIsMuted(status.muted);
      });

      api.addListener('dominantSpeakerChanged', (data: any) => {
        console.log('[Jitsi] Dominant speaker changed:', data);
        setParticipants(prev => prev.map(p => ({
          ...p,
          isSpeaking: p.id === data.id,
        })));
      });

      api.addListener('videoConferenceLeft', () => {
        console.log('[Jitsi] Conference left');
        setIsConnected(false);
      });

      api.addListener('errorOccurred', (error: any) => {
        console.error('[Jitsi] Error occurred:', error);
        setError(error.message || 'Jitsi error occurred');
      });

    } catch (err) {
      console.error('[Jitsi] Connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to audio room');
      setIsConnecting(false);
    }
  }, [sessionId, userName, isConnecting, isConnected, loadJitsiScript, updateParticipants, onParticipantJoin, onParticipantLeave]);

  const disconnect = useCallback(() => {
    console.log('[Jitsi] Disconnecting...');
    
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
      jitsiApiRef.current = null;
    }

    if (containerRef.current && containerRef.current.parentNode) {
      containerRef.current.parentNode.removeChild(containerRef.current);
      containerRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setParticipants([]);
    setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleAudio');
    }
  }, []);

  const enableMicrophone = useCallback(() => {
    if (jitsiApiRef.current && isMuted) {
      jitsiApiRef.current.executeCommand('toggleAudio');
    }
  }, [isMuted]);

  const startRecording = useCallback(() => {
    console.log('[Jitsi] Recording started (local only)');
    setIsRecording(true);
  }, []);

  const saveEpisode = useCallback(async (title: string, description: string) => {
    console.log('[Jitsi] Saving episode:', title);
    setIsRecording(false);
    return null;
  }, []);

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
    connect,
    disconnect,
    toggleMute,
    enableMicrophone,
    startRecording,
    saveEpisode,
  };
};
