import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';

interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  coverUrl?: string;
  type: 'podcast' | 'music' | 'radio';
  countryCode?: string;
  isHeatmapTrack?: boolean;
}

interface AudioPlayerContextType {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  playTrack: (track: AudioTrack) => void;
  pauseTrack: () => void;
  resumeTrack: () => void;
  setVolume: (volume: number) => void;
  seekTo: (time: number) => void;
  stopTrack: () => void;
  setPlaylist: (tracks: AudioTrack[]) => void;
  playNext: () => void;
  playPrevious: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.8);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playlistRef = useRef<AudioTrack[]>([]);
  const currentIndexRef = useRef<number>(-1);

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = volume;

    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      // Auto-play next track if playlist exists
      if (playlistRef.current.length > 0 && currentIndexRef.current >= 0) {
        const nextIndex = currentIndexRef.current + 1;
        if (nextIndex < playlistRef.current.length) {
          const nextTrack = playlistRef.current[nextIndex];
          currentIndexRef.current = nextIndex;
          setCurrentTrack(nextTrack);
          if (audioRef.current) {
            audioRef.current.src = nextTrack.audioUrl;
            audioRef.current.play().catch(() => {});
          }
          setIsPlaying(true);
          fireEngagement(nextTrack, 'play');
          return;
        }
      }
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, []);

  const fireEngagement = (track: AudioTrack, action: 'play' | 'save' | 'vote') => {
    if (!track.isHeatmapTrack) return;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-engagement`;
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        track_id: track.id,
        country_code: track.countryCode || 'GLOBAL',
        action,
      }),
    }).catch(() => {});
  };

  const setPlaylist = useCallback((tracks: AudioTrack[]) => {
    playlistRef.current = tracks;
  }, []);

  const playTrack = (track: AudioTrack) => {
    if (audioRef.current) {
      // Find track index in playlist
      const idx = playlistRef.current.findIndex(t => t.id === track.id);
      if (idx >= 0) {
        currentIndexRef.current = idx;
      } else {
        // Track not in playlist - add surrounding context or just set index to -1
        currentIndexRef.current = -1;
      }

      if (currentTrack?.id === track.id) {
        audioRef.current.play();
      } else {
        audioRef.current.src = track.audioUrl;
        audioRef.current.play();
      }
      setCurrentTrack(track);
      setIsPlaying(true);
      fireEngagement(track, 'play');
    }
  };

  const pauseTrack = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const resumeTrack = () => {
    if (audioRef.current && currentTrack) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const setVolume = (newVolume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      setVolumeState(newVolume);
    }
  };

  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const playNext = useCallback(() => {
    if (playlistRef.current.length > 0 && currentIndexRef.current >= 0) {
      const nextIndex = currentIndexRef.current + 1;
      if (nextIndex < playlistRef.current.length) {
        const nextTrack = playlistRef.current[nextIndex];
        currentIndexRef.current = nextIndex;
        setCurrentTrack(nextTrack);
        if (audioRef.current) {
          audioRef.current.src = nextTrack.audioUrl;
          audioRef.current.play().catch(() => {});
        }
        setIsPlaying(true);
        fireEngagement(nextTrack, 'play');
      }
    }
  }, []);

  const playPrevious = useCallback(() => {
    if (playlistRef.current.length > 0 && currentIndexRef.current > 0) {
      const prevIndex = currentIndexRef.current - 1;
      const prevTrack = playlistRef.current[prevIndex];
      currentIndexRef.current = prevIndex;
      setCurrentTrack(prevTrack);
      if (audioRef.current) {
        audioRef.current.src = prevTrack.audioUrl;
        audioRef.current.play().catch(() => {});
      }
      setIsPlaying(true);
      fireEngagement(prevTrack, 'play');
    }
  }, []);

  const stopTrack = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setCurrentTrack(null);
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  return (
    <AudioPlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        volume,
        currentTime,
        duration,
        playTrack,
        pauseTrack,
        resumeTrack,
        setVolume,
        seekTo,
        stopTrack,
        setPlaylist,
        playNext,
        playPrevious,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
};

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
};
