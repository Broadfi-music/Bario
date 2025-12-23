import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Send, Gift, Smile, Share2, UserPlus, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import ShareModal from './ShareModal';
import AddParticipantModal from './AddParticipantModal';

interface Comment {
  id: string;
  user_id: string;
  content: string;
  is_emoji: boolean;
  created_at: string;
  user_name?: string;
}

interface TwitchCommentsProps {
  sessionId: string;
  hostId: string;
  onSendGift: () => void;
  sessionTitle?: string;
  isHost?: boolean;
}

const EMOJIS = ['🔥', '❤️', '👏', '😂', '🎵', '💯', '🙌', '✨'];

// Random usernames for display
const getRandomUsername = (userId: string) => {
  const names = ['CryptoKing', 'MusicLover', 'BeatDrop', 'VibeCheck', 'NightOwl', 'StarGazer', 'WaveRider', 'SoundWave'];
  const index = userId.charCodeAt(0) % names.length;
  return names[index] + userId.slice(0, 3);
};

// Random colors for usernames (Kick.com style)
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
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchComments = async () => {
      const { data } = await supabase
        .from('podcast_comments')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(50);
      
      if (data) setComments(data as Comment[]);
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
          setComments(prev => [...prev.slice(-49), payload.new as Comment]);
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
      if (!user) toast.error('Please sign in to chat');
      return;
    }

    // Ensure fresh auth session
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      if (expiresAt - Date.now() < 5 * 60 * 1000) {
        await supabase.auth.refreshSession();
      }
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
      {/* Comments List - Kick.com style overlay */}
      <div className="h-20 overflow-y-auto px-3 py-1 scrollbar-hide">
        {comments.map((comment) => (
          <div key={comment.id} className="animate-fade-in py-0.5">
            {comment.is_emoji ? (
              <span className="text-xl inline-block">{comment.content}</span>
            ) : (
              <div className="flex items-start gap-1">
                <span className={`text-xs font-bold ${getUserColor(comment.user_id)}`}>
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

      {/* Input Area - Icons and input grouped tightly */}
      <form onSubmit={handleSubmit} className="flex items-center gap-0 px-1 py-1 bg-black">
        {/* Action icons group - no spacing */}
        <div className="flex items-center gap-0">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => setShowEmojis(!showEmojis)}
            className="text-white/60 hover:text-white h-6 w-6 shrink-0"
          >
            <Smile className="h-3 w-3" />
          </Button>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => setShowShareModal(true)}
            className="text-white/60 hover:text-white h-6 w-6 shrink-0"
          >
            <Share2 className="h-3 w-3" />
          </Button>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={onSendGift}
            className="text-yellow-400 hover:text-yellow-300 h-6 w-6 shrink-0"
          >
            <Gift className="h-3 w-3" />
          </Button>

          {isHost && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => setShowParticipantModal(true)}
              className="text-purple-400 hover:text-purple-300 h-6 w-6 shrink-0"
            >
              <UserPlus className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        {/* Comment input */}
        <Input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={user ? "Message..." : "Login to chat"}
          disabled={!user}
          className="flex-1 bg-white/10 border-white/10 text-white placeholder:text-white/40 text-xs h-6 min-w-0 px-2 mx-0.5"
        />
        
        {/* Send button */}
        <Button
          type="submit"
          size="icon"
          disabled={!user || !newComment.trim()}
          className="bg-green-600 hover:bg-green-500 h-6 w-6 shrink-0"
        >
          <Send className="h-2.5 w-2.5" />
        </Button>
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
    </div>
  );
};

export default TwitchComments;
