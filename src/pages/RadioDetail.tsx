import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Play, Pause, Heart, Share2, Users, Volume2, VolumeX, Eye, Gift, Radio, Mic, Send } from 'lucide-react';
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
  const [visibleMessages, setVisibleMessages] = useState<ChatMessage[]>([]);
  const [viewerCount, setViewerCount] = useState(Math.floor(Math.random() * 5000) + 500);
  const [isRecording, setIsRecording] = useState(false);
  const [showChat, setShowChat] = useState(true);

  // Demo chat messages for Twitch-style appearing/disappearing
  const demoMessages: ChatMessage[] = [
    { id: '1', user: 'MusicLover23', message: '🔥🔥🔥', timestamp: new Date(), isEmoji: true },
    { id: '2', user: 'RadioFan', message: 'This station is fire!', timestamp: new Date() },
    { id: '3', user: 'NightOwl', message: 'Best vibes', timestamp: new Date() },
    { id: '4', user: 'ChillVibes', message: 'Perfect music 🎵', timestamp: new Date() },
    { id: '5', user: 'DJMaster', message: 'Turn it up!', timestamp: new Date() },
    { id: '6', user: 'BeatDropper', message: '💯💯💯', timestamp: new Date(), isEmoji: true },
    { id: '7', user: 'LofiLover', message: 'So relaxing', timestamp: new Date() },
    { id: '8', user: 'Groover99', message: 'This track slaps', timestamp: new Date() },
  ];

  // Twitch-style appearing/disappearing comments (0.7s)
  useEffect(() => {
    let messageIndex = 0;
    const interval = setInterval(() => {
      const newMessage = {
        ...demoMessages[messageIndex % demoMessages.length],
        id: Date.now().toString(),
        timestamp: new Date()
      };
      
      setVisibleMessages(prev => [...prev.slice(-5), newMessage]);
      messageIndex++;
      
      // Remove message after 0.7 seconds
      setTimeout(() => {
        setVisibleMessages(prev => prev.filter(m => m.id !== newMessage.id));
      }, 700);
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (station && audioRef.current) {
      audioRef.current.src = station.url_resolved || station.url;
      audioRef.current.volume = volume;
    }
    
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
    
    setVisibleMessages(prev => [...prev.slice(-5), newMessage]);
    setChatMessage('');
    
    // Remove after 0.7 seconds
    setTimeout(() => {
      setVisibleMessages(prev => prev.filter(m => m.id !== newMessage.id));
    }, 700);
  };

  const startRecording = async () => {
    if (!user) {
      toast.error('Please sign in to send voice notes');
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const voiceMessage: ChatMessage = {
          id: Date.now().toString(),
          user: user.email?.split('@')[0] || 'User',
          message: '🎤 Voice note',
          timestamp: new Date(),
          isVoice: true,
          voiceUrl: audioUrl
        };
        
        setVisibleMessages(prev => [...prev.slice(-5), voiceMessage]);
        
        setTimeout(() => {
          setVisibleMessages(prev => prev.filter(m => m.id !== voiceMessage.id));
        }, 3000);
        
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
        }
      }, 10000);
    } catch (error) {
      toast.error('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
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

  if (!station) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Radio className="h-10 w-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/50 text-sm mb-3">Station not found</p>
          <Button onClick={() => navigate('/radio-stations')} className="bg-black border border-white/20">
            Back to Stations
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />
      
      {/* Mobile-first layout like Kick.com/Twitch */}
      <div className="flex flex-col h-[100dvh]">
        {/* Header */}
        <header className="flex items-center justify-between h-11 px-2 bg-[#0e0e10] border-b border-white/5 shrink-0">
          <button onClick={() => navigate('/radio-stations')} className="text-white/60 hover:text-white p-1">
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <div className="flex items-center gap-1.5">
            <Button onClick={() => setIsFavorite(!isFavorite)} size="sm" variant="ghost" className="h-8 px-2">
              <Heart className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-white/60'}`} />
            </Button>
            <Button onClick={shareStation} size="sm" variant="ghost" className="h-8 px-2">
              <Share2 className="h-4 w-4 text-white/60" />
            </Button>
          </div>
        </header>

        {/* Video/Stream Area */}
        <div className="relative flex-1 min-h-0 bg-gradient-to-br from-purple-900/30 via-black to-blue-900/30">
          <img 
            src={station.favicon || 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=1200'} 
            alt={station.name}
            className="absolute inset-0 w-full h-full object-cover opacity-30 blur-2xl"
            onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=1200'; }}
          />
          
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
            {/* Station Logo */}
            <div className="relative mb-4">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-2 border-white/20 bg-gradient-to-br from-purple-500 to-blue-500">
                <img 
                  src={station.favicon || ''} 
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
              {isPlaying && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 bg-red-600 rounded-full">
                  <span className="animate-pulse w-1.5 h-1.5 bg-white rounded-full"></span>
                  <span className="text-[9px] font-semibold">LIVE</span>
                </div>
              )}
            </div>

            {/* Station Info */}
            <h1 className="text-lg sm:text-xl font-bold text-white mb-1 text-center px-4">{station.name}</h1>
            <p className="text-white/60 text-xs mb-4">{station.country} • {station.tags?.split(',')[0] || 'Music'}</p>

            {/* Play Button */}
            <button
              onClick={togglePlay}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black hover:bg-black/80 flex items-center justify-center transition-transform hover:scale-105 border border-white/20"
            >
              {isPlaying ? (
                <Pause className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              ) : (
                <Play className="h-6 w-6 sm:h-7 sm:w-7 text-white ml-1" />
              )}
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-2 mt-4 bg-black/60 rounded-full px-3 py-1.5 border border-white/10">
              <button onClick={toggleMute} className="text-white/60 hover:text-white">
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="w-20 accent-white h-1"
              />
            </div>
          </div>

          {/* Live Badge & Viewers */}
          <div className="absolute top-2 left-2 flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 bg-red-600 rounded text-[10px] font-semibold">
              <span className="animate-pulse w-1.5 h-1.5 bg-white rounded-full"></span>
              LIVE
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-black/70 rounded text-[10px]">
              <Eye className="h-3 w-3" />
              {formatListeners(viewerCount)}
            </div>
          </div>

          {/* Floating Chat Messages - Twitch style */}
          <div className="absolute bottom-4 left-2 right-2 space-y-1 pointer-events-none">
            {visibleMessages.map(msg => (
              <div 
                key={msg.id} 
                className="animate-fade-in bg-black/60 backdrop-blur-sm rounded px-2 py-1 inline-block mr-2"
                style={{ animation: 'fadeIn 0.15s ease-out' }}
              >
                <span className="text-[#00ff7f] text-[10px] font-medium">{msg.user}: </span>
                {msg.isVoice ? (
                  <span className="text-[10px] text-white/80">🎤 Voice note</span>
                ) : (
                  <span className={`text-[10px] ${msg.isEmoji ? 'text-base' : 'text-white/80'}`}>{msg.message}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="shrink-0 bg-[#0e0e10] border-t border-white/5">
          {/* Station Info & Actions */}
          <div className="flex items-center justify-between px-2 py-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-blue-500">
                <img 
                  src={station.favicon || ''} 
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
              <div>
                <p className="text-[10px] font-medium text-white truncate max-w-[100px]">{station.name}</p>
                <p className="text-[9px] text-white/50">{station.language || 'Various'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              <Button 
                size="sm" 
                onClick={() => setIsFavorite(!isFavorite)}
                className="bg-black hover:bg-black/80 text-white font-semibold text-[10px] h-7 px-2 border border-white/20"
              >
                <Heart className={`h-3 w-3 mr-1 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                Follow
              </Button>
              <Button 
                size="sm" 
                onClick={() => setIsSubscribed(!isSubscribed)}
                className={`text-[10px] h-7 px-2 font-semibold ${isSubscribed ? 'bg-purple-600 hover:bg-purple-700' : 'bg-black hover:bg-black/80 border border-white/20'}`}
              >
                Subscribe
              </Button>
              <Button 
                size="sm" 
                onClick={sendGift}
                className="bg-black hover:bg-black/80 text-white font-semibold text-[10px] h-7 px-2 border border-white/20"
              >
                <Gift className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Chat Input with Voice Note */}
          <div className="p-2">
            {user ? (
              <div className="flex gap-1.5">
                <Input
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Send a message..."
                  className="flex-1 bg-[#1f1f23] border-none text-xs h-9"
                />
                <Button 
                  onClick={isRecording ? stopRecording : startRecording}
                  size="sm" 
                  className={`h-9 px-2 ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-black hover:bg-black/80 border border-white/20'}`}
                >
                  <Mic className={`h-4 w-4 ${isRecording ? 'animate-pulse' : ''}`} />
                </Button>
                <Button 
                  onClick={sendChatMessage} 
                  size="sm" 
                  className="bg-black hover:bg-black/80 h-9 px-3 border border-white/20"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button onClick={() => navigate('/auth')} className="w-full bg-black hover:bg-black/80 border border-white/20 text-xs">
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
