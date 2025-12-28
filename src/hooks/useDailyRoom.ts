import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getFreshSession, isDemoSession } from '@/lib/authUtils';
import { toast } from 'sonner';
import { Room, RoomEvent, RemoteParticipant, Track, LocalParticipant } from 'livekit-client';

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

  // LiveKit refs
  const roomRef = useRef<Room | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Cleanup function
  const cleanup = useCallback(async () => {
    console.log('Audio room cleanup called');
    
    if (roomRef.current) {
      try {
        await roomRef.current.disconnect();
      } catch (e) {
        console.warn('Error during room cleanup:', e);
      }
      roomRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
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

      // Use the working join-voice-room function that has LiveKit configured
      const { data, error } = await supabase.functions.invoke('join-voice-room', {
        body: { sessionId, userId, userName, isHost }
      });

      if (error) {
        console.error('Voice room error:', error);
        throw error;
      }

      console.log('Voice room credentials:', data);
      return data;
    } catch (err) {
      console.error('Failed to get voice room credentials:', err);
      return null;
    }
  };

  // Update participants from LiveKit room
  const updateParticipants = useCallback((room: Room) => {
    const allParticipants: DailyParticipant[] = [];
    
    // Add local participant
    if (room.localParticipant) {
      const local = room.localParticipant;
      allParticipants.push({
        id: local.sid || local.identity,
        identity: local.identity,
        name: local.name || local.identity,
        isMuted: !local.isMicrophoneEnabled,
        isSpeaking: local.isSpeaking,
        audioLevel: 0,
        isLocal: true,
      });
    }

    // Add remote participants
    room.remoteParticipants.forEach((participant: RemoteParticipant) => {
      allParticipants.push({
        id: participant.sid || participant.identity,
        identity: participant.identity,
        name: participant.name || participant.identity,
        isMuted: !participant.isMicrophoneEnabled,
        isSpeaking: participant.isSpeaking,
        audioLevel: 0,
        isLocal: false,
      });
    });

    setParticipants(allParticipants);
    console.log('Participants updated:', allParticipants.length);
  }, []);

  // Connect to voice room using LiveKit
  const connect = useCallback(async () => {
    if (isConnected || isConnecting) {
      console.log('Already connected or connecting');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      console.log('Connecting to voice room...');
      
      // Get room credentials
      const credentials = await getRoomCredentials();
      if (!credentials) {
        throw new Error('Failed to get room credentials');
      }

      console.log('Room credentials received:', { 
        provider: credentials.provider,
        canPublish: credentials.canPublish 
      });

      if (credentials.provider !== 'livekit') {
        throw new Error('Only LiveKit is supported for audio');
      }

      // Request microphone permission for hosts/speakers
      if (isHost || credentials.canPublish) {
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
          console.warn('Microphone permission denied:', micError);
          // Continue anyway - listeners don't need mic
        }
      }

      // Create LiveKit room
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      roomRef.current = room;

      // Set up event listeners
      room.on(RoomEvent.Connected, () => {
        console.log('Connected to LiveKit room!');
        setIsConnected(true);
        setIsConnecting(false);
        updateParticipants(room);
        toast.success('Connected to audio room!');
      });

      room.on(RoomEvent.Disconnected, () => {
        console.log('Disconnected from LiveKit room');
        cleanup();
      });

      room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        console.log('Participant connected:', participant.identity);
        updateParticipants(room);
        
        const newParticipant: DailyParticipant = {
          id: participant.sid || participant.identity,
          identity: participant.identity,
          name: participant.name || participant.identity,
          isMuted: !participant.isMicrophoneEnabled,
          isSpeaking: false,
          audioLevel: 0,
          isLocal: false,
        };
        
        onParticipantJoined?.(newParticipant);
        toast(`${participant.name || participant.identity} joined the room`);
      });

      room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        console.log('Participant disconnected:', participant.identity);
        updateParticipants(room);
        onParticipantLeft?.(participant.identity);
      });

      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log('Track subscribed:', track.kind, 'from', participant.identity);
        
        // Attach audio tracks to play them
        if (track.kind === Track.Kind.Audio) {
          const audioElement = track.attach();
          audioElement.play().catch(e => console.warn('Audio autoplay blocked:', e));
          console.log('Audio track attached and playing');
        }
        
        updateParticipants(room);
      });

      room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        console.log('Track unsubscribed:', track.kind, 'from', participant.identity);
        track.detach();
        updateParticipants(room);
      });

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const speakerIds = speakers.map(s => s.identity);
        setParticipants(prev => prev.map(p => ({
          ...p,
          isSpeaking: speakerIds.includes(p.identity),
        })));
      });

      room.on(RoomEvent.LocalTrackPublished, (publication) => {
        console.log('Local track published:', publication.kind);
        updateParticipants(room);
      });

      room.on(RoomEvent.MediaDevicesError, (error) => {
        console.error('Media devices error:', error);
        toast.error('Microphone error - please check permissions');
      });

      // Connect to the room
      console.log('Joining room:', credentials.url, credentials.roomName);
      await room.connect(credentials.url, credentials.token);

      // Enable microphone for hosts
      if (isHost && credentials.canPublish) {
        try {
          await room.localParticipant.setMicrophoneEnabled(true);
          setIsMuted(false);
          console.log('Microphone enabled for host');
        } catch (micErr) {
          console.warn('Could not enable mic:', micErr);
          setIsMuted(true);
        }
      } else {
        setIsMuted(true);
      }

    } catch (err: any) {
      console.error('Voice room connection error:', err);
      setError(err.message);
      setIsConnecting(false);
      toast.error('Failed to connect to audio room: ' + err.message);
    }
  }, [sessionId, userId, userName, isHost, isConnected, isConnecting, updateParticipants, cleanup, onParticipantJoined, onParticipantLeft]);

  // Disconnect from room
  const disconnect = useCallback(async () => {
    console.log('Disconnecting from voice room...');
    await cleanup();
  }, [cleanup]);

  // Toggle mute
  const toggleMute = useCallback(async () => {
    if (!roomRef.current?.localParticipant) {
      console.warn('No room for toggle mute');
      return;
    }

    try {
      const newMuteState = !isMuted;
      await roomRef.current.localParticipant.setMicrophoneEnabled(!newMuteState);
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
    if (!roomRef.current?.localParticipant) return;
    
    try {
      await roomRef.current.localParticipant.setMicrophoneEnabled(true);
      setIsMuted(false);
      console.log('Microphone enabled');
    } catch (err) {
      console.error('Error enabling microphone:', err);
    }
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    // Recording via LiveKit would require server-side configuration
    // For now, we'll use local recording via MediaRecorder
    try {
      if (!navigator.mediaDevices) {
        throw new Error('Media devices not available');
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      recordedChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      toast.success('Recording started');
    } catch (err) {
      console.error('Error starting recording:', err);
      toast.error('Failed to start recording');
    }
  }, []);

  // Stop recording and save episode
  const saveEpisode = useCallback(async (title: string, description: string) => {
    if (!mediaRecorderRef.current) return;
    
    try {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Wait for final data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
      console.log('Recording saved, size:', blob.size);
      toast.success('Recording saved');
      
      // Clean up
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      mediaRecorderRef.current = null;
      recordedChunksRef.current = [];
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
    provider: 'livekit' as const,
    connect,
    disconnect,
    toggleMute,
    enableMicrophone,
    startRecording,
    saveEpisode,
  };
};
