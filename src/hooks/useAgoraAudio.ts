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

// Global connection lock to prevent multiple simultaneous connections
let globalConnectionLock = false;
let globalConnectedSession: string | null = null;

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
  const [isMuted, setIsMuted] = useState(false); // Start unmuted for speakers
  const [isRecording, setIsRecording] = useState(false);
  const [participants, setParticipants] = useState<AudioParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [canPublish, setCanPublish] = useState(false);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const volumeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentSessionRef = useRef<string | null>(null);
  const isCleaningUp = useRef(false);
  const connectionAttemptId = useRef(0);

  // Cleanup function with proper error handling
  const cleanup = useCallback(async () => {
    console.log('🧹 Agora audio cleanup');
    isCleaningUp.current = true;
    
    // Stop volume monitoring
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }

    // Stop and close local track - prevent echo by ensuring track is fully stopped
    if (localAudioTrackRef.current) {
      try {
        console.log('🔇 Stopping local audio track to prevent echo');
        localAudioTrackRef.current.setEnabled(false);
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current.close();
      } catch (e) {
        console.warn('Error stopping local track:', e);
      }
      localAudioTrackRef.current = null;
    }

    // Leave channel and cleanup client - handle WS_ABORT errors gracefully
    if (clientRef.current) {
      try {
        // Unsubscribe from all remote users first
        for (const user of clientRef.current.remoteUsers) {
          try {
            await clientRef.current.unsubscribe(user);
          } catch (e) {
            // Ignore
          }
        }
        
        // Only leave if connected
        if (clientRef.current.connectionState === 'CONNECTED' || 
            clientRef.current.connectionState === 'CONNECTING') {
          await clientRef.current.leave();
        }
      } catch (e: any) {
        // Ignore WS_ABORT errors - they happen during cleanup and are harmless
        if (e?.code !== 'WS_ABORT' && !e?.message?.includes('WS_ABORT')) {
          console.warn('Cleanup leave error:', e);
        }
      }
      clientRef.current = null;
    }

    uidToUserMap.clear();
    currentSessionRef.current = null;
    globalConnectedSession = null;
    globalConnectionLock = false;
    isCleaningUp.current = false;
    setIsConnected(false);
    setIsConnecting(false);
    setParticipants([]);
    setCanPublish(false);
  }, []);

  // Update participants from remote users
  const updateParticipants = useCallback(() => {
    if (!clientRef.current) return;

    const client = clientRef.current;
    const remoteUsers = client.remoteUsers;
    
    const mapped: AudioParticipant[] = [];

    // Add local user if we have a local track
    if (localAudioTrackRef.current) {
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
  const connect = useCallback(async (overrideSessionId?: string, force: boolean = false) => {
    const targetSessionId = overrideSessionId || sessionId;
    const attemptId = ++connectionAttemptId.current;

    if (!targetSessionId) {
      console.error('No session ID provided');
      toast.error('No session to connect to');
      return;
    }

    // Skip if already connected to same session (unless force)
    if (!force && isConnected && currentSessionRef.current === targetSessionId) {
      console.log('Already connected to this session');
      return;
    }

    // Check global connection lock to prevent simultaneous connections
    if (globalConnectionLock && !force) {
      console.log('🔒 Global connection lock active, waiting...');
      await new Promise(resolve => setTimeout(resolve, 500));
      if (globalConnectionLock) {
        console.log('🔒 Connection still locked, aborting');
        return;
      }
    }

    // If globally connected to a different session, disconnect first
    if (globalConnectedSession && globalConnectedSession !== targetSessionId && !force) {
      console.log('🔄 Already connected to different session, will reconnect');
    }

    // Acquire global lock
    globalConnectionLock = true;

    // CRITICAL: Always cleanup existing connection first to prevent UID_CONFLICT
    if (clientRef.current || isCleaningUp.current) {
      console.log('🧹 Pre-connect cleanup: existing client found or cleanup in progress');
      isCleaningUp.current = true;
      try {
        if (clientRef.current) {
          if (clientRef.current.connectionState === 'CONNECTED' || 
              clientRef.current.connectionState === 'CONNECTING') {
            console.log('🧹 Leaving existing channel before reconnecting');
            await clientRef.current.leave();
          }
        }
      } catch (e: any) {
        // Ignore cleanup errors (WS_ABORT, etc.)
        if (e?.code !== 'WS_ABORT' && !e?.message?.includes('WS_ABORT')) {
          console.warn('Pre-connect cleanup error (ignored):', e);
        }
      }
      clientRef.current = null;
      if (localAudioTrackRef.current) {
        try {
          localAudioTrackRef.current.stop();
          localAudioTrackRef.current.close();
        } catch (e) {
          // Ignore
        }
        localAudioTrackRef.current = null;
      }
      isCleaningUp.current = false;
      // Wait a bit for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Check if this attempt is still valid
    if (attemptId !== connectionAttemptId.current) {
      console.log('🚫 Connection attempt superseded, aborting');
      globalConnectionLock = false;
      return;
    }

    console.log(`🔌 Connect called: force=${force}, attemptId=${attemptId}`);

    setIsConnected(false);
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
      currentSessionRef.current = targetSessionId;
      setCanPublish(credentials.canPublish);

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
          // CRITICAL: Check if we already have a local audio track to prevent echo
          if (localAudioTrackRef.current) {
            console.log('🔇 Existing audio track found, stopping it first...');
            try {
              localAudioTrackRef.current.setEnabled(false);
              localAudioTrackRef.current.stop();
              localAudioTrackRef.current.close();
            } catch (e) {
              console.warn('Error cleaning up existing track:', e);
            }
            localAudioTrackRef.current = null;
          }
          
          console.log('🎤 Creating microphone track with echo cancellation...');
          const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
            encoderConfig: 'speech_standard',
            // Enable echo cancellation, noise suppression, and auto gain control
            AEC: true,
            AGC: true,
            ANS: true,
          });
          localAudioTrackRef.current = audioTrack;

          await client.publish(audioTrack);
          console.log('🎤 Audio track published successfully!');
          
          // Start unmuted for speakers
          setIsMuted(false);
          toast.success('Microphone is live!');
        } catch (audioErr) {
          console.error('Error creating audio track:', audioErr);
          toast.error('Could not access microphone. Please check permissions.');
        }
      } else {
        console.log('📻 Joining as listener (no publish rights)');
        setIsMuted(true);
      }

      setIsConnected(true);
      setIsConnecting(false);
      globalConnectedSession = targetSessionId;
      globalConnectionLock = false;
      updateParticipants();
      startVolumeMonitoring();
      toast.success('Connected to audio room!');

      console.log('✅ Agora connection complete!');

    } catch (err: unknown) {
      console.error('❌ Agora connection error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setIsConnecting(false);
      globalConnectionLock = false;
      
      // Handle specific errors
      if (message.includes('UID_CONFLICT')) {
        toast.error('Audio conflict detected. Please refresh the page.');
      } else if (message.includes('WS_ABORT')) {
        // Ignore WS_ABORT - it's a cleanup side effect
        console.log('WS_ABORT during connect - ignoring');
      } else {
        toast.error('Failed to connect: ' + message);
      }
    }
  }, [sessionId, userId, userName, isHost, isConnected, updateParticipants, startVolumeMonitoring, onParticipantJoined, onParticipantLeft]);

  // Reconnect with fresh token - CRITICAL for when user is promoted to speaker
  const reconnect = useCallback(async () => {
    const targetSessionId = currentSessionRef.current || sessionId;
    
    if (!targetSessionId) {
      console.error('No session to reconnect to');
      return;
    }

    console.log('🔄 RECONNECT: Starting fresh connection for speaker permissions...');
    
    // Step 1: Stop volume monitoring
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }

    // Step 2: Stop and close local track
    if (localAudioTrackRef.current) {
      console.log('🔄 RECONNECT: Stopping local audio track');
      localAudioTrackRef.current.stop();
      localAudioTrackRef.current.close();
      localAudioTrackRef.current = null;
    }

    // Step 3: Leave channel
    if (clientRef.current) {
      try {
        console.log('🔄 RECONNECT: Leaving Agora channel');
        await clientRef.current.leave();
      } catch (e) {
        console.warn('Reconnect cleanup error:', e);
      }
      clientRef.current = null;
    }

    // Clear state
    uidToUserMap.clear();
    setIsConnected(false);
    setIsConnecting(false);
    setParticipants([]);
    setCanPublish(false);
    
    // Step 4: Wait for cleanup to complete
    console.log('🔄 RECONNECT: Waiting for cleanup...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 5: Reconnect with fresh token (force=true to bypass stale state check)
    console.log('🔄 RECONNECT: Connecting with fresh token (force=true)...');
    currentSessionRef.current = null; // Clear so connect uses the parameter
    await connect(targetSessionId, true);
    
    console.log('🔄 RECONNECT: Complete!');
  }, [sessionId, connect]);

  // Disconnect from Agora
  const disconnect = useCallback(async () => {
    console.log('Disconnecting from Agora...');
    await cleanup();
  }, [cleanup]);

  // Toggle mute - create audio track if needed
  const toggleMute = useCallback(async () => {
    // If no audio track exists but we have publish rights, create one
    if (!localAudioTrackRef.current && canPublish && clientRef.current) {
      try {
        console.log('🎤 Creating microphone track on unmute with echo cancellation...');
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
          encoderConfig: 'speech_standard',
          AEC: true,
          AGC: true,
          ANS: true,
        });
        localAudioTrackRef.current = audioTrack;
        
        await clientRef.current.publish(audioTrack);
        console.log('🎤 Audio track published!');
        setIsMuted(false);
        toast.success('Microphone enabled!');
        updateParticipants();
        return;
      } catch (err) {
        console.error('Error creating audio track:', err);
        toast.error('Could not access microphone. Please check permissions.');
        return;
      }
    }

    if (!localAudioTrackRef.current) {
      console.warn('No local audio track for toggle mute');
      toast.error('You need speaker permissions to unmute');
      return;
    }

    try {
      const newMuteState = !isMuted;
      await localAudioTrackRef.current.setEnabled(!newMuteState);
      setIsMuted(newMuteState);
      console.log('Mute toggled to:', newMuteState);
      toast(newMuteState ? 'Microphone muted' : 'Microphone unmuted');
      updateParticipants();
    } catch (err) {
      console.error('Error toggling mute:', err);
      toast.error('Failed to toggle microphone');
    }
  }, [isMuted, canPublish, updateParticipants]);

  // Enable microphone - create track if needed
  const enableMicrophone = useCallback(async () => {
    if (!clientRef.current || !canPublish) {
      console.log('Cannot enable mic - not connected or no publish rights');
      return;
    }

    // If no track exists, create one
    if (!localAudioTrackRef.current) {
      try {
        console.log('🎤 Creating microphone track with echo cancellation...');
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
          encoderConfig: 'speech_standard',
          AEC: true,
          AGC: true,
          ANS: true,
        });
        localAudioTrackRef.current = audioTrack;
        
        await clientRef.current.publish(audioTrack);
        console.log('🎤 Audio track published!');
        setIsMuted(false);
        toast.success('Microphone enabled!');
        updateParticipants();
        return;
      } catch (err) {
        console.error('Error creating audio track:', err);
        toast.error('Could not access microphone');
        return;
      }
    }

    try {
      await localAudioTrackRef.current.setEnabled(true);
      setIsMuted(false);
      console.log('Microphone enabled');
      updateParticipants();
    } catch (err) {
      console.error('Error enabling microphone:', err);
    }
  }, [canPublish, updateParticipants]);

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
    canPublish,
    provider: 'agora' as const,
    connect,
    disconnect,
    reconnect,
    toggleMute,
    enableMicrophone,
    startRecording,
    saveEpisode,
  };
};
