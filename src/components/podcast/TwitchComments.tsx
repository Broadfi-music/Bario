import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Send, Gift, Smile, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface Comment {
  id: string;
  user_id: string;
  content: string;
  is_emoji: boolean;
  created_at: string;
}

interface TwitchCommentsProps {
  sessionId: string;
  onSendGift: () => void;
}

const EMOJIS = ['🔥', '❤️', '👏', '😂', '🎵', '💯', '🙌', '✨'];

const TwitchComments = ({ sessionId, onSendGift }: TwitchCommentsProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
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
    if (!user || !content.trim()) return;

    await supabase.from('podcast_comments').insert({
      session_id: sessionId,
      user_id: user.id,
      content: content.trim(),
      is_emoji: isEmoji
    });

    setNewComment('');
    setShowEmojis(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendComment(newComment);
  };

  const sharePodcast = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied!');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Comments List - Twitch style overlay */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 scrollbar-hide bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className={`animate-fade-in ${comment.is_emoji ? 'text-center' : ''}`}
          >
            {comment.is_emoji ? (
              <span className="text-3xl animate-bounce inline-block">{comment.content}</span>
            ) : (
              <div className="flex items-start gap-1.5 py-0.5">
                <span className="text-xs font-bold text-purple-400">
                  User{comment.user_id.slice(0, 4)}:
                </span>
                <span className="text-xs text-white/90 break-words">
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
        <div className="flex gap-2 px-3 py-2 bg-black/80 backdrop-blur-sm">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => sendComment(emoji, true)}
              className="text-2xl hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input Area - Twitch style */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 bg-black/90 backdrop-blur-sm">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => setShowEmojis(!showEmojis)}
          className="text-white/60 hover:text-white h-9 w-9"
        >
          <Smile className="h-5 w-5" />
        </Button>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={sharePodcast}
          className="text-white/60 hover:text-white h-9 w-9"
        >
          <Share2 className="h-5 w-5" />
        </Button>
        
        <Input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={user ? "Send a message..." : "Login to chat"}
          disabled={!user}
          className="flex-1 bg-white/10 border-white/10 text-white placeholder:text-white/40 text-sm h-9"
        />
        
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onSendGift}
          className="text-yellow-400 hover:text-yellow-300 h-9 w-9"
        >
          <Gift className="h-5 w-5" />
        </Button>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={sharePodcast}
          className="text-white/60 hover:text-white h-9 w-9"
        >
          <Share2 className="h-5 w-5" />
        </Button>
        
        <Button
          type="submit"
          size="icon"
          disabled={!user || !newComment.trim()}
          className="bg-purple-600 hover:bg-purple-500 h-9 w-9"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};

export default TwitchComments;
