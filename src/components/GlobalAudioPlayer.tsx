import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { 
  Play, Pause, Volume2, VolumeX, X, 
  SkipBack, SkipForward, Radio 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const GlobalAudioPlayer = () => {
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
    stopTrack,
  } = useAudioPlayer();

  if (!currentTrack) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl border-t border-white/10 z-50 safe-area-pb">
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
        <div 
          className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between h-16 px-4">
        {/* Track Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
            {currentTrack.coverUrl ? (
              <img 
                src={currentTrack.coverUrl} 
                alt="" 
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <Radio className="h-5 w-5 text-white" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{currentTrack.title}</p>
            <p className="text-xs text-white/60 truncate">{currentTrack.artist}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white/60 hover:text-white h-8 w-8 hidden sm:flex"
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          
          <Button 
            onClick={isPlaying ? pauseTrack : resumeTrack}
            size="icon"
            className="bg-white text-black hover:bg-white/90 rounded-full h-10 w-10"
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white/60 hover:text-white h-8 w-8 hidden sm:flex"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Time & Volume */}
        <div className="flex items-center gap-4 flex-1 justify-end">
          <span className="text-xs text-white/40 hidden sm:block">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          
          <div className="items-center gap-2 hidden md:flex">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
              className="text-white/60 hover:text-white h-8 w-8"
            >
              {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Slider
              value={[volume * 100]}
              onValueChange={(val) => setVolume(val[0] / 100)}
              max={100}
              step={1}
              className="w-20"
            />
          </div>

          <Button 
            variant="ghost" 
            size="icon"
            onClick={stopTrack}
            className="text-white/40 hover:text-white h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GlobalAudioPlayer;
