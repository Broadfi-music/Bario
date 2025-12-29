import { useState, useRef, useCallback, useEffect } from 'react';
import DailyIframe, { DailyCall, DailyParticipant as DailySDKParticipant } from '@daily-co/daily-js';
import { supabase } from '@/integrations/supabase/client';
import { getFreshSession, isDemoSession } from '@/lib/authUtils';
import { toast } from 'sonner';

export interface AudioParticipant {
  id: string;
  identity: string;
  name: string;
  isMuted: boolean;
  isSpeaking: boolean;
  audioLevel: number;
  isLocal: boolean;
}

interface UseDailyAudioProps {
  sessionId: string;
  userId: string;
  userName: string;
  isHost: boolean;
  onParticipantJoined?: (participant: AudioParticipant) => void;
  onParticipantLeft?: (identity: string) => void;
}

export const useDailyAudio = ({
  sessionId,
  userId,
  userName,
  isHost,
  onParticipantJoined,
  onParticipantLeft,
}: UseDailyAudioProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(!isHost);
  const [isRecording, setIsRecording] = useState(false);
  const [participants, setParticipants] = useState<AudioParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);

  const callRef = useRef<DailyCall | null>(null);

  // Convert Daily participant to our format
  const convertParticipant = useCallback((p: DailySDKParticipant): AudioParticipant => ({
    id: p.session_id,
    identity: p.user_id || p.session_id,
    name: p.user_name || 'Participant',
    isMuted: !p.audio,
    isSpeaking: false,
    audioLevel: 0,
    isLocal: p.local,
  }), []);

  // Update participants from call object
  const updateParticipants = useCallback(() => {
    if (!callRef.current) return;
    
    const daily = callRef.current;
    const allParticipants = daily.participants();
    
    const mapped = Object.values(allParticipants).map(convertParticipant);
    setParticipants(mapped);
    console.log('Daily participants updated:', mapped.length);
  }, [convertParticipant]);

  // Cleanup
  const cleanup = useCallback(async () => {
    console.log('Daily audio cleanup');
    
    if (callRef.current) {
      try {
        await callRef.current.leave();
        await callRef.current.destroy();
      } catch (e) {
        console.warn('Cleanup error:', e);
      }
      callRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    setParticipants([]);
  }, []);

  // Get Daily room credentials from edge function
  const getRoomCredentials = async () => {
    try {
      if (isDemoSession(sessionId)) {
        console.log('Demo session - skipping audio');
        return null;
      }

      const session = await getFreshSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      console.log('Requesting Daily room credentials...');
      const { data, error } = await supabase.functions.invoke('daily-room', {
        body: { sessionId, userId, userName, isHost }
      });

      if (error) {
        console.error('Daily room error:', error);
        throw error;
      }

      console.log('Daily room credentials received:', data);
      return data;
    } catch (err) {
      console.error('Failed to get Daily room credentials:', err);
      throw err;
    }
  };

  // Connect to Daily.co room - accepts optional overrideSessionId for immediate connection
  const connect = useCallback(async (overrideSessionId?: string) => {
    const targetSessionId = overrideSessionId || sessionId;
    
    if (!targetSessionId) {
      console.error('No session ID provided for audio connection');
      toast.error('No session to connect to');
      return;
    }

    if (isConnected || isConnecting) {
      console.log('Already connected or connecting');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      console.log('🎙️ Connecting to Daily.co audio room for session:', targetSessionId);
      
      // Get room credentials using the target session ID
      if (isDemoSession(targetSessionId)) {
        console.log('Demo session - skipping audio');
        setIsConnecting(false);
        return;
      }

      const session = await getFreshSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      console.log('Requesting Daily room credentials...');
      const { data: credentials, error: credError } = await supabase.functions.invoke('daily-room', {
        body: { sessionId: targetSessionId, userId, userName, isHost }
      });

      if (credError) {
        console.error('Daily room error:', credError);
        throw credError;
      }

      if (!credentials || !credentials.roomUrl) {
        throw new Error('Invalid room credentials received');
      }

      console.log('✅ Room credentials received:', { 
        url: credentials.roomUrl,
        canPublish: credentials.canPublish 
      });

      // Create Daily call object
      const daily = DailyIframe.createCallObject({
        audioSource: true,
        videoSource: false, // Audio only
      });

      callRef.current = daily;

      // Set up event listeners
      daily.on('joined-meeting', () => {
        console.log('✅ Joined Daily.co meeting!');
        setIsConnected(true);
        setIsConnecting(false);
        updateParticipants();
        toast.success('Connected to audio room!');
      });

      daily.on('left-meeting', () => {
        console.log('Left Daily.co meeting');
        cleanup();
      });

      daily.on('participant-joined', (event) => {
        if (!event?.participant) return;
        console.log('Participant joined:', event.participant.user_name);
        updateParticipants();
        
        const participant = convertParticipant(event.participant);
        onParticipantJoined?.(participant);
        
        if (!event.participant.local) {
          toast(`${event.participant.user_name || 'Someone'} joined`);
        }
      });

      daily.on('participant-left', (event) => {
        if (!event?.participant) return;
        console.log('Participant left:', event.participant.user_name);
        updateParticipants();
        onParticipantLeft?.(event.participant.user_id || event.participant.session_id);
      });

      daily.on('participant-updated', () => {
        updateParticipants();
      });

      daily.on('active-speaker-change', (event) => {
        if (!event) return;
        const speakerId = event.activeSpeaker?.peerId;
        
        setParticipants(prev => prev.map(p => ({
          ...p,
          isSpeaking: p.id === speakerId,
        })));
      });

      daily.on('track-started', (event) => {
        if (!event) return;
        console.log('Track started:', event.track?.kind, 'from', event.participant?.user_name);
        updateParticipants();
      });

      daily.on('error', (event) => {
        console.error('Daily error:', event);
        toast.error('Audio connection error');
        setError(event?.errorMsg || 'Unknown error');
      });

      // Join the room
      console.log('🔗 Joining room:', credentials.roomUrl);
      await daily.join({
        url: credentials.roomUrl,
        token: credentials.token,
        userName: userName || 'Participant',
        startVideoOff: true, // Audio only
        startAudioOff: !credentials.canPublish, // Muted if listener
      });

      // Set initial mute state based on permissions
      const shouldBeMuted = !credentials.canPublish;
      setIsMuted(shouldBeMuted);
      
      // If host or has publish permissions, enable audio
      if (credentials.canPublish) {
        await daily.setLocalAudio(true);
        setIsMuted(false);
        console.log('🎤 Audio enabled for publishing');
      }

      console.log('✅ Daily.co connection complete!');

    } catch (err: any) {
      console.error('❌ Daily connection error:', err);
      setError(err.message);
      setIsConnecting(false);
      toast.error('Failed to connect: ' + err.message);
    }
  }, [sessionId, userId, userName, isHost, isConnected, isConnecting, updateParticipants, cleanup, convertParticipant, onParticipantJoined, onParticipantLeft]);

  // Disconnect
  const disconnect = useCallback(async () => {
    console.log('Disconnecting from Daily...');
    await cleanup();
  }, [cleanup]);

  // Toggle mute
  const toggleMute = useCallback(async () => {
    if (!callRef.current) {
      console.warn('No call for toggle mute');
      return;
    }

    try {
      const newMuteState = !isMuted;
      await callRef.current.setLocalAudio(!newMuteState);
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
    if (!callRef.current) return;
    
    try {
      await callRef.current.setLocalAudio(true);
      setIsMuted(false);
      console.log('Microphone enabled');
    } catch (err) {
      console.error('Error enabling microphone:', err);
    }
  }, []);

  // Start recording (local)
  const startRecording = useCallback(async () => {
    toast.info('Recording feature coming soon');
    setIsRecording(true);
  }, []);

  // Save episode
  const saveEpisode = useCallback(async (title: string, description: string) => {
    setIsRecording(false);
    toast.success('Episode saved');
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
