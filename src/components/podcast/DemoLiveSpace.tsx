import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Mic, MicOff, Volume2, VolumeX, Users, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { demoSession, demoChatMessages, DemoSpeaker } from '@/config/demoSpace';
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

interface DemoComment {
  id: string;
  content: string;
  userName: string;
  color: string;
  fadeOut?: boolean;
}

const getUserColor = (name: string) => {
  const colors = ['text-emerald-400', 'text-pink-400', 'text-blue-400', 'text-yellow-400', 'text-cyan-400', 'text-orange-400', 'text-purple-400', 'text-rose-400'];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
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
  const [comments, setComments] = useState<DemoComment[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<string>(demoSession.speakers[0].id);
  
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const commentIndexRef = useRef(0);

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

  // Simulate chat messages appearing
  useEffect(() => {
    const addMessage = () => {
      const messageData = demoChatMessages[commentIndexRef.current % demoChatMessages.length];
      commentIndexRef.current++;
      
      const newComment: DemoComment = {
        id: `demo-${Date.now()}-${Math.random()}`,
        content: messageData.content,
        userName: messageData.userName,
        color: getUserColor(messageData.userName),
      };
      
      setComments(prev => [...prev.slice(-19), newComment]); // Keep last 20
    };

    // Add initial messages
    for (let i = 0; i < 3; i++) {
      setTimeout(() => addMessage(), i * 500);
    }

    // Add new messages periodically
    const interval = setInterval(() => {
      addMessage();
    }, 3000 + Math.random() * 5000); // 3-8 seconds

    return () => clearInterval(interval);
  }, []);

  // Fade out old messages
  useEffect(() => {
    const cleanup = setInterval(() => {
      setComments(prev => 
        prev.map((c, i) => 
          i < prev.length - 8 ? { ...c, fadeOut: true } : c
        ).filter((_, i) => i >= prev.length - 15)
      );
    }, 2000);

    return () => clearInterval(cleanup);
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

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

  const renderSpeaker = (speaker: DemoSpeaker, size: 'large' | 'medium') => {
    const isActive = speaker.id === activeSpeaker && isPlaying;
    const sizeClasses = size === 'large' ? 'w-20 h-20 sm:w-24 sm:h-24' : 'w-16 h-16 sm:w-20 sm:h-20';
    
    return (
      <div key={speaker.id} className="flex flex-col items-center gap-2">
        <div className="relative">
          <div 
            className={`${sizeClasses} rounded-full bg-gradient-to-br ${speaker.avatarGradient} flex items-center justify-center ${isActive ? 'ring-4 ring-green-500/50 animate-pulse' : ''}`}
          >
            <span className="text-white font-bold text-lg sm:text-xl">
              {speaker.name.charAt(0)}
            </span>
          </div>
          {isActive && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
              <AudioWaveform isActive={true} />
            </div>
          )}
          {speaker.role === 'host' && (
            <div className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[8px] font-bold px-1.5 py-0.5 rounded-full">
              HOST
            </div>
          )}
        </div>
        <div className="text-center">
          <p className="text-white text-xs sm:text-sm font-medium truncate max-w-[80px]">
            {speaker.name}
          </p>
          <p className="text-white/40 text-[10px] capitalize">
            {speaker.role === 'co_host' ? 'Co-host' : speaker.role}
          </p>
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

      {/* Speakers Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 min-h-0">
        {/* Host (largest) */}
        <div className="mb-6">
          {renderSpeaker(demoSession.speakers[0], 'large')}
        </div>
        
        {/* Co-hosts and Speakers */}
        <div className="flex items-center justify-center gap-6 sm:gap-8">
          {demoSession.speakers.slice(1).map(speaker => renderSpeaker(speaker, 'medium'))}
        </div>

        {/* Audio Controls */}
        <div className="flex items-center gap-3 mt-8">
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

      {/* Chat Area */}
      <div className="h-48 sm:h-56 flex flex-col bg-black/50 border-t border-white/5">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-hide">
          {comments.map((comment) => (
            <div 
              key={comment.id} 
              className={`py-0.5 transition-all duration-300 ${comment.fadeOut ? 'opacity-0 translate-x-4' : 'opacity-100'}`}
            >
              <div className="flex items-start gap-2 bg-black/40 rounded px-2 py-1.5 backdrop-blur-sm animate-in slide-in-from-right-4 duration-150">
                <div className="flex-1 min-w-0">
                  <span className={`text-xs font-bold ${comment.color}`}>
                    {comment.userName}:
                  </span>
                  <span className="text-xs text-white ml-1.5 break-words">
                    {comment.content}
                  </span>
                </div>
              </div>
            </div>
          ))}
          <div ref={commentsEndRef} />
        </div>

        {/* Join/Leave Controls */}
        <div className="flex items-center gap-2 px-3 py-2 border-t border-white/5">
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
