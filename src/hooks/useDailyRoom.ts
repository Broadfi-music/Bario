import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getFreshSession, isDemoSession } from '@/lib/authUtils';
import { toast } from 'sonner';

export interface DailyParticipant {
  id: string;
  identity: string;
  name: string;
  isMuted: boolean;
  isSpeaking: boolean;
  audioLevel: number;
  isLocal: boolean;
}

interface UseDailyRoomProps {
  sessionId: string;
  userId: string;
  userName: string;
  isHost: boolean;
  onParticipantJoined?: (participant: DailyParticipant) => void;
  onParticipantLeft?: (identity: string) => void;
}

export const useDailyRoom = ({
  sessionId,
  userId,
  userName,
  isHost,
  onParticipantJoined,
  onParticipantLeft,
}: UseDailyRoomProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [participants, setParticipants] = useState<DailyParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Daily.co refs
  const callFrameRef = useRef<any>(null);
  const callObjectRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('Daily cleanup called');
    
    if (callObjectRef.current) {
      try {
        callObjectRef.current.leave();
        callObjectRef.current.destroy();
      } catch (e) {
        console.warn('Error during Daily cleanup:', e);
      }
      callObjectRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setParticipants([]);
  }, []);

  // Get room credentials from edge function
  const getRoomCredentials = async () => {
    try {
      if (isDemoSession(sessionId)) {
        console.log('Demo session - using fallback');
        return null;
      }

      const session = await getFreshSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('daily-room', {
        body: { sessionId, userId, userName, isHost }
      });

      if (error) {
        console.error('Daily room error:', error);
        throw error;
      }

      return data;
    } catch (err) {
      console.error('Failed to get Daily room credentials:', err);
      return null;
    }
  };

  // Load Daily.co script dynamically
  const loadDailyScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if ((window as any).DailyIframe) {
        resolve();
        return;
      }

      const existingScript = document.querySelector('script[src*="daily-js"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', reject);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@daily-co/daily-js';
      script.async = true;
      script.onload = () => {
        console.log('Daily.co script loaded');
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load Daily.co'));
      document.head.appendChild(script);
    });
  };

  // Update participants from Daily event
  const updateParticipants = useCallback((dailyParticipants: Record<string, any>) => {
    const updated: DailyParticipant[] = Object.entries(dailyParticipants).map(([id, p]: [string, any]) => ({
      id,
      identity: p.user_id || id,
      name: p.user_name || 'Participant',
      isMuted: !p.audio,
      isSpeaking: p.audio && !p.local, // Will be updated by active speaker events
      audioLevel: 0,
      isLocal: p.local || false,
    }));

    setParticipants(updated);
    console.log('Participants updated:', updated.length);
  }, []);

  // Connect to Daily room
  const connect = useCallback(async () => {
    if (isConnected || isConnecting) {
      console.log('Already connected or connecting');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      console.log('Connecting to Daily room...');
      
      // Load Daily script
      await loadDailyScript();
      
      const Daily = (window as any).DailyIframe;
      if (!Daily) {
        throw new Error('Daily.co not available');
      }

      // Get room credentials
      const credentials = await getRoomCredentials();
      if (!credentials) {
        throw new Error('Failed to get room credentials');
      }

      console.log('Room credentials received:', { 
        roomUrl: credentials.roomUrl, 
        canPublish: credentials.canPublish 
      });

      // Create call object
      const callObject = Daily.createCallObject({
        audioSource: true,
        videoSource: false,
        subscribeToTracksAutomatically: true,
      });

      callObjectRef.current = callObject;

      // Set up event listeners
      callObject.on('joined-meeting', (event: any) => {
        console.log('Joined Daily meeting!', event);
        setIsConnected(true);
        setIsConnecting(false);
        
        // Update participants
        const dailyParticipants = callObject.participants();
        updateParticipants(dailyParticipants);
        
        // Start with mic muted for non-hosts
        if (!isHost) {
          callObject.setLocalAudio(false);
          setIsMuted(true);
        } else {
          // Host starts unmuted
          callObject.setLocalAudio(true);
          setIsMuted(false);
        }
        
        toast.success('Connected to audio room!');
      });

      callObject.on('participant-joined', (event: any) => {
        console.log('Participant joined:', event.participant);
        const dailyParticipants = callObject.participants();
        updateParticipants(dailyParticipants);
        
        const newParticipant: DailyParticipant = {
          id: event.participant.session_id,
          identity: event.participant.user_id || event.participant.session_id,
          name: event.participant.user_name || 'Participant',
          isMuted: !event.participant.audio,
          isSpeaking: false,
          audioLevel: 0,
          isLocal: false,
        };
        
        onParticipantJoined?.(newParticipant);
        toast(`${newParticipant.name} joined the room`);
      });

      callObject.on('participant-left', (event: any) => {
        console.log('Participant left:', event.participant);
        const dailyParticipants = callObject.participants();
        updateParticipants(dailyParticipants);
        
        onParticipantLeft?.(event.participant.user_id || event.participant.session_id);
      });

      callObject.on('participant-updated', (event: any) => {
        console.log('Participant updated:', event.participant);
        const dailyParticipants = callObject.participants();
        updateParticipants(dailyParticipants);
      });

      callObject.on('active-speaker-change', (event: any) => {
        console.log('Active speaker:', event.activeSpeaker);
        setParticipants(prev => prev.map(p => ({
          ...p,
          isSpeaking: p.id === event.activeSpeaker?.peerId,
        })));
      });

      callObject.on('track-started', (event: any) => {
        console.log('Track started:', event.track?.kind, 'from', event.participant?.user_name);
        
        // When we receive an audio track from someone else, make sure we can hear it
        if (event.track?.kind === 'audio' && !event.participant?.local) {
          console.log('Remote audio track started - should be audible');
        }
      });

      callObject.on('error', (event: any) => {
        console.error('Daily error:', event);
        setError(event.errorMsg || 'Connection error');
        toast.error('Audio connection error');
      });

      callObject.on('left-meeting', () => {
        console.log('Left Daily meeting');
        cleanup();
      });

      // Request microphone permission first for hosts
      if (isHost) {
        try {
          localStreamRef.current = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          });
          console.log('Microphone permission granted');
        } catch (micError) {
          console.error('Microphone permission denied:', micError);
          toast.error('Microphone access required for hosting');
        }
      }

      // Join the room
      console.log('Joining room:', credentials.roomUrl);
      await callObject.join({
        url: credentials.roomUrl,
        token: credentials.token,
        userName: userName,
      });

    } catch (err: any) {
      console.error('Daily connection error:', err);
      setError(err.message);
      setIsConnecting(false);
      toast.error('Failed to connect to audio room');
    }
  }, [sessionId, userId, userName, isHost, isConnected, isConnecting, updateParticipants, cleanup, onParticipantJoined, onParticipantLeft]);

  // Disconnect from room
  const disconnect = useCallback(async () => {
    console.log('Disconnecting from Daily room...');
    cleanup();
  }, [cleanup]);

  // Toggle mute
  const toggleMute = useCallback(async () => {
    if (!callObjectRef.current) {
      console.warn('No call object for toggle mute');
      return;
    }

    try {
      const newMuteState = !isMuted;
      callObjectRef.current.setLocalAudio(!newMuteState);
      setIsMuted(newMuteState);
      console.log('Mute toggled to:', newMuteState);
      toast(newMuteState ? 'Microphone muted' : 'Microphone unmuted');
    } catch (err) {
      console.error('Error toggling mute:', err);
      toast.error('Failed to toggle microphone');
    }
  }, [isMuted]);

  // Enable microphone
  const enableMicrophone = useCallback(async () => {
    if (!callObjectRef.current) return;
    
    try {
      callObjectRef.current.setLocalAudio(true);
      setIsMuted(false);
      console.log('Microphone enabled');
    } catch (err) {
      console.error('Error enabling microphone:', err);
    }
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!callObjectRef.current) return;
    
    try {
      await callObjectRef.current.startRecording();
      setIsRecording(true);
      toast.success('Recording started');
    } catch (err) {
      console.error('Error starting recording:', err);
      toast.error('Failed to start recording');
    }
  }, []);

  // Stop recording and save episode
  const saveEpisode = useCallback(async (title: string, description: string) => {
    if (!callObjectRef.current) return;
    
    try {
      await callObjectRef.current.stopRecording();
      setIsRecording(false);
      toast.success('Recording saved');
    } catch (err) {
      console.error('Error saving episode:', err);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isConnected,
    isConnecting,
    isMuted,
    isRecording,
    participants,
    error,
    provider: 'daily' as const,
    connect,
    disconnect,
    toggleMute,
    enableMicrophone,
    startRecording,
    saveEpisode,
  };
};
