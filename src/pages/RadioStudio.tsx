import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  Radio, Mic, MicOff, Gift, MessageCircle, Volume2, VolumeX,
  Maximize2, Minimize2, Users, Send, Heart, Star, Zap, Crown,
  Play, Pause, Settings, X, Loader2, Eye
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RadioStation {
  id: string;
  user_id: string;
  station_name: string;
  stream_url: string | null;
  is_live: boolean;
  listener_count: number;
}

interface ChatMessage {
  id: string;
  station_id: string;
  user_id: string;
  content: string;
  is_voicenote: boolean;
  voicenote_url: string | null;
  created_at: string;
  username?: string;
}

interface GiftItem {
  id: string;
  station_id: string;
  sender_id: string;
  gift_type: string;
  points_value: number;
  created_at: string;
  sender_name?: string;
}

const GIFT_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  heart: { icon: <Heart className="h-5 w-5" />, color: 'text-pink-500' },
  star: { icon: <Star className="h-5 w-5" />, color: 'text-yellow-500' },
  zap: { icon: <Zap className="h-5 w-5" />, color: 'text-blue-500' },
  crown: { icon: <Crown className="h-5 w-5" />, color: 'text-purple-500' },
};

const RadioStudio = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  
  const [station, setStation] = useState<RadioStation | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSecondScreen, setIsSecondScreen] = useState(false);
  
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [replyMessage, setReplyMessage] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchStation();
  }, [user]);

  useEffect(() => {
    if (station) {
      fetchChats();
      fetchGifts();
      subscribeToUpdates();
    }
  }, [station]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats]);

  const fetchStation = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('radio_stations')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setStation(data);
      setIsLive(data.is_live);
    }
    setLoading(false);
  };

  const fetchChats = async () => {
    if (!station) return;
    
    const { data } = await supabase
      .from('radio_chats')
      .select('*')
      .eq('station_id', station.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      // Fetch usernames
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, username')
        .in('user_id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name || p.username || 'Anonymous']) || []);
      
      setChats(data.reverse().map(c => ({
        ...c,
        username: profileMap.get(c.user_id) || 'Anonymous'
      })));
    }
  };

  const fetchGifts = async () => {
    if (!station) return;
    
    const { data } = await supabase
      .from('radio_gifts')
      .select('*')
      .eq('station_id', station.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      const userIds = [...new Set(data.map(g => g.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, username')
        .in('user_id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name || p.username || 'Anonymous']) || []);
      
      setGifts(data.map(g => ({
        ...g,
        sender_name: profileMap.get(g.sender_id) || 'Anonymous'
      })));
    }
  };

  const subscribeToUpdates = () => {
    if (!station) return;

    const chatChannel = supabase
      .channel(`radio-chats-${station.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'radio_chats',
        filter: `station_id=eq.${station.id}`
      }, () => fetchChats())
      .subscribe();

    const giftChannel = supabase
      .channel(`radio-gifts-${station.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'radio_gifts',
        filter: `station_id=eq.${station.id}`
      }, () => fetchGifts())
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(giftChannel);
    };
  };

  const toggleLive = async () => {
    if (!station) return;
    
    const newLiveStatus = !isLive;
    const { error } = await supabase
      .from('radio_stations')
      .update({ is_live: newLiveStatus })
      .eq('id', station.id);

    if (error) {
      toast.error('Failed to update live status');
    } else {
      setIsLive(newLiveStatus);
      toast.success(newLiveStatus ? 'You are now LIVE!' : 'Stream ended');
    }
  };

  const togglePlay = async () => {
    if (!station?.stream_url || !audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.src = station.stream_url;
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        toast.error('Failed to play stream');
      }
    }
  };

  const sendReply = async () => {
    if (!station || !user || !replyMessage.trim()) return;
    
    const { error } = await supabase
      .from('radio_chats')
      .insert({
        station_id: station.id,
        user_id: user.id,
        content: replyMessage.trim()
      });

    if (error) {
      toast.error('Failed to send message');
    } else {
      setReplyMessage('');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0e0e10] flex items-center justify-center">
        <div className="text-center">
          <Radio className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/50 mb-4">Please sign in to access the studio</p>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e0e10] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#53fc18] animate-spin" />
      </div>
    );
  }

  // Second screen mode - minimal UI for DJs
  if (isSecondScreen) {
    return (
      <div className="min-h-screen bg-[#0e0e10] text-white p-4">
        <audio ref={audioRef} />
        
        {/* Minimal Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Radio className="h-6 w-6 text-[#53fc18]" />
            <span className="font-semibold">{station?.station_name}</span>
            {isLive && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-red-600 rounded text-xs font-semibold">
                <span className="animate-pulse w-1.5 h-1.5 bg-white rounded-full" />
                LIVE
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/50 flex items-center gap-1">
              <Users className="h-4 w-4" />
              {station?.listener_count || 0}
            </span>
            <Button
              onClick={() => setIsSecondScreen(false)}
              variant="ghost"
              size="sm"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Large Chat Feed */}
        <div className="grid grid-cols-2 gap-4 h-[calc(100vh-100px)]">
          {/* Chats */}
          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Live Chat
            </h3>
            <ScrollArea className="h-[calc(100%-40px)]">
              {chats.map(chat => (
                <div key={chat.id} className="mb-3 p-2 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-[#53fc18]">{chat.username}</span>
                  </div>
                  <p className="text-sm">{chat.content}</p>
                </div>
              ))}
              <div ref={chatEndRef} />
            </ScrollArea>
          </div>

          {/* Gifts */}
          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Gifts
            </h3>
            <ScrollArea className="h-[calc(100%-40px)]">
              {gifts.map(gift => (
                <div key={gift.id} className="mb-3 p-3 bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-lg flex items-center gap-3">
                  <div className={GIFT_ICONS[gift.gift_type]?.color || 'text-white'}>
                    {GIFT_ICONS[gift.gift_type]?.icon || <Gift className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{gift.sender_name}</p>
                    <p className="text-xs text-white/50">sent {gift.gift_type} ({gift.points_value} pts)</p>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e10] text-white">
      <audio ref={audioRef} />
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0e0e10] border-b border-white/5">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/radio-stations')} className="flex items-center gap-2">
              <Radio className="h-6 w-6 text-[#53fc18]" />
            </button>
            <span className="font-semibold">{station?.station_name || 'Radio Studio'}</span>
            {isLive && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-red-600 rounded text-xs font-semibold">
                <span className="animate-pulse w-1.5 h-1.5 bg-white rounded-full" />
                LIVE
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/50 flex items-center gap-1">
              <Users className="h-4 w-4" />
              {station?.listener_count || 0}
            </span>
            <Button
              onClick={() => setIsSecondScreen(true)}
              variant="outline"
              size="sm"
              className="border-white/20"
            >
              <Eye className="h-4 w-4 mr-2" />
              2nd Screen
            </Button>
            <Button
              onClick={toggleFullscreen}
              variant="ghost"
              size="sm"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex h-[calc(100vh-56px)]">
        {/* Main Content */}
        <div className="flex-1 p-4 overflow-auto">
          {/* Controls */}
          <div className="bg-white/5 rounded-xl p-6 mb-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Broadcast Controls</h2>
              <Button
                onClick={() => navigate('/radio-feed')}
                variant="outline"
                size="sm"
                className="border-white/20"
              >
                <Settings className="h-4 w-4 mr-2" />
                Edit Station
              </Button>
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                onClick={toggleLive}
                className={isLive ? 'bg-red-600 hover:bg-red-700' : 'bg-[#53fc18] text-black hover:bg-[#53fc18]/90'}
                size="lg"
              >
                {isLive ? (
                  <>
                    <MicOff className="h-5 w-5 mr-2" />
                    End Stream
                  </>
                ) : (
                  <>
                    <Mic className="h-5 w-5 mr-2" />
                    Go Live
                  </>
                )}
              </Button>
              
              {station?.stream_url && (
                <Button
                  onClick={togglePlay}
                  variant="outline"
                  size="lg"
                  className="border-white/20"
                >
                  {isPlaying ? <Pause className="h-5 w-5 mr-2" /> : <Play className="h-5 w-5 mr-2" />}
                  Monitor
                </Button>
              )}
              
              <Button
                onClick={() => setIsMuted(!isMuted)}
                variant="ghost"
                size="lg"
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Recent Gifts */}
          <div className="bg-white/5 rounded-xl p-4 mb-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Gift className="h-4 w-4 text-[#53fc18]" />
              Recent Gifts
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {gifts.slice(0, 8).map(gift => (
                <div key={gift.id} className="p-3 bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-lg flex items-center gap-2">
                  <div className={GIFT_ICONS[gift.gift_type]?.color || 'text-white'}>
                    {GIFT_ICONS[gift.gift_type]?.icon || <Gift className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-xs truncate">{gift.sender_name}</p>
                    <p className="text-[10px] text-white/50">{gift.points_value} pts</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Sidebar */}
        <aside className="w-80 border-l border-white/5 flex flex-col bg-[#18181b]">
          <div className="p-4 border-b border-white/5">
            <h3 className="font-semibold flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Live Chat
            </h3>
          </div>
          
          <ScrollArea className="flex-1 p-4">
            {chats.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No messages yet</p>
              </div>
            ) : (
              chats.map(chat => (
                <div key={chat.id} className="mb-3 p-2 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-xs text-[#53fc18]">{chat.username}</span>
                    {chat.is_voicenote && (
                      <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">Voice</span>
                    )}
                  </div>
                  <p className="text-sm text-white/80">{chat.content}</p>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </ScrollArea>
          
          {/* Reply Input */}
          <div className="p-4 border-t border-white/5">
            <div className="flex gap-2">
              <Input
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Reply to chat..."
                className="bg-white/5 border-white/10 flex-1"
                onKeyPress={(e) => e.key === 'Enter' && sendReply()}
              />
              <Button onClick={sendReply} size="icon" className="bg-[#53fc18] text-black">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default RadioStudio;
