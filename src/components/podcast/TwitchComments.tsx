import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Send, Gift, Smile, Share2, UserPlus } from 'lucide-react';
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
  isVisible?: boolean;
  fadeTimeout?: NodeJS.Timeout;
}

interface TwitchCommentsProps {
  sessionId: string;
  hostId: string;
  onSendGift: () => void;
  sessionTitle?: string;
  isHost?: boolean;
}

const EMOJIS = ['🔥', '❤️', '👏', '😂', '🎵', '💯', '🙌', '✨'];

const getRandomUsername = (userId: string) => {
  const names = ['CryptoKing', 'MusicLover', 'BeatDrop', 'VibeCheck', 'NightOwl', 'StarGazer', 'WaveRider', 'SoundWave'];
  const index = userId.charCodeAt(0) % names.length;
  return names[index] + userId.slice(0, 3);
};

const getUserColor = (userId: string) => {
  const colors = ['text-green-400', 'text-pink-400', 'text-blue-400', 'text-yellow-400', 'text-purple-400', 'text-orange-400'];
  const index = userId.charCodeAt(0) % colors.length;
  return colors[index];
};

const TwitchComments = ({ sessionId, hostId, onSendGift, sessionTitle = '', isHost = false }: TwitchCommentsProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Fade out comment after 5 seconds (Twitch style)
  const scheduleCommentFade = (commentId: string) => {
    setTimeout(() => {
      setComments(prev => prev.map(c => 
        c.id === commentId ? { ...c, isVisible: false } : c
      ));
      // Remove after fade animation completes
      setTimeout(() => {
        setComments(prev => prev.filter(c => c.id !== commentId));
      }, 500);
    }, 5000);
  };

  // Demo comments for demo sessions
  const demoComments: Comment[] = [
    { id: 'demo-1', user_id: 'user1', content: 'This is fire! 🔥', is_emoji: false, created_at: '', isVisible: true },
    { id: 'demo-2', user_id: 'user2', content: 'Amazing show!', is_emoji: false, created_at: '', isVisible: true },
    { id: 'demo-3', user_id: 'user3', content: '❤️', is_emoji: true, created_at: '', isVisible: true },
  ];

  useEffect(() => {
    // Skip database calls for demo sessions
    if (isDemoSession(sessionId)) {
      setComments(demoComments);
      return;
    }

    const fetchComments = async () => {
      const { data, error } = await supabase
        .from('podcast_comments')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(20);
      
      if (!error && data) {
        // Mark all as visible initially
        const visibleComments = (data as Comment[]).map(c => ({ ...c, isVisible: true }));
        setComments(visibleComments);
        // Schedule fade for existing comments
        visibleComments.forEach(c => scheduleCommentFade(c.id));
      }
    };

    fetchComments();

    const channel = supabase
      .channel(`comments-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'podcast_comments',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          const newComment = { ...payload.new as Comment, isVisible: true };
          setComments(prev => [...prev.slice(-19), newComment]);
          scheduleCommentFade(newComment.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

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

    // For demo sessions, add comment locally
    if (isDemoSession(sessionId)) {
      const newLocalComment = {
        id: `local-${Date.now()}`,
        user_id: user.id,
        content: content.trim(),
        is_emoji: isEmoji,
        created_at: new Date().toISOString(),
        isVisible: true
      };
      setComments(prev => [...prev, newLocalComment]);
      scheduleCommentFade(newLocalComment.id);
      setNewComment('');
      setShowEmojis(false);
      return;
    }

    // Ensure fresh auth session
    const session = await getFreshSession();
    if (!session) {
      toast.error('Session expired. Please sign in again.');
      return;
    }

    const { error } = await supabase.from('podcast_comments').insert({
      session_id: sessionId,
      user_id: user.id,
      content: content.trim(),
      is_emoji: isEmoji
    });

    if (error) {
      console.error('Send comment error:', error);
      toast.error('Failed to send message');
    } else {
      setNewComment('');
      setShowEmojis(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendComment(newComment);
  };

  return (
    <div className="flex flex-col bg-gradient-to-t from-black via-black/95 to-transparent">
      {/* Comments List - Twitch style with fade */}
      <div className="h-32 overflow-y-auto px-3 py-1 scrollbar-hide relative">
        {comments.map((comment) => (
          <div 
            key={comment.id} 
            className={`py-0.5 transition-all duration-500 ${
              comment.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
            }`}
          >
            {comment.is_emoji ? (
              <span className="text-2xl inline-block animate-bounce">{comment.content}</span>
            ) : (
              <div className="flex items-start gap-1 bg-black/40 rounded px-2 py-1 backdrop-blur-sm">
                <span className={`text-xs font-bold ${getUserColor(comment.user_id)} shrink-0`}>
                  {getRandomUsername(comment.user_id)}:
                </span>
                <span className="text-xs text-white break-words">
                  {comment.content}
                </span>
              </div>
            )}
          </div>
        ))}
        <div ref={commentsEndRef} />
      </div>

      {/* Emoji Picker */}
      {showEmojis && (
        <div className="flex gap-2 px-3 py-1.5 bg-black/90">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => sendComment(emoji, true)}
              className="text-lg hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input Area with Request/Join buttons */}
      <form onSubmit={handleSubmit} className="flex items-center gap-1.5 px-2 py-2 bg-black">
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
              className="text-purple-400 hover:text-purple-300 h-8 w-8"
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            type="submit"
            size="sm"
            disabled={!user || !newComment.trim()}
            className="bg-[#53fc18] hover:bg-[#53fc18]/90 text-black font-semibold h-8 px-3 text-xs"
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
