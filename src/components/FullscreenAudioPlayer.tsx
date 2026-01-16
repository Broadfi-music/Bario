import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { 
  Play, Pause, Volume2, VolumeX, ChevronDown, 
  SkipBack, SkipForward, Shuffle, Repeat, Heart, Share2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { motion, AnimatePresence } from 'framer-motion';

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

interface FullscreenAudioPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

const FullscreenAudioPlayer = ({ isOpen, onClose }: FullscreenAudioPlayerProps) => {
  const {
    currentTrack,
    isPlaying,
    volume,
    currentTime,
    duration,
    pauseTrack,
    resumeTrack,
    setVolume,
    seekTo,
  } = useAudioPlayer();

  if (!currentTrack) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed inset-0 z-[100] bg-gradient-to-b from-neutral-800 to-black flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 safe-area-pt">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/10"
            >
              <ChevronDown className="h-6 w-6" />
            </Button>
            <span className="text-xs text-white/60 font-medium uppercase tracking-wider">
              Now Playing
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <Share2 className="h-5 w-5" />
            </Button>
          </div>

          {/* Album Art */}
          <div className="flex-1 flex items-center justify-center px-8 py-4">
            <div className="w-full max-w-[320px] aspect-square rounded-lg overflow-hidden shadow-2xl">
              {currentTrack.coverUrl ? (
                <img 
                  src={currentTrack.coverUrl} 
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <span className="text-6xl">🎵</span>
                </div>
              )}
            </div>
          </div>

          {/* Track Info */}
          <div className="px-8 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-white truncate">{currentTrack.title}</h2>
                <p className="text-sm text-white/60 truncate">{currentTrack.artist}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-white/60 hover:text-white ml-2"
              >
                <Heart className="h-6 w-6" />
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="px-8 mb-4">
            <Slider
              value={[progress]}
              onValueChange={(val) => seekTo((val[0] / 100) * duration)}
              max={100}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between mt-2">
              <span className="text-xs text-white/40">{formatTime(currentTime)}</span>
              <span className="text-xs text-white/40">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="px-8 mb-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                className="text-white/40 hover:text-white"
              >
                <Shuffle className="h-5 w-5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:text-white"
              >
                <SkipBack className="h-6 w-6" />
              </Button>
              
              <Button
                onClick={isPlaying ? pauseTrack : resumeTrack}
                size="icon"
                className="bg-white text-black hover:bg-white/90 rounded-full h-16 w-16"
              >
                {isPlaying ? (
                  <Pause className="h-8 w-8" />
                ) : (
                  <Play className="h-8 w-8 ml-1" />
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:text-white"
              >
                <SkipForward className="h-6 w-6" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="text-white/40 hover:text-white"
              >
                <Repeat className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Volume */}
          <div className="px-8 pb-8 safe-area-pb">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
                className="text-white/60 hover:text-white"
              >
                {volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>
              <Slider
                value={[volume * 100]}
                onValueChange={(val) => setVolume(val[0] / 100)}
                max={100}
                step={1}
                className="flex-1"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FullscreenAudioPlayer;
