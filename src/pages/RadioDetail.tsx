import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Play, Pause, Heart, Share2, Users, Volume2, VolumeX, Eye, MessageSquare, Gift, Radio, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface RadioStation {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  favicon: string;
  tags: string;
  country: string;
  countrycode: string;
  language: string;
  votes: number;
  clickcount: number;
  clicktrend: number;
  codec: string;
  bitrate: number;
  homepage: string;
}

interface ChatMessage {
  id: string;
  user: string;
  message: string;
  timestamp: Date;
  isEmoji?: boolean;
}

const RadioDetail = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { stationId } = useParams();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  
  const station = location.state?.station as RadioStation | undefined;
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isFavorite, setIsFavorite] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: '1', user: 'MusicLover23', message: '🔥🔥🔥', timestamp: new Date(), isEmoji: true },
    { id: '2', user: 'RadioFan', message: 'This station is amazing!', timestamp: new Date() },
    { id: '3', user: 'NightOwl', message: 'Best vibes late night', timestamp: new Date() },
  ]);
  const [viewerCount, setViewerCount] = useState(Math.floor(Math.random() * 5000) + 500);

  useEffect(() => {
    if (station && audioRef.current) {
      audioRef.current.src = station.url_resolved || station.url;
      audioRef.current.volume = volume;
    }
    
    // Simulate viewer count changes
    const interval = setInterval(() => {
      setViewerCount(prev => prev + Math.floor(Math.random() * 20) - 10);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [station]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => toast.error('Unable to play this station'));
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const sendChatMessage = () => {
    if (!chatMessage.trim()) return;
    if (!user) {
      toast.error('Please sign in to chat');
      return;
    }
    
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      user: user.email?.split('@')[0] || 'User',
      message: chatMessage,
      timestamp: new Date(),
      isEmoji: /^[\u{1F300}-\u{1F9FF}]+$/u.test(chatMessage.trim())
    };
    
    setChatMessages(prev => [...prev, newMessage]);
    setChatMessage('');
    
    // Auto-scroll to bottom
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  const shareStation = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  const formatListeners = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (!station) {
    return (
      <div className="min-h-screen bg-[#0e0e10] text-white flex items-center justify-center">
        <div className="text-center">
          <Radio className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/50 mb-4">Station not found</p>
          <Button onClick={() => navigate('/radio-stations')}>Back to Stations</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e10] text-white">
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />
      
      <div className="flex h-screen">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="flex items-center justify-between h-14 px-4 bg-[#18181b] border-b border-white/5">
            <button onClick={() => navigate('/radio-stations')} className="flex items-center gap-1.5 text-white/60 hover:text-white">
              <ChevronLeft className="h-4 w-4" />
              <span className="text-sm">Back</span>
            </button>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsFavorite(!isFavorite)}
                size="sm"
                variant="ghost"
                className="text-white/60 hover:text-white"
              >
                <Heart className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
              </Button>
              <Button onClick={shareStation} size="sm" variant="ghost" className="text-white/60 hover:text-white">
                <Share2 className="h-4 w-4" />
              </Button>
              {station.homepage && (
                <a href={station.homepage} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="ghost" className="text-white/60 hover:text-white">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              )}
            </div>
          </header>

          {/* Video/Stream Area */}
          <div className="flex-1 relative bg-gradient-to-br from-purple-900/30 via-black to-blue-900/30">
            <img 
              src={station.favicon || 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=1200'} 
              alt={station.name}
              className="absolute inset-0 w-full h-full object-cover opacity-40 blur-xl"
              onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=1200'; }}
            />
            
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {/* Station Logo */}
              <div className="relative mb-8">
                <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl bg-gradient-to-br from-purple-500 to-blue-500">
                  <img 
                    src={station.favicon || ''} 
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
                {isPlaying && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 bg-red-600 rounded-full">
                    <span className="animate-pulse w-2 h-2 bg-white rounded-full"></span>
                    <span className="text-xs font-semibold">LIVE</span>
                  </div>
                )}
              </div>

              {/* Station Info */}
              <h1 className="text-3xl font-bold text-white mb-2 text-center px-4">{station.name}</h1>
              <p className="text-white/60 text-sm mb-6">{station.country} • {station.tags?.split(',')[0] || 'Music'}</p>

              {/* Play Button */}
              <button
                onClick={togglePlay}
                className="w-20 h-20 rounded-full bg-[#53fc18] hover:bg-[#53fc18]/90 flex items-center justify-center transition-transform hover:scale-105 shadow-lg shadow-[#53fc18]/30"
              >
                {isPlaying ? (
                  <Pause className="h-10 w-10 text-black" />
                ) : (
                  <Play className="h-10 w-10 text-black ml-2" />
                )}
              </button>

              {/* Volume Control */}
              <div className="flex items-center gap-3 mt-8 bg-black/40 rounded-full px-4 py-2">
                <button onClick={toggleMute} className="text-white/60 hover:text-white">
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-24 accent-[#53fc18]"
                />
              </div>
            </div>

            {/* Live Badge */}
            <div className="absolute top-4 left-4 flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 rounded text-sm font-semibold">
                <span className="animate-pulse w-2 h-2 bg-white rounded-full"></span>
                LIVE
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/70 rounded text-sm">
                <Eye className="h-4 w-4" />
                {formatListeners(viewerCount)} viewers
              </div>
            </div>

            {/* Bitrate Info */}
            <div className="absolute bottom-4 left-4 flex items-center gap-2">
              <span className="px-2 py-1 bg-black/70 rounded text-xs text-white/60">
                {station.bitrate}kbps • {station.codec}
              </span>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="h-16 bg-[#18181b] border-t border-white/5 flex items-center px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-blue-500">
                <img 
                  src={station.favicon || ''} 
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{station.name}</p>
                <p className="text-xs text-white/50">{station.language || 'Various Languages'}</p>
              </div>
            </div>
            
            <div className="ml-auto flex items-center gap-4">
              <Button size="sm" className="bg-[#53fc18] text-black hover:bg-[#53fc18]/90 font-semibold">
                <Heart className="h-4 w-4 mr-1" />
                Follow
              </Button>
            </div>
          </div>
        </div>

        {/* Chat Sidebar - Twitch style */}
        <div className="w-80 flex flex-col bg-[#18181b] border-l border-white/5 hidden lg:flex">
          <div className="h-14 flex items-center justify-between px-4 border-b border-white/5">
            <span className="text-sm font-semibold">Stream Chat</span>
            <Users className="h-4 w-4 text-white/40" />
          </div>

          {/* Chat Messages */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.map(msg => (
              <div key={msg.id} className="flex gap-2">
                <span className="text-[#53fc18] text-sm font-medium">{msg.user}:</span>
                <span className={`text-sm ${msg.isEmoji ? 'text-2xl' : 'text-white/80'}`}>{msg.message}</span>
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-white/5">
            {user ? (
              <div className="flex gap-2">
                <Input
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Send a message..."
                  className="bg-[#26262c] border-none text-sm"
                />
                <Button onClick={sendChatMessage} size="sm" className="bg-[#53fc18] text-black hover:bg-[#53fc18]/90">
                  Chat
                </Button>
              </div>
            ) : (
              <Button onClick={() => navigate('/auth')} className="w-full bg-[#53fc18] text-black hover:bg-[#53fc18]/90">
                Log in to chat
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RadioDetail;
