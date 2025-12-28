import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

interface ConnectionQuality {
  status: 'excellent' | 'good' | 'poor' | 'disconnected';
  latency: number;
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
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>({ status: 'disconnected', latency: 0 });
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const jitsiApiRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadJitsiScript = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.JitsiMeetExternalAPI) {
        console.log('[Jitsi] Script already loaded');
        resolve();
        return;
      }

      console.log('[Jitsi] Loading script from meet.jit.si...');
      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = () => {
        console.log('[Jitsi] Script loaded successfully');
        resolve();
      };
      script.onerror = () => {
        console.error('[Jitsi] Failed to load script');
        reject(new Error('Failed to load Jitsi script'));
      };
      document.head.appendChild(script);
    });
  }, []);

  const updateParticipants = useCallback(() => {
    if (!jitsiApiRef.current) return;

    try {
      const participantInfo = jitsiApiRef.current.getParticipantsInfo();
      console.log('[Jitsi] Current participants:', participantInfo.length);

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

  const attemptReconnect = useCallback(async () => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error('[Jitsi] Max reconnection attempts reached');
      setError('Connection lost. Please refresh the page.');
      return;
    }

    reconnectAttemptsRef.current++;
    console.log(`[Jitsi] Reconnection attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);
    
    // Wait before reconnecting (exponential backoff)
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 10000);
    await new Promise(resolve => setTimeout(resolve, delay));

    // Try to reconnect
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
      jitsiApiRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    
    // Trigger reconnect
    connect();
  }, []);

  const connect = useCallback(async () => {
    if (isConnecting || isConnected) {
      console.log('[Jitsi] Already connecting or connected');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      console.log('[Jitsi] Starting connection process...');
      await loadJitsiScript();

      // Create a hidden container for Jitsi
      if (!containerRef.current) {
        containerRef.current = document.createElement('div');
        containerRef.current.id = 'jitsi-container';
        containerRef.current.style.width = '1px';
        containerRef.current.style.height = '1px';
        containerRef.current.style.position = 'absolute';
        containerRef.current.style.left = '-9999px';
        containerRef.current.style.top = '-9999px';
        document.body.appendChild(containerRef.current);
      }

      // Generate unique room name with session ID
      const roomName = `bario-${sessionId.replace(/-/g, '').substring(0, 24)}`;
      console.log('[Jitsi] Joining room:', roomName);

      // Initialize Jitsi Meet API with optimized audio-only config
      const api = new window.JitsiMeetExternalAPI('meet.jit.si', {
        roomName,
        parentNode: containerRef.current,
        userInfo: {
          displayName: userName || 'Participant',
        },
        configOverwrite: {
          // Audio settings - optimized for voice
          startWithAudioMuted: false,
          startWithVideoMuted: true,
          disableVideo: true,
          
          // Disable unnecessary features
          enableClosePage: false,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          enableNoisyMicDetection: false,
          enableNoAudioDetection: false,
          disablePolls: true,
          disableReactions: true,
          hideConferenceTimer: true,
          
          // Connection optimization
          p2p: {
            enabled: true,
            preferH264: false,
            disableSimulcast: true,
          },
          
          // Audio quality settings
          disableAudioLevels: false,
          stereo: false,
          
          // Reduce bandwidth
          resolution: 180,
          constraints: {
            video: false,
            audio: {
              autoGainControl: true,
              echoCancellation: true,
              noiseSuppression: true,
            },
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
          MOBILE_APP_PROMO: false,
          HIDE_INVITE_MORE_HEADER: true,
        },
      });

      jitsiApiRef.current = api;

      // Set up event listeners
      api.addListener('videoConferenceJoined', () => {
        console.log('[Jitsi] ✅ Conference joined successfully!');
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionQuality({ status: 'good', latency: 50 });
        reconnectAttemptsRef.current = 0; // Reset reconnect counter on successful connection
        updateParticipants();
      });

      api.addListener('participantJoined', (participant: any) => {
        console.log('[Jitsi] 👋 Participant joined:', participant.displayName || participant.id);
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
        console.log('[Jitsi] 👋 Participant left:', participant.id);
        updateParticipants();
        if (onParticipantLeave) {
          onParticipantLeave(participant.id);
        }
      });

      api.addListener('audioMuteStatusChanged', (status: any) => {
        console.log('[Jitsi] 🎙️ Mute status changed:', status.muted ? 'muted' : 'unmuted');
        setIsMuted(status.muted);
      });

      api.addListener('dominantSpeakerChanged', (data: any) => {
        setParticipants(prev => prev.map(p => ({
          ...p,
          isSpeaking: p.id === data.id,
        })));
      });

      api.addListener('videoConferenceLeft', () => {
        console.log('[Jitsi] Conference left');
        setIsConnected(false);
        setConnectionQuality({ status: 'disconnected', latency: 0 });
      });

      api.addListener('errorOccurred', (errorData: any) => {
        console.error('[Jitsi] Error occurred:', errorData);
        
        // Attempt to reconnect on certain errors
        if (errorData.error?.name === 'connection.droppedError' || 
            errorData.error?.name === 'conference.connectionError') {
          attemptReconnect();
        } else {
          setError(errorData.message || 'Audio connection error');
        }
      });

      // Monitor connection quality
      api.addListener('participantKickedOut', () => {
        console.log('[Jitsi] Kicked from room');
        setError('You have been removed from the room');
        setIsConnected(false);
      });

    } catch (err) {
      console.error('[Jitsi] Connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to audio room');
      setIsConnecting(false);
      
      // Attempt to reconnect
      attemptReconnect();
    }
  }, [sessionId, userName, isConnecting, isConnected, loadJitsiScript, updateParticipants, onParticipantJoin, onParticipantLeave, attemptReconnect]);

  const disconnect = useCallback(() => {
    console.log('[Jitsi] Disconnecting...');
    
    // Stop recording if active
    if (isRecording) {
      stopRecordingInternal();
    }
    
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
      jitsiApiRef.current = null;
    }

    if (containerRef.current && containerRef.current.parentNode) {
      containerRef.current.parentNode.removeChild(containerRef.current);
      containerRef.current = null;
    }

    // Clean up audio stream
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setParticipants([]);
    setIsMuted(false);
    setConnectionQuality({ status: 'disconnected', latency: 0 });
    reconnectAttemptsRef.current = 0;
  }, [isRecording]);

  const toggleMute = useCallback(() => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleAudio');
      console.log('[Jitsi] Toggle mute command sent');
    }
  }, []);

  const enableMicrophone = useCallback(() => {
    if (jitsiApiRef.current && isMuted) {
      jitsiApiRef.current.executeCommand('toggleAudio');
      console.log('[Jitsi] Enabling microphone');
    }
  }, [isMuted]);

  // Local audio recording using MediaRecorder
  const startRecording = useCallback(async () => {
    if (isRecording) {
      console.log('[Recording] Already recording');
      return;
    }

    try {
      console.log('[Recording] Starting local audio recording...');
      
      // Get microphone stream for recording
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        }
      });
      
      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      // Create MediaRecorder with best available codec
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';
      
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType,
        audioBitsPerSecond: 128000,
      });
      
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('[Recording] Chunk captured:', event.data.size, 'bytes');
        }
      };

      mediaRecorder.onstop = () => {
        console.log('[Recording] MediaRecorder stopped, chunks:', audioChunksRef.current.length);
      };

      mediaRecorder.onerror = (event) => {
        console.error('[Recording] MediaRecorder error:', event);
        setError('Recording error occurred');
      };

      // Start recording with 1-second chunks
      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      console.log('[Recording] ✅ Recording started successfully');
    } catch (err) {
      console.error('[Recording] Failed to start:', err);
      setError('Failed to start recording. Please check microphone permissions.');
    }
  }, [isRecording]);

  const stopRecordingInternal = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
    }

    setIsRecording(false);
  }, []);

  // Save recording to Supabase storage
  const saveEpisode = useCallback(async (title: string, description: string): Promise<string | null> => {
    console.log('[Recording] Saving episode:', title);

    if (!isRecording && audioChunksRef.current.length === 0) {
      console.log('[Recording] No recording to save');
      return null;
    }

    // Stop recording first
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Wait a moment for the final chunk
    await new Promise(resolve => setTimeout(resolve, 500));

    stopRecordingInternal();

    if (audioChunksRef.current.length === 0) {
      console.error('[Recording] No audio data captured');
      setError('No audio was recorded');
      return null;
    }

    try {
      // Create audio blob
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      console.log('[Recording] Audio blob size:', audioBlob.size, 'bytes');

      if (audioBlob.size < 1000) {
        console.error('[Recording] Audio too small, may be empty');
        setError('Recording appears to be empty');
        return null;
      }

      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `episodes/${userId}/${timestamp}-${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.webm`;

      // Upload to Supabase storage
      console.log('[Recording] Uploading to Supabase:', fileName);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-uploads')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
          upsert: false,
        });

      if (uploadError) {
        console.error('[Recording] Upload error:', uploadError);
        setError('Failed to upload recording');
        return null;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(fileName);

      console.log('[Recording] ✅ Uploaded successfully:', publicUrl);

      // Save episode metadata to database
      const { data: episodeData, error: episodeError } = await supabase
        .from('podcast_episodes')
        .insert({
          host_id: userId,
          session_id: sessionId,
          title,
          description,
          audio_url: publicUrl,
          duration_ms: recordingDuration * 1000,
        })
        .select()
        .single();

      if (episodeError) {
        console.error('[Recording] Database error:', episodeError);
        // Don't fail completely, URL is still valid
      } else {
        console.log('[Recording] Episode saved to database:', episodeData.id);
      }

      // Clear chunks
      audioChunksRef.current = [];
      setRecordingDuration(0);

      return publicUrl;
    } catch (err) {
      console.error('[Recording] Save error:', err);
      setError('Failed to save recording');
      return null;
    }
  }, [isRecording, userId, sessionId, recordingDuration, stopRecordingInternal]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    // Connection state
    isConnected,
    isConnecting,
    isMuted,
    isRecording,
    participants,
    error,
    connectionQuality,
    recordingDuration,
    
    // Actions
    connect,
    disconnect,
    toggleMute,
    enableMicrophone,
    startRecording,
    saveEpisode,
  };
};
