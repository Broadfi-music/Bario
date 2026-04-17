import { useEffect, useMemo, useRef, useState } from 'react';
import { Heart, Send, Smile, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type Comment = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name: string;
  author_username: string | null;
  author_avatar: string | null;
};

interface CommentsSheetProps {
  postId: string | null;
  open: boolean;
  onClose: () => void;
  onCountChange?: (postId: string, newCount: number) => void;
}

const EMOJIS = ['❤️', '🔥', '😂', '😮', '😢', '👏', '🎵', '🙌', '💯', '✨', '🥺', '😍'];

const formatTime = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

const CommentsSheet = ({ postId, open, onClose, onCountChange }: CommentsSheetProps) => {
  const { user } = useAuth();
  const db = supabase as any;
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const fetchComments = async (pid: string) => {
    setLoading(true);
    const { data: rows } = await db
      .from('host_post_comments')
      .select('*')
      .eq('post_id', pid)
      .order('created_at', { ascending: true });

    const ids = [...new Set((rows || []).map((r: any) => r.user_id))] as string[];
    const { data: profiles } = ids.length
      ? await db.from('profiles').select('user_id, full_name, username, avatar_url').in('user_id', ids)
      : { data: [] };
    const map = new Map<string, any>((profiles || []).map((p: any) => [p.user_id, p]));

    const mapped: Comment[] = (rows || []).map((r: any) => {
      const p = map.get(r.user_id);
      return {
        id: r.id,
        user_id: r.user_id,
        content: r.content,
        created_at: r.created_at,
        author_name: p?.full_name || p?.username || 'User',
        author_username: p?.username || null,
        author_avatar: p?.avatar_url || null,
      };
    });
    setComments(mapped);
    setLoading(false);
    setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }), 50);
  };

  useEffect(() => {
    if (open && postId) {
      fetchComments(postId);
      // realtime updates
      const channel = db
        .channel(`comments-${postId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'host_post_comments', filter: `post_id=eq.${postId}` },
          () => fetchComments(postId),
        )
        .subscribe();
      return () => {
        db.removeChannel(channel);
      };
    }
    if (!open) {
      setComments([]);
      setDraft('');
      setShowEmoji(false);
    }
  }, [open, postId]);

  const sendComment = async () => {
    if (!user) {
      toast.error('Sign in to comment');
      return;
    }
    if (!postId) return;
    const content = draft.trim();
    if (!content) return;
    setSending(true);
    const { error } = await db.from('host_post_comments').insert({
      post_id: postId,
      user_id: user.id,
      content,
    });
    setSending(false);
    if (error) {
      toast.error('Failed to comment');
      return;
    }
    setDraft('');
    setShowEmoji(false);
    await fetchComments(postId);
    onCountChange?.(postId, comments.length + 1);
  };

  const insertEmoji = (e: string) => {
    setDraft((prev) => prev + e);
    inputRef.current?.focus();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-background border-t sm:border border-border sm:rounded-2xl rounded-t-2xl flex flex-col max-h-[85vh] sm:max-h-[80vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle / header */}
        <div className="flex flex-col items-center pt-2 pb-1 border-b border-border flex-shrink-0">
          <div className="w-10 h-1 bg-muted rounded-full mb-2 sm:hidden" />
          <div className="flex items-center justify-between w-full px-4 pb-2">
            <div className="w-7" />
            <h3 className="text-sm font-semibold text-foreground">Comments</h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Comment list */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {loading ? (
            <p className="text-center text-xs text-muted-foreground py-6">Loading...</p>
          ) : comments.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm font-semibold text-foreground">No comments yet</p>
              <p className="text-xs text-muted-foreground mt-1">Start the conversation.</p>
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-2.5">
                <div className="h-8 w-8 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                  {c.author_avatar ? (
                    <img src={c.author_avatar} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="h-full w-full bg-secondary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-foreground leading-snug">
                    <span className="font-semibold mr-1.5">{c.author_username || c.author_name}</span>
                    <span className="text-foreground/85">{c.content}</span>
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{formatTime(c.created_at)}</span>
                    <button className="text-[10px] text-muted-foreground font-semibold hover:text-foreground">Reply</button>
                  </div>
                </div>
                <button className="text-muted-foreground hover:text-foreground self-start mt-1">
                  <Heart className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Emoji bar */}
        {showEmoji && (
          <div className="px-3 pt-2 pb-1 flex flex-wrap gap-1 border-t border-border flex-shrink-0">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => insertEmoji(e)}
                className="text-xl hover:scale-125 transition-transform p-1"
                aria-label={`Insert ${e}`}
              >
                {e}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border p-2 flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowEmoji((s) => !s)}
            className={`flex-shrink-0 p-2 rounded-full transition-colors ${showEmoji ? 'text-foreground bg-secondary' : 'text-muted-foreground hover:text-foreground'}`}
            aria-label="Toggle emoji"
          >
            <Smile className="h-5 w-5" />
          </button>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendComment();
              }
            }}
            placeholder={user ? 'Add a comment…' : 'Sign in to comment'}
            disabled={!user}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none px-1 py-2 disabled:opacity-50"
          />
          <button
            onClick={sendComment}
            disabled={!draft.trim() || sending || !user}
            className="text-sm font-semibold text-foreground hover:opacity-70 disabled:opacity-30 disabled:cursor-not-allowed px-2"
          >
            {sending ? '…' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentsSheet;
