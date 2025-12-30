import { useState, useRef, useCallback, useEffect } from 'react';
import AgoraRTC, { 
  IAgoraRTCClient, 
  IMicrophoneAudioTrack,
  IAgoraRTCRemoteUser,
  UID
} from 'agora-rtc-sdk-ng';
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

interface UseAgoraAudioProps {
  sessionId: string;
  userId: string;
  userName: string;
  isHost: boolean;
  onParticipantJoined?: (participant: AudioParticipant) => void;
  onParticipantLeft?: (identity: string) => void;
}

// Store mapping of UID to user info
const uidToUserMap = new Map<number, { identity: string; name: string }>();

export const useAgoraAudio = ({
  sessionId,
  userId,
  userName,
  isHost,
  onParticipantJoined,
  onParticipantLeft,
}: UseAgoraAudioProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(!isHost);
  const [isRecording, setIsRecording] = useState(false);
  const [participants, setParticipants] = useState<AudioParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const volumeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function
  const cleanup = useCallback(async () => {
    console.log('🧹 Agora audio cleanup');
    
    // Stop volume monitoring
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }

    // Stop and close local track
    if (localAudioTrackRef.current) {
      localAudioTrackRef.current.stop();
      localAudioTrackRef.current.close();
      localAudioTrackRef.current = null;
    }

    // Leave channel and cleanup client
    if (clientRef.current) {
      try {
        await clientRef.current.leave();
      } catch (e) {
        console.warn('Cleanup error:', e);
      }
      clientRef.current = null;
    }

    uidToUserMap.clear();
    setIsConnected(false);
    setIsConnecting(false);
    setParticipants([]);
  }, []);

  // Update participants from remote users
  const updateParticipants = useCallback(() => {
    if (!clientRef.current) return;

    const client = clientRef.current;
    const remoteUsers = client.remoteUsers;
    
    const mapped: AudioParticipant[] = [];

    // Add local user if we have a local track
    if (localAudioTrackRef.current) {
      const localUserInfo = uidToUserMap.get(client.uid as number);
      mapped.push({
        id: String(client.uid),
        identity: userId,
        name: userName || 'You',
        isMuted: !localAudioTrackRef.current.enabled,
        isSpeaking: false,
        audioLevel: 0,
        isLocal: true,
      });
    }

    // Add remote users
    remoteUsers.forEach((user) => {
      const userInfo = uidToUserMap.get(user.uid as number);
      mapped.push({
        id: String(user.uid),
        identity: userInfo?.identity || String(user.uid),
        name: userInfo?.name || `User ${user.uid}`,
        isMuted: !user.hasAudio,
        isSpeaking: false,
        audioLevel: 0,
        isLocal: false,
      });
    });

    setParticipants(mapped);
    console.log('📊 Participants updated:', mapped.length);
  }, [userId, userName]);

  // Start volume level monitoring
  const startVolumeMonitoring = useCallback(() => {
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
    }

    volumeIntervalRef.current = setInterval(() => {
      if (!clientRef.current) return;

      setParticipants(prev => prev.map(p => {
        let audioLevel = 0;
        let isSpeaking = false;

        if (p.isLocal && localAudioTrackRef.current) {
          audioLevel = localAudioTrackRef.current.getVolumeLevel() * 100;
          isSpeaking = audioLevel > 5;
        } else {
          // For remote users, check their audio track
          const remoteUser = clientRef.current?.remoteUsers.find(
            u => String(u.uid) === p.id
          );
          if (remoteUser?.audioTrack) {
            audioLevel = remoteUser.audioTrack.getVolumeLevel() * 100;
            isSpeaking = audioLevel > 5;
          }
        }

        return { ...p, audioLevel, isSpeaking };
      }));
    }, 100);
  }, []);

  // Connect to Agora channel
  const connect = useCallback(async (overrideSessionId?: string) => {
    const targetSessionId = overrideSessionId || sessionId;

    if (!targetSessionId) {
      console.error('No session ID provided');
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
      console.log('🎙️ Connecting to Agora audio room:', targetSessionId);

      if (isDemoSession(targetSessionId)) {
        console.log('Demo session - skipping audio');
        setIsConnecting(false);
        return;
      }

      const session = await getFreshSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Get Agora token from edge function
      console.log('Requesting Agora token...');
      const { data: credentials, error: credError } = await supabase.functions.invoke('agora-token', {
        body: { sessionId: targetSessionId, userId, userName, isHost }
      });

      if (credError) {
        console.error('Agora token error:', credError);
        throw credError;
      }

      if (!credentials || !credentials.token) {
        throw new Error('Invalid Agora credentials received');
      }

      console.log('✅ Agora credentials received:', {
        channelName: credentials.channelName,
        uid: credentials.uid,
        canPublish: credentials.canPublish
      });

      // Store user mapping
      uidToUserMap.set(credentials.uid, { identity: userId, name: userName });

      // Create Agora client
      const client = AgoraRTC.createClient({ 
        mode: 'rtc', 
        codec: 'vp8' 
      });
      clientRef.current = client;

      // Set up event listeners
      client.on('user-joined', (user) => {
        console.log('👤 User joined:', user.uid);
        updateParticipants();
        
        const participant: AudioParticipant = {
          id: String(user.uid),
          identity: String(user.uid),
          name: `User ${user.uid}`,
          isMuted: true,
          isSpeaking: false,
          audioLevel: 0,
          isLocal: false,
        };
        onParticipantJoined?.(participant);
        toast(`Someone joined the room`);
      });

      client.on('user-left', (user) => {
        console.log('👋 User left:', user.uid);
        updateParticipants();
        onParticipantLeft?.(String(user.uid));
      });

      client.on('user-published', async (user, mediaType) => {
        console.log('🎵 User published:', user.uid, mediaType);
        
        if (mediaType === 'audio') {
          await client.subscribe(user, mediaType);
          console.log('🔊 Subscribed to audio from:', user.uid);
          
          // Play the audio
          user.audioTrack?.play();
          updateParticipants();
        }
      });

      client.on('user-unpublished', (user, mediaType) => {
        console.log('🔇 User unpublished:', user.uid, mediaType);
        updateParticipants();
      });

      client.on('exception', (event) => {
        console.error('Agora exception:', event);
      });

      // Join channel
      console.log('🔗 Joining Agora channel:', credentials.channelName);
      await client.join(
        credentials.appId,
        credentials.channelName,
        credentials.token,
        credentials.uid
      );

      console.log('✅ Joined Agora channel!');

      // Create and publish audio track if user can publish
      if (credentials.canPublish) {
        try {
          const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
            encoderConfig: 'speech_standard',
          });
          localAudioTrackRef.current = audioTrack;

          await client.publish(audioTrack);
          console.log('🎤 Audio track published');
          
          setIsMuted(false);
        } catch (audioErr) {
          console.error('Error creating audio track:', audioErr);
          toast.error('Could not access microphone');
        }
      } else {
        setIsMuted(true);
      }

      setIsConnected(true);
      setIsConnecting(false);
      updateParticipants();
      startVolumeMonitoring();
      toast.success('Connected to audio room!');

      console.log('✅ Agora connection complete!');

    } catch (err: unknown) {
      console.error('❌ Agora connection error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setIsConnecting(false);
      toast.error('Failed to connect: ' + message);
    }
  }, [sessionId, userId, userName, isHost, isConnected, isConnecting, updateParticipants, startVolumeMonitoring, onParticipantJoined, onParticipantLeft]);

  // Disconnect from Agora
  const disconnect = useCallback(async () => {
    console.log('Disconnecting from Agora...');
    await cleanup();
  }, [cleanup]);

  // Toggle mute
  const toggleMute = useCallback(async () => {
    if (!localAudioTrackRef.current) {
      console.warn('No local audio track for toggle mute');
      return;
    }

    try {
      const newMuteState = !isMuted;
      await localAudioTrackRef.current.setEnabled(!newMuteState);
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
    if (!localAudioTrackRef.current) return;

    try {
      await localAudioTrackRef.current.setEnabled(true);
      setIsMuted(false);
      console.log('Microphone enabled');
    } catch (err) {
      console.error('Error enabling microphone:', err);
    }
  }, []);

  // Start recording (placeholder)
  const startRecording = useCallback(async () => {
    toast.info('Recording feature coming soon');
    setIsRecording(true);
  }, []);

  // Save episode (placeholder)
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
    provider: 'agora' as const,
    connect,
    disconnect,
    toggleMute,
    enableMicrophone,
    startRecording,
    saveEpisode,
  };
};
