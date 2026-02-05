import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Mic, Volume2, VolumeX, Users, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { demoSession, DemoSpeaker } from '@/config/demoSpace';
import AuthPromptModal from './AuthPromptModal';

// Audio waveform animation component
const AudioWaveform = ({ isActive }: { isActive: boolean }) => {
  if (!isActive) return null;
  
  return (
    <div className="flex items-center gap-[2px] h-3">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="w-[3px] bg-green-500 rounded-full animate-pulse"
          style={{
            height: `${Math.random() * 8 + 4}px`,
            animationDelay: `${i * 0.1}s`,
            animationDuration: '0.4s',
          }}
        />
      ))}
    </div>
  );
};

interface DemoLiveSpaceProps {
  onLeave?: () => void;
}

const DemoLiveSpace = ({ onLeave }: DemoLiveSpaceProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [listenerCount, setListenerCount] = useState(demoSession.baseListenerCount);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<string>(demoSession.speakers[0].id);

  // Initialize and auto-play audio
  useEffect(() => {
    audioRef.current = new Audio(demoSession.audioUrl);
    audioRef.current.loop = true;
    audioRef.current.volume = 0.7;
    
    // Auto-play with a small delay
    const playTimer = setTimeout(() => {
      audioRef.current?.play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.log('Autoplay blocked, waiting for user interaction:', err);
          // Show play button if autoplay is blocked
        });
    }, 500);

    return () => {
      clearTimeout(playTimer);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Simulate fluctuating listener count
  useEffect(() => {
    const interval = setInterval(() => {
      setListenerCount(prev => {
        const change = Math.floor(Math.random() * 11) - 5; // -5 to +5
        const newCount = Math.max(85, Math.min(200, prev + change));
        return newCount;
      });
    }, 8000 + Math.random() * 4000); // 8-12 seconds

    return () => clearInterval(interval);
  }, []);

  // Simulate rotating active speaker
  useEffect(() => {
    const interval = setInterval(() => {
      const speakers = demoSession.speakers;
      const currentIndex = speakers.findIndex(s => s.id === activeSpeaker);
      const nextIndex = (currentIndex + 1) % speakers.length;
      setActiveSpeaker(speakers[nextIndex].id);
    }, 15000 + Math.random() * 10000); // 15-25 seconds

    return () => clearInterval(interval);
  }, [activeSpeaker]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => toast.error('Unable to play audio'));
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleJoinSession = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    toast.success('Joined! You can now hear everyone.');
  };

  const handleLeave = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    onLeave?.();
    navigate('/podcasts');
  };

   const renderSpeaker = (speaker: DemoSpeaker) => {
    const isActive = speaker.id === activeSpeaker && isPlaying;
    
    return (
       <div key={speaker.id} className="flex items-center gap-2 py-1.5 px-2">
         {/* Small circular avatar */}
        <div className="relative">
          <div 
             className={`w-8 h-8 rounded-full bg-gradient-to-br ${speaker.avatarGradient} flex items-center justify-center ${isActive ? 'ring-2 ring-green-500/50' : ''}`}
          >
             <span className="text-white font-bold text-xs">
              {speaker.name.charAt(0)}
            </span>
          </div>
          {isActive && (
             <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2">
              <AudioWaveform isActive={true} />
            </div>
          )}
        </div>
         
         {/* Name and role inline */}
         <div className="flex items-center gap-2">
           <span className="text-white text-xs font-medium">
            {speaker.name}
           </span>
           {speaker.role === 'host' && (
             <span className="bg-yellow-500 text-black text-[8px] font-bold px-1.5 py-0.5 rounded-full">
               HOST
             </span>
           )}
           {speaker.role === 'co_host' && (
             <span className="text-white/40 text-[10px]">Co-host</span>
           )}
           {speaker.role === 'speaker' && (
             <span className="text-white/40 text-[10px]">Speaker</span>
           )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#1a1a1d] to-[#0e0e10]">
      {/* Session Header */}
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-semibold text-sm sm:text-base truncate">
              {demoSession.title}
            </h1>
            <p className="text-white/50 text-xs truncate mt-0.5">
              {demoSession.description}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <div className="flex items-center gap-1.5 text-red-400 bg-red-500/20 px-2 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium">LIVE</span>
            </div>
            <div className="flex items-center gap-1 text-white/60">
              <Users className="h-3.5 w-3.5" />
              <span className="text-xs">{listenerCount}</span>
            </div>
          </div>
        </div>
      </div>

       {/* Speakers Area - Rectangular List Style */}
       <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 min-h-0">
         <div className="bg-white/5 rounded-lg border border-white/10 w-full max-w-xs">
           {demoSession.speakers.map(speaker => renderSpeaker(speaker))}
        </div>

         {/* Audio Controls - smaller */}
         <div className="flex items-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={togglePlay}
            className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleMute}
            className="bg-white/10 border-white/20 hover:bg-white/20 text-white"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Join/Leave Controls */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-white/5 bg-black/50">
        <Button
          onClick={handleJoinSession}
          size="sm"
          className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs"
        >
          <Mic className="h-3 w-3 mr-1.5" />
          Join Session
        </Button>
        <Button
          onClick={handleLeave}
          variant="outline"
          size="sm"
          className="bg-white/10 border-white/20 hover:bg-white/20 text-white text-xs"
        >
          Leave
        </Button>
      </div>

      {/* Auth Modal */}
      <AuthPromptModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  );
};

export default DemoLiveSpace;
