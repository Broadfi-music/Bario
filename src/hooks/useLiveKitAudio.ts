import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  Participant,
  RemoteParticipant,
  ConnectionState,
  RoomOptions,
  AudioPresets,
} from 'livekit-client';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getFreshSession, isDemoSession, isValidUUID } from '@/lib/authUtils';

interface UseLiveKitAudioProps {
  sessionId: string;
  userId: string;
  userName: string;
  isHost: boolean;
  onParticipantJoined?: (participant: Participant) => void;
  onParticipantLeft?: (participant: Participant) => void;
}

interface AudioParticipant {
  identity: string;
  name: string;
  isSpeaking: boolean;
  isMuted: boolean;
  audioLevel: number;
}

export const useLiveKitAudio = ({
  sessionId,
  userId,
  userName,
  isHost,
  onParticipantJoined,
  onParticipantLeft,
}: UseLiveKitAudioProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [participants, setParticipants] = useState<AudioParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const roomRef = useRef<Room | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Get LiveKit token from edge function
  const getToken = useCallback(async () => {
    // Skip for demo sessions - they don't need real LiveKit connections
    if (isDemoSession(sessionId)) {
      console.log('Demo session detected, skipping LiveKit token request');
      return null;
    }

    // Ensure fresh auth session before edge function call
    const session = await getFreshSession();
    if (!session) {
      setError('Please sign in to join audio');
      toast.error('Please sign in to continue');
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke('livekit-token', {
        body: { sessionId, userId, userName, isHost }
      });

      if (error) {
        console.error('LiveKit token error:', error);
        throw new Error(error.message || 'Failed to get token');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data as { token: string; url: string; roomName: string };
    } catch (err) {
      console.error('Failed to get LiveKit token:', err);
      setError('Failed to connect to audio');
      return null;
    }
  }, [sessionId, userId, userName, isHost]);

  // Update participants list
  const updateParticipants = useCallback(() => {
    if (!roomRef.current) return;

    const room = roomRef.current;
    const allParticipants: AudioParticipant[] = [];

    // Add local participant
    if (room.localParticipant) {
      const lp = room.localParticipant;
      const audioTrack = lp.getTrackPublication(Track.Source.Microphone);
      allParticipants.push({
        identity: lp.identity,
        name: lp.name || lp.identity,
        isSpeaking: lp.isSpeaking,
        isMuted: !audioTrack || audioTrack.isMuted,
        audioLevel: lp.audioLevel,
      });
    }

    // Add remote participants
    room.remoteParticipants.forEach((rp) => {
      const audioTrack = rp.getTrackPublication(Track.Source.Microphone);
      allParticipants.push({
        identity: rp.identity,
        name: rp.name || rp.identity,
        isSpeaking: rp.isSpeaking,
        isMuted: !audioTrack || audioTrack.isMuted,
        audioLevel: rp.audioLevel,
      });
    });

    setParticipants(allParticipants);
  }, []);

  // Connect to LiveKit room
  const connect = useCallback(async () => {
    if (roomRef.current || isConnecting) return;

    // For demo sessions, simulate connection
    if (isDemoSession(sessionId)) {
      console.log('Demo session - simulating audio connection');
      setIsConnected(true);
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const tokenData = await getToken();
      if (!tokenData) {
        setIsConnecting(false);
        return;
      }

      const roomOptions: RoomOptions = {
        audioCaptureDefaults: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
        publishDefaults: {
          audioPreset: AudioPresets.speech,
        },
        adaptiveStream: true,
        dynacast: true,
      };

      const room = new Room(roomOptions);
      roomRef.current = room;

      // Set up event listeners
      room.on(RoomEvent.Connected, () => {
        console.log('Connected to LiveKit room');
        setIsConnected(true);
        setIsConnecting(false);
        updateParticipants();
        toast.success('Connected to audio room');
      });

      room.on(RoomEvent.Disconnected, () => {
        console.log('Disconnected from LiveKit room');
        setIsConnected(false);
        setParticipants([]);
      });

      room.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log('Participant connected:', participant.identity);
        updateParticipants();
        onParticipantJoined?.(participant);
      });

      room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log('Participant disconnected:', participant.identity);
        updateParticipants();
        onParticipantLeft?.(participant);
      });

      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (track.kind === Track.Kind.Audio) {
          const audioElement = track.attach();
          document.body.appendChild(audioElement);
          console.log('Subscribed to audio from:', participant.identity);
        }
        updateParticipants();
      });

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach(el => el.remove());
        updateParticipants();
      });

      room.on(RoomEvent.ActiveSpeakersChanged, () => updateParticipants());
      room.on(RoomEvent.TrackMuted, () => updateParticipants());
      room.on(RoomEvent.TrackUnmuted, () => updateParticipants());

      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        console.log('Connection state:', state);
        if (state === ConnectionState.Disconnected) {
          setIsConnected(false);
          setIsConnecting(false);
        }
      });

      // Connect to room
      await room.connect(tokenData.url, tokenData.token);

      // Enable microphone for hosts/speakers (muted by default)
      if (isHost) {
        await room.localParticipant.setMicrophoneEnabled(true);
        const micPub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
        if (micPub) {
          await micPub.mute();
          setIsMuted(true);
        }
      }

    } catch (err) {
      console.error('Failed to connect to LiveKit:', err);
      const message = err instanceof Error ? err.message : 'Failed to connect';
      setError(message);
      setIsConnecting(false);
      toast.error('Failed to connect to audio room');
    }
  }, [getToken, isHost, updateParticipants, onParticipantJoined, onParticipantLeft, isConnecting, sessionId]);

  // Disconnect from room
  const disconnect = useCallback(async () => {
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
      setIsConnected(false);
      setParticipants([]);
    }
    // Also reset demo state
    if (isDemoSession(sessionId)) {
      setIsConnected(false);
    }
  }, [sessionId]);

  // Toggle microphone
  const toggleMute = useCallback(async () => {
    // For demo sessions, just toggle state
    if (isDemoSession(sessionId)) {
      setIsMuted(prev => !prev);
      toast(isMuted ? 'Microphone ON' : 'Microphone OFF');
      return;
    }

    if (!roomRef.current) return;

    const room = roomRef.current;
    const localParticipant = room.localParticipant;

    try {
      if (isMuted) {
        await localParticipant.setMicrophoneEnabled(true);
        const micPub = localParticipant.getTrackPublication(Track.Source.Microphone);
        if (micPub) {
          await micPub.unmute();
        }
        setIsMuted(false);
        toast('Microphone ON');
      } else {
        const micPub = localParticipant.getTrackPublication(Track.Source.Microphone);
        if (micPub) {
          await micPub.mute();
        }
        setIsMuted(true);
        toast('Microphone OFF');
      }
      updateParticipants();
    } catch (err) {
      console.error('Failed to toggle mute:', err);
      toast.error('Failed to toggle microphone');
    }
  }, [isMuted, updateParticipants, sessionId]);

  // Enable microphone for participant
  const enableMicrophone = useCallback(async () => {
    if (isDemoSession(sessionId)) {
      setIsMuted(false);
      return;
    }

    if (!roomRef.current) return;

    try {
      await roomRef.current.localParticipant.setMicrophoneEnabled(true);
      setIsMuted(false);
      updateParticipants();
      toast.success('Microphone enabled');
    } catch (err) {
      console.error('Failed to enable microphone:', err);
      toast.error('Failed to enable microphone');
    }
  }, [updateParticipants, sessionId]);

  // Start recording (host only)
  const startRecording = useCallback(async () => {
    if (!roomRef.current || isRecording) return;

    try {
      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();

      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach(audio => {
        try {
          const source = audioContext.createMediaElementSource(audio);
          source.connect(destination);
          source.connect(audioContext.destination);
        } catch {
          // Element may already be connected
        }
      });

      const localMic = roomRef.current.localParticipant.getTrackPublication(Track.Source.Microphone);
      if (localMic?.track) {
        const micStream = (localMic.track as any).mediaStream as MediaStream;
        if (micStream) {
          const micSource = audioContext.createMediaStreamSource(micStream);
          micSource.connect(destination);
        }
      }

      const mediaRecorder = new MediaRecorder(destination.stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      // Only call backend if it's a real session
      if (!isDemoSession(sessionId)) {
        await supabase.functions.invoke('podcast-recording', {
          body: { action: 'start-recording', sessionId }
        });
      }

      toast.success('Recording started');
    } catch (err) {
      console.error('Failed to start recording:', err);
      toast.error('Failed to start recording');
    }
  }, [sessionId, isRecording]);

  // Stop recording and save
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

        if (!isDemoSession(sessionId)) {
          await supabase.functions.invoke('podcast-recording', {
            body: { action: 'stop-recording', sessionId }
          });
        }

        toast.success('Recording stopped');
      };

      mediaRecorder.stop();
    });
  }, [sessionId, isRecording]);

  // Save episode
  const saveEpisode = useCallback(async (title: string, description?: string) => {
    // Check for fresh session first
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
    connect,
    disconnect,
    toggleMute,
    enableMicrophone,
    startRecording,
    stopRecording,
    saveEpisode,
  };
};
