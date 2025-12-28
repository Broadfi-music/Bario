import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Play, Pause, Heart, Share2, Users, Volume2, VolumeX, Eye, Gift, Radio, Mic, Send, Settings, MessageSquare, Star, Crown } from 'lucide-react';
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
  isVoice?: boolean;
  voiceUrl?: string;
  badges?: string[];
}

const RadioDetail = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { stationId } = useParams();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const station = location.state?.station as RadioStation | undefined;
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [viewerCount, setViewerCount] = useState(Math.floor(Math.random() * 5000) + 500);
  const [isRecording, setIsRecording] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [followerCount, setFollowerCount] = useState(Math.floor(Math.random() * 50000) + 10000);

  // Demo chat messages - Kick/Twitch style
  const demoUsers = [
    { name: 'MusicLover23', badges: ['subscriber'] },
    { name: 'RadioFan', badges: ['vip'] },
    { name: 'NightOwl', badges: [] },
    { name: 'ChillVibes', badges: ['subscriber', 'founder'] },
    { name: 'DJMaster', badges: ['moderator'] },
    { name: 'BeatDropper', badges: [] },
    { name: 'LofiLover', badges: ['subscriber'] },
    { name: 'Groover99', badges: [] },
    { name: 'VinylCollector', badges: ['vip'] },
    { name: 'BassBoosted', badges: ['subscriber'] },
  ];

  const demoMessages = [
    '🔥🔥🔥',
    'This station is fire!',
    'Best vibes ever',
    'Perfect music 🎵',
    'Turn it up!',
    '💯💯💯',
    'So relaxing',
    'This track slaps',
    'Anyone know this song?',
    'Love this station ❤️',
    'Good morning everyone!',
    'Been listening all day',
    'These beats are crazy',
    'Mood 🎧',
    'Legendary station',
  ];

  // Generate continuous chat messages
  useEffect(() => {
    const addMessage = () => {
      const randomUser = demoUsers[Math.floor(Math.random() * demoUsers.length)];
      const randomMessage = demoMessages[Math.floor(Math.random() * demoMessages.length)];
      
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        user: randomUser.name,
        message: randomMessage,
        timestamp: new Date(),
        isEmoji: /^[\u{1F300}-\u{1F9FF}]+$/u.test(randomMessage.trim()),
        badges: randomUser.badges,
      };
      
      setMessages(prev => [...prev.slice(-50), newMessage]);
    };

    // Add initial messages
    for (let i = 0; i < 8; i++) {
      setTimeout(() => addMessage(), i * 200);
    }

    const interval = setInterval(addMessage, 2000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  // Auto scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

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
      isEmoji: /^[\u{1F300}-\u{1F9FF}]+$/u.test(chatMessage.trim()),
      badges: ['subscriber'],
    };
    
    setMessages(prev => [...prev.slice(-50), newMessage]);
    setChatMessage('');
  };

  const shareStation = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied!');
  };

  const sendGift = () => {
    if (!user) {
      toast.error('Please sign in to send gifts');
      return;
    }
    toast.success('Gift sent! 🎁');
  };

  const formatListeners = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const getBadgeIcon = (badge: string) => {
    switch (badge) {
      case 'moderator': return <Settings className="h-3 w-3 text-green-500" />;
      case 'vip': return <Star className="h-3 w-3 text-purple-500" />;
      case 'subscriber': return <Crown className="h-3 w-3 text-[#53fc18]" />;
      case 'founder': return <Crown className="h-3 w-3 text-yellow-500" />;
      default: return null;
    }
  };

  if (!station) {
    return (
      <div className="min-h-screen bg-[#0e0e10] text-white flex items-center justify-center">
        <div className="text-center">
          <Radio className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/50 mb-4">Station not found</p>
          <Button onClick={() => navigate('/radio-stations')} className="bg-[#53fc18] text-black">
            Back to Stations
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e10] text-white">
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />
      
      {/* Desktop Layout */}
      <div className="hidden lg:flex h-screen">
        {/* Main Content - No sidebar */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="h-14 bg-[#0e0e10] border-b border-white/5 flex items-center justify-between px-4">
            <button onClick={() => navigate('/radio-stations')} className="flex items-center gap-2 text-white/60 hover:text-white">
              <ChevronLeft className="h-5 w-5" />
              <span className="text-sm">Back</span>
            </button>
            <div className="flex items-center gap-2">
              <Button onClick={() => setIsFavorite(!isFavorite)} size="sm" variant="ghost">
                <Heart className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
              </Button>
              <Button onClick={shareStation} size="sm" variant="ghost">
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
          </header>

          {/* Video/Stream Area */}
          <div className="relative flex-1 bg-gradient-to-br from-purple-900/30 via-black to-blue-900/30">
            <img 
              src={station.favicon || 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=1200'} 
              alt={station.name}
              className="absolute inset-0 w-full h-full object-cover opacity-20 blur-3xl"
              onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=1200'; }}
            />
            
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {/* Station Logo */}
              <div className="relative mb-6">
                <div className="w-40 h-40 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl">
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
              <h1 className="text-3xl font-bold mb-2">{station.name}</h1>
              <p className="text-white/60 mb-6">{station.country} • {station.tags?.split(',')[0]}</p>

              {/* Play Button */}
              <button
                onClick={togglePlay}
                className="w-20 h-20 rounded-full bg-black border border-white/20 hover:bg-black/80 flex items-center justify-center transition-transform hover:scale-105"
              >
                {isPlaying ? (
                  <Pause className="h-10 w-10 text-white" />
                ) : (
                  <Play className="h-10 w-10 text-white ml-2" />
                )}
              </button>

              {/* Volume Control */}
              <div className="flex items-center gap-3 mt-6 bg-black/60 rounded-full px-4 py-2 border border-white/10">
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
                  className="w-24 accent-[#53fc18] h-1"
                />
              </div>
            </div>

            {/* Stats Overlay */}
            <div className="absolute top-4 left-4 flex items-center gap-3">
              <div className="flex items-center gap-1 px-3 py-1.5 bg-red-600 rounded text-sm font-semibold">
                <span className="animate-pulse w-2 h-2 bg-white rounded-full"></span>
                LIVE
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/70 rounded text-sm">
                <Eye className="h-4 w-4" />
                {formatListeners(viewerCount)}
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="h-16 bg-[#18181b] border-t border-white/5 flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-blue-500">
                <img src={station.favicon || ''} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              </div>
              <div>
                <p className="font-medium">{station.name}</p>
                <p className="text-xs text-white/50">{formatListeners(followerCount)} followers</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => setIsFavorite(!isFavorite)}
                className="bg-transparent hover:bg-white/10 border border-white/20 text-white"
              >
                <Heart className={`h-4 w-4 mr-2 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                Follow
              </Button>
              <Button 
                onClick={() => setIsSubscribed(!isSubscribed)}
                className={isSubscribed ? 'bg-purple-600 hover:bg-purple-700' : 'bg-black hover:bg-black/80 text-white border border-white/20'}
              >
                {isSubscribed ? 'Subscribed' : 'Subscribe'}
              </Button>
              <Button onClick={sendGift} variant="outline" className="border-white/20">
                <Gift className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </main>

        {/* Chat Sidebar */}
        <aside className="w-80 bg-[#18181b] border-l border-white/5 flex flex-col">
          {/* Chat Header */}
          <div className="h-12 border-b border-white/5 flex items-center justify-between px-4">
            <span className="font-semibold">Stream Chat</span>
            <button onClick={() => setShowChat(!showChat)}>
              <MessageSquare className="h-5 w-5 text-white/60" />
            </button>
          </div>

          {/* Chat Messages */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.map(msg => (
              <div key={msg.id} className="text-sm">
                <span className="inline-flex items-center gap-1 mr-1">
                  {msg.badges?.map((badge, i) => (
                    <span key={i}>{getBadgeIcon(badge)}</span>
                  ))}
                </span>
                <span className="font-medium text-[#53fc18]">{msg.user}: </span>
                <span className={msg.isEmoji ? 'text-lg' : 'text-white/80'}>{msg.message}</span>
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
                  placeholder="Send a message"
                  className="flex-1 bg-[#0e0e10] border-white/10"
                />
                <Button onClick={sendChatMessage} className="bg-black hover:bg-black/80 text-white border border-white/20">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button onClick={() => navigate('/auth')} className="w-full bg-black text-white border border-white/20">
                Log in to chat
              </Button>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden flex flex-col h-[100dvh]">
        {/* Mobile Header */}
        <header className="h-12 bg-[#0e0e10] border-b border-white/5 flex items-center justify-between px-3 shrink-0">
          <button onClick={() => navigate('/radio-stations')} className="text-white/60">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsFavorite(!isFavorite)} size="sm" variant="ghost" className="h-8 w-8 p-0">
              <Heart className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
            <Button onClick={shareStation} size="sm" variant="ghost" className="h-8 w-8 p-0">
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Stream Area */}
        <div className="relative aspect-video bg-gradient-to-br from-purple-900/30 via-black to-blue-900/30 shrink-0">
          <img 
            src={station.favicon || 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=600'} 
            alt={station.name}
            className="absolute inset-0 w-full h-full object-cover opacity-30 blur-2xl"
            onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=600'; }}
          />
          
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
            <div className="relative mb-4">
              <div className="w-20 h-20 rounded-xl overflow-hidden border border-white/10">
                <img src={station.favicon || ''} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              </div>
              {isPlaying && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 bg-red-600 rounded-full">
                  <span className="animate-pulse w-1.5 h-1.5 bg-white rounded-full"></span>
                  <span className="text-[9px] font-semibold">LIVE</span>
                </div>
              )}
            </div>

            <h1 className="text-lg font-bold mb-1 text-center">{station.name}</h1>
            <p className="text-white/60 text-xs mb-4">{station.country}</p>

            <button
              onClick={togglePlay}
              className="w-14 h-14 rounded-full bg-[#53fc18] flex items-center justify-center"
            >
              {isPlaying ? <Pause className="h-7 w-7 text-black" /> : <Play className="h-7 w-7 text-black ml-1" />}
            </button>

            <div className="flex items-center gap-2 mt-3 bg-black/60 rounded-full px-3 py-1.5">
              <button onClick={toggleMute}>{isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</button>
              <input type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolumeChange} className="w-16 accent-[#53fc18]" />
            </div>
          </div>

          <div className="absolute top-2 left-2 flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-0.5 bg-red-600 rounded text-[10px] font-semibold">
              <span className="animate-pulse w-1.5 h-1.5 bg-white rounded-full"></span>LIVE
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 bg-black/70 rounded text-[10px]">
              <Eye className="h-3 w-3" />{formatListeners(viewerCount)}
            </div>
          </div>
        </div>

        {/* Station Info Bar */}
        <div className="flex items-center justify-between p-3 bg-[#18181b] border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 overflow-hidden">
              <img src={station.favicon || ''} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </div>
            <div>
              <p className="text-sm font-medium">{station.name}</p>
              <p className="text-[10px] text-white/50">{formatListeners(followerCount)} followers</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            <Button size="sm" onClick={() => setIsFavorite(!isFavorite)} className="h-8 px-2 bg-transparent border border-white/20">
              <Heart className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
            <Button size="sm" onClick={() => setIsSubscribed(!isSubscribed)} className={`h-8 px-3 ${isSubscribed ? 'bg-purple-600' : 'bg-[#53fc18] text-black'}`}>
              {isSubscribed ? 'Subbed' : 'Sub'}
            </Button>
            <Button size="sm" onClick={sendGift} className="h-8 px-2 bg-transparent border border-white/20">
              <Gift className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Chat Area */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-3 bg-[#0e0e10]">
          {messages.map(msg => (
            <div key={msg.id} className="text-sm mb-1.5">
              <span className="inline-flex items-center gap-0.5 mr-1">
                {msg.badges?.map((badge, i) => <span key={i}>{getBadgeIcon(badge)}</span>)}
              </span>
              <span className="font-medium text-[#53fc18]">{msg.user}: </span>
              <span className={msg.isEmoji ? 'text-base' : 'text-white/80'}>{msg.message}</span>
            </div>
          ))}
        </div>

        {/* Chat Input */}
        <div className="p-3 bg-[#18181b] border-t border-white/5 shrink-0">
          {user ? (
            <div className="flex gap-2">
              <Input
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                placeholder="Send a message"
                className="flex-1 bg-[#0e0e10] border-white/10 h-10"
              />
              <Button onClick={sendChatMessage} className="bg-[#53fc18] text-black h-10 px-4">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button onClick={() => navigate('/auth')} className="w-full bg-[#53fc18] text-black">
              Log in to chat
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RadioDetail;