import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Send, Gift, Smile, Share2, UserPlus, Reply, Sticker, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import ShareModal from './ShareModal';
import AddParticipantModal from './AddParticipantModal';
import AuthPromptModal from './AuthPromptModal';
import { getFreshSession, isDemoSession } from '@/lib/authUtils';

interface Comment {
  id: string;
  user_id: string;
  content: string;
  is_emoji: boolean;
  created_at: string;
  user_name?: string;
  fadeOut?: boolean;
}

interface TwitchCommentsProps {
  sessionId: string;
  hostId: string;
  onSendGift: () => void;
  sessionTitle?: string;
  isHost?: boolean;
}

// Message display duration in ms (10 seconds - then starts fade out)
const MESSAGE_DISPLAY_DURATION = 10000;
const MESSAGE_CLEANUP_INTERVAL = 2000; // Check every 2 seconds

// Emotes like Kick.com
const EMOTES = [
  '🔥', '❤️', '👏', '😂', '🎵', '💯', '🙌', '✨',
  '💀', '😍', '🤣', '😭', '🥺', '😎', '🤯', '💪',
  '👀', '🎉', '💔', '😈', '🥵', '🤑', '😴', '🤮',
  '👑', '💎', '🌟', '⚡', '🔊', '🎧', '🎤', '🎸',
];

// Stickers
const STICKERS = [
  '🦄', '🐱', '🐶', '🦊', '🐻', '🐼', '🦁', '🐯',
  '🦋', '🌈', '🌸', '🍕', '🍔', '🎂', '🍿', '🎮',
  '🚀', '💫', '🌙', '☀️', '🎪', '🎭', '🎨', '🎯',
];

// GIF keywords for demo
const GIFS = [
  '👍', '😢', '🤝', '💃', '🕺', '🙈', '🙉', '🙊',
  '🤖', '👻', '💅', '🦾', '🧠', '👁️', '🫀', '🫁',
];

const getRandomUsername = (userId: string) => {
  const names = ['CryptoKing', 'MusicLover', 'BeatDrop', 'VibeCheck', 'NightOwl', 'StarGazer', 'WaveRider', 'SoundWave'];
  const index = userId.charCodeAt(0) % names.length;
  return names[index] + userId.slice(0, 3);
};

const getUserColor = (userId: string) => {
  const colors = ['text-emerald-400', 'text-pink-400', 'text-blue-400', 'text-yellow-400', 'text-cyan-400', 'text-orange-400'];
  const index = userId.charCodeAt(0) % colors.length;
  return colors[index];
};

type PickerTab = 'emotes' | 'stickers' | 'gifs';

const demoComments: Comment[] = [
  { id: 'demo-1', user_id: 'user1', content: 'This is fire! 🔥', is_emoji: false, created_at: '' },
  { id: 'demo-2', user_id: 'user2', content: 'Amazing show!', is_emoji: false, created_at: '' },
  { id: 'demo-3', user_id: 'user3', content: '❤️', is_emoji: true, created_at: '' },
  { id: 'demo-4', user_id: 'user4', content: 'Love the vibes!', is_emoji: false, created_at: '' },
  { id: 'demo-5', user_id: 'user5', content: 'Keep it going!', is_emoji: false, created_at: '' },
];

const TwitchComments = ({ sessionId, hostId, onSendGift, sessionTitle = '', isHost = false }: TwitchCommentsProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const [pickerTab, setPickerTab] = useState<PickerTab>('emotes');

  useEffect(() => {
    // Skip database calls for demo sessions
    if (isDemoSession(sessionId)) {
      setComments(demoComments);
      return;
    }

    // Fetch recent comments on mount so everyone sees existing messages
    const fetchRecentComments = async () => {
      const { data } = await supabase
        .from('podcast_comments')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (data) {
        // Reverse to show oldest first, keep all messages visible
        setComments(data.reverse() as Comment[]);
      }
    };
    
    fetchRecentComments();

    // Subscribe to ALL new comments - everyone should see everyone's messages
    // CRITICAL: Use a unique channel name and subscribe to all events for REPLICA IDENTITY FULL
    const channelName = `chat-realtime-${sessionId}-${Date.now()}`;
    console.log('💬 Creating chat channel:', channelName);
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'podcast_comments',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          console.log('💬 Realtime payload received:', payload.eventType, payload);
          
          if (payload.eventType === 'INSERT') {
            const newComment = payload.new as Comment;
            console.log('💬 New comment received by all users:', newComment.content, 'from:', newComment.user_id);
            
            // Add to comments - remove local duplicate if exists
            setComments(prev => {
              // Check if this comment already exists by ID
              if (prev.some(c => c.id === newComment.id)) {
                console.log('💬 Duplicate comment, skipping');
                return prev;
              }
              // Remove any local version of this comment (matching user and content)
              const filtered = prev.filter(c => 
                !(c.id.startsWith('local-') && 
                  c.user_id === newComment.user_id && 
                  c.content === newComment.content)
              );
              // Keep last 100 messages
              const updated = [...filtered.slice(-99), newComment];
              console.log('💬 Comments updated, total:', updated.length);
              return updated;
            });
          }
        }
      )
      .subscribe((status, err) => {
        console.log('💬 Chat subscription status:', status, err ? `Error: ${err}` : '');
        if (status === 'SUBSCRIBED') {
          console.log('✅ Chat subscription active - all users will see messages');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Chat channel error, retrying in 2s...');
          setTimeout(() => {
            channel.subscribe();
          }, 2000);
        }
      });

    return () => {
      console.log('💬 Removing chat channel:', channelName);
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // Real-time message fade out like TikTok - messages disappear after 10 seconds
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setComments(prev => {
        // First, mark old messages for fadeOut
        const updated = prev.map(c => {
          if (c.id.startsWith('demo-')) return c;
          if (!c.created_at) return c;
          const age = now - new Date(c.created_at).getTime();
          // Mark for fadeout at 10 seconds
          if (age > MESSAGE_DISPLAY_DURATION && !c.fadeOut) {
            return { ...c, fadeOut: true };
          }
          return c;
        });
        
        // Then remove messages that have been fading out for 500ms+
        return updated.filter(c => {
          if (c.id.startsWith('demo-') || c.id.startsWith('local-')) return true;
          if (!c.created_at) return true;
          const age = now - new Date(c.created_at).getTime();
          // Keep messages for 11 seconds total (10s visible + 1s fade animation)
          return age < MESSAGE_DISPLAY_DURATION + 1000;
        });
      });
    }, MESSAGE_CLEANUP_INTERVAL);
    
    return () => clearInterval(cleanup);
  }, []);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

const sendComment = async (content: string, isEmoji = false) => {
    if (!user || !content.trim()) {
      if (!user) {
        setShowAuthModal(true);
        return;
      }
      return;
    }

    const commentId = `local-${Date.now()}`;
    const newLocalComment: Comment = {
      id: commentId,
      user_id: user.id,
      content: content.trim(),
      is_emoji: isEmoji,
      created_at: new Date().toISOString(),
    };

    // Add comment immediately - visible to sender
    setComments(prev => [...prev, newLocalComment]);
    setNewComment('');
    setShowEmojis(false);

    // For demo sessions, don't save to database
    if (isDemoSession(sessionId)) {
      return;
    }

    // Ensure fresh auth session
    const session = await getFreshSession();
    if (!session) {
      toast.error('Session expired. Please sign in again.');
      return;
    }

    // Save to database - realtime subscription will broadcast to all users
    const { error } = await supabase.from('podcast_comments').insert({
      session_id: sessionId,
      user_id: user.id,
      content: content.trim(),
      is_emoji: isEmoji
    });

    if (error) {
      console.error('Send comment error:', error);
      toast.error('Failed to send message');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendComment(newComment);
  };

  const handleReply = (userId: string) => {
    const username = getRandomUsername(userId);
    setNewComment(`@${username} `);
  };

  const handleUserClick = (userId: string) => {
    navigate(`/host/${userId}`);
  };

return (
    <div className="flex flex-col h-full bg-gradient-to-t from-black via-black/95 to-transparent">
      {/* Comments List - Kick.com style with 0.9s display */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-hide">
        {comments.map((comment) => (
          <div 
            key={comment.id} 
            className={`py-1 group transition-all duration-200 ${comment.fadeOut ? 'opacity-0 translate-x-4' : 'opacity-100'}`}
          >
            {comment.is_emoji ? (
              <span className="text-2xl inline-block animate-bounce">{comment.content}</span>
            ) : (
              <div className="flex items-start gap-2 bg-black/40 rounded px-2 py-1.5 backdrop-blur-sm hover:bg-black/60 transition-colors animate-in slide-in-from-right-4 duration-150">
                <div className="flex-1 min-w-0">
                  <span 
                    className={`text-xs font-bold ${getUserColor(comment.user_id)} cursor-pointer hover:underline`}
                    onClick={() => handleUserClick(comment.user_id)}
                  >
                    {getRandomUsername(comment.user_id)}:
                  </span>
                  <span className="text-xs text-white ml-1.5 break-words">
                    {comment.content}
                  </span>
                </div>
                <button
                  onClick={() => handleReply(comment.user_id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded"
                  title="Reply"
                >
                  <Reply className="h-3 w-3 text-white/60" />
                </button>
              </div>
            )}
          </div>
        ))}
        <div ref={commentsEndRef} />
      </div>

      {/* Emotes/Stickers/GIF Picker - Kick.com style */}
      {showEmojis && (
        <div className="bg-black/95 border-t border-white/10">
          {/* Tabs */}
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setPickerTab('emotes')}
              className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1.5 ${pickerTab === 'emotes' ? 'text-white border-b-2 border-white' : 'text-white/50'}`}
            >
              <Smile className="h-3.5 w-3.5" />
              Emotes
            </button>
            <button
              onClick={() => setPickerTab('stickers')}
              className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1.5 ${pickerTab === 'stickers' ? 'text-white border-b-2 border-white' : 'text-white/50'}`}
            >
              <Sticker className="h-3.5 w-3.5" />
              Stickers
            </button>
            <button
              onClick={() => setPickerTab('gifs')}
              className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1.5 ${pickerTab === 'gifs' ? 'text-white border-b-2 border-white' : 'text-white/50'}`}
            >
              <Image className="h-3.5 w-3.5" />
              GIFs
            </button>
          </div>
          
          {/* Content Grid */}
          <div className="grid grid-cols-8 gap-1 p-2 max-h-32 overflow-y-auto scrollbar-hide">
            {pickerTab === 'emotes' && EMOTES.map((emote, i) => (
              <button
                key={`emote-${i}`}
                onClick={() => sendComment(emote, true)}
                className="text-xl hover:scale-125 transition-transform p-1.5 rounded hover:bg-white/10"
              >
                {emote}
              </button>
            ))}
            {pickerTab === 'stickers' && STICKERS.map((sticker, i) => (
              <button
                key={`sticker-${i}`}
                onClick={() => sendComment(sticker, true)}
                className="text-2xl hover:scale-125 transition-transform p-1.5 rounded hover:bg-white/10"
              >
                {sticker}
              </button>
            ))}
            {pickerTab === 'gifs' && GIFS.map((gif, i) => (
              <button
                key={`gif-${i}`}
                onClick={() => sendComment(gif, true)}
                className="text-2xl hover:scale-125 transition-transform p-1.5 rounded hover:bg-white/10 animate-pulse"
              >
                {gif}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area with Request/Join buttons */}
      <form onSubmit={handleSubmit} className="flex items-center gap-1.5 px-2 py-2 bg-black shrink-0">
        {/* Message Input with Emoji Icon inside */}
        <div className="flex-1 min-w-0 relative">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={user ? "Message..." : "Login to chat"}
            disabled={!user}
            className="w-full bg-white/10 border-white/10 text-white placeholder:text-white/40 text-sm h-10 pl-10 pr-3"
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => setShowEmojis(!showEmojis)}
            className="absolute left-1 top-1/2 -translate-y-1/2 text-white/60 hover:text-white h-8 w-8"
          >
            <Smile className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Action buttons in a row */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => setShowShareModal(true)}
            className="text-white/60 hover:text-white h-8 w-8"
          >
            <Share2 className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={onSendGift}
            className="text-yellow-400 hover:text-yellow-300 h-8 w-8"
          >
            <Gift className="h-4 w-4" />
          </Button>

          {isHost && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => setShowParticipantModal(true)}
              className="text-white/60 hover:text-white h-8 w-8"
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            type="submit"
            size="sm"
            disabled={!user || !newComment.trim()}
            className="bg-black hover:bg-neutral-800 text-white font-semibold h-8 px-3 text-xs border border-white/20"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </form>

      {/* Modals */}
      <ShareModal 
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        sessionId={sessionId}
        title={sessionTitle}
      />

      <AddParticipantModal
        isOpen={showParticipantModal}
        onClose={() => setShowParticipantModal(false)}
        sessionId={sessionId}
        isHost={isHost}
      />

      <AuthPromptModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        action="send messages and reactions"
      />
    </div>
  );
};

export default TwitchComments;