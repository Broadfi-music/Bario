import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Mic, Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { demoSession, demoSession2, demoSession3, DemoSpeaker, DemoSession, DEMO_SESSION_ID_2, DEMO_SESSION_ID_3 } from '@/config/demoSpace';
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
  sessionId?: string;
}

const DemoLiveSpace = ({ onLeave, sessionId }: DemoLiveSpaceProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Pick the right demo session
  const activeDemo: DemoSession = sessionId === DEMO_SESSION_ID_3 ? demoSession3 : sessionId === DEMO_SESSION_ID_2 ? demoSession2 : demoSession;
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [listenerCount, setListenerCount] = useState(activeDemo.baseListenerCount);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<string>(activeDemo.speakers[0].id);

  // Initialize and auto-play audio
  useEffect(() => {
    audioRef.current = new Audio(activeDemo.audioUrl);
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
  }, [activeDemo.audioUrl]);

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
      const speakers = activeDemo.speakers;
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
      <div key={speaker.id} className="flex flex-col items-center gap-1">
        <div className="relative">
          <button
            onClick={() => navigate(`/host/${speaker.id}`)}
            className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center ${isActive ? 'ring-2 ring-green-500/50' : ''} cursor-pointer hover:opacity-80 transition-opacity`}
          >
            {speaker.avatarUrl ? (
              <img src={speaker.avatarUrl} alt={speaker.name} className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${speaker.avatarGradient} flex items-center justify-center`}>
                <span className="text-white font-bold text-xs">{speaker.name.charAt(0)}</span>
              </div>
            )}
          </button>
          {isActive && (
            <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2">
              <AudioWaveform isActive={true} />
            </div>
          )}
          {speaker.role === 'host' && (
            <div className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[8px] font-bold px-1 py-0.5 rounded-full">
              HOST
            </div>
          )}
        </div>
        <button
          onClick={() => navigate(`/host/${speaker.id}`)}
          className="text-white text-[10px] font-medium text-center leading-tight max-w-[70px] truncate hover:text-white/80 transition-colors"
        >
          {speaker.name}
        </button>
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
              {activeDemo.title}
            </h1>
            <p className="text-white/50 text-xs truncate mt-0.5">
              {activeDemo.description}
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

      {/* Speakers Area - Horizontal Row */}
      <div className="flex-1 flex items-center justify-center px-4 py-4 min-h-0">
        <div className="flex items-start justify-center gap-4 flex-wrap">
          {activeDemo.speakers.map(speaker => renderSpeaker(speaker))}
          {/* Invite Slots - Plus circles */}
          {Array.from({ length: Math.max(0, 4 - activeDemo.speakers.length) }).map((_, i) => (
            <div key={`slot-${i}`} className="flex flex-col items-center gap-1">
              <button
                onClick={() => {
                  if (!user) {
                    setShowAuthModal(true);
                    return;
                  }
                  toast.success('Request sent to host!');
                }}
                className="w-10 h-10 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center hover:border-white/40 hover:bg-white/5 transition-colors"
              >
                <Plus className="w-4 h-4 text-white/40" />
              </button>
              <span className="text-white/30 text-[10px]">Join</span>
            </div>
          ))}
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
