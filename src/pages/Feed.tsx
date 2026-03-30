import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Send, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

type CreatorPost = {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  author_name: string;
  author_username: string | null;
  author_avatar: string | null;
};

type PostComment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name: string;
  author_username: string | null;
  author_avatar: string | null;
};

const formatTimeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
};

const Feed = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const db = supabase as any;

  const [posts, setPosts] = useState<CreatorPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [commentsByPost, setCommentsByPost] = useState<Record<string, PostComment[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [sendingCommentPostId, setSendingCommentPostId] = useState<string | null>(null);

  const postIds = useMemo(() => posts.map((p) => p.id), [posts]);

  const fetchPosts = async () => {
    setLoading(true);
    const { data: postsData, error } = await db
      .from('host_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(40);

    if (error) {
      toast.error('Failed to load feed');
      setLoading(false);
      return;
    }

    const postsRows = postsData || [];
    const userIds = [...new Set(postsRows.map((p: any) => p.user_id))];

    const { data: profiles } = await db
      .from('profiles')
      .select('user_id, full_name, username, avatar_url')
      .in('user_id', userIds);

    const profileMap = new Map<string, { full_name?: string; username?: string; avatar_url?: string }>((profiles || []).map((p: any) => [p.user_id, p]));

    setPosts(
      postsRows.map((p: any) => {
        const prof = profileMap.get(p.user_id);
        return {
          id: p.id,
          user_id: p.user_id,
          content: p.content,
          image_url: p.image_url,
          created_at: p.created_at,
          author_name: prof?.full_name || prof?.username || 'Creator',
          author_username: prof?.username || null,
          author_avatar: prof?.avatar_url || null,
        };
      })
    );

    setLoading(false);
  };

  const fetchEngagement = async (ids: string[]) => {
    if (ids.length === 0) {
      setLikeCounts({});
      setLikedPostIds(new Set());
      setCommentsByPost({});
      return;
    }

    const { data: likes } = await db
      .from('host_post_likes')
      .select('post_id, user_id')
      .in('post_id', ids);

    const nextLikeCounts: Record<string, number> = {};
    (likes || []).forEach((like: any) => {
      nextLikeCounts[like.post_id] = (nextLikeCounts[like.post_id] || 0) + 1;
    });
    setLikeCounts(nextLikeCounts);

    if (user) {
      const liked = new Set<string>(
        (likes || [])
          .filter((l: any) => l.user_id === user.id)
          .map((l: any) => l.post_id as string)
      );
      setLikedPostIds(liked);
    } else {
      setLikedPostIds(new Set());
    }

    const { data: comments } = await db
      .from('host_post_comments')
      .select('*')
      .in('post_id', ids)
      .order('created_at', { ascending: true });

    const commentRows = comments || [];
    const commentUserIds = [...new Set(commentRows.map((c: any) => c.user_id))];

    const { data: commentProfiles } = commentUserIds.length
      ? await db
          .from('profiles')
          .select('user_id, full_name, username, avatar_url')
          .in('user_id', commentUserIds)
      : { data: [] };

    const commentProfileMap = new Map<string, { full_name?: string; username?: string; avatar_url?: string }>((commentProfiles || []).map((p: any) => [p.user_id, p]));
    const groupedComments: Record<string, PostComment[]> = {};

    commentRows.forEach((c: any) => {
      const profile = commentProfileMap.get(c.user_id);
      const mapped: PostComment = {
        id: c.id,
        post_id: c.post_id,
        user_id: c.user_id,
        content: c.content,
        created_at: c.created_at,
        author_name: profile?.full_name || profile?.username || 'Creator',
        author_username: profile?.username || null,
        author_avatar: profile?.avatar_url || null,
      };

      if (!groupedComments[c.post_id]) groupedComments[c.post_id] = [];
      groupedComments[c.post_id].push(mapped);
    });

    setCommentsByPost(groupedComments);
  };

  const toggleLike = async (postId: string) => {
    if (!user) {
      toast.error('Please sign in to like posts');
      return;
    }

    const hasLiked = likedPostIds.has(postId);
    if (hasLiked) {
      const { error } = await db
        .from('host_post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);

      if (error) {
        toast.error('Failed to unlike');
        return;
      }

      const next = new Set(likedPostIds);
      next.delete(postId);
      setLikedPostIds(next);
      setLikeCounts((prev) => ({ ...prev, [postId]: Math.max((prev[postId] || 1) - 1, 0) }));
      return;
    }

    const { error } = await db.from('host_post_likes').insert({ post_id: postId, user_id: user.id });
    if (error) {
      toast.error('Failed to like post');
      return;
    }

    const next = new Set(likedPostIds);
    next.add(postId);
    setLikedPostIds(next);
    setLikeCounts((prev) => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }));
  };

  const addComment = async (postId: string) => {
    if (!user) {
      toast.error('Please sign in to comment');
      return;
    }

    const content = commentDrafts[postId]?.trim();
    if (!content) return;

    setSendingCommentPostId(postId);
    const { error } = await db.from('host_post_comments').insert({ post_id: postId, user_id: user.id, content });

    if (error) {
      toast.error('Failed to comment');
      setSendingCommentPostId(null);
      return;
    }

    setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
    await fetchEngagement(postIds);
    setSendingCommentPostId(null);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    fetchEngagement(postIds);
  }, [postIds.join(','), user?.id]);

  useEffect(() => {
    const channel = db
      .channel('feed-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'host_posts' }, () => fetchPosts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'host_post_likes' }, () => fetchEngagement(postIds))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'host_post_comments' }, () => fetchEngagement(postIds))
      .subscribe();

    return () => {
      db.removeChannel(channel);
    };
  }, [postIds.join(',')]);

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-3 py-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/podcasts?tab=feed')}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="text-sm font-semibold">Creator Feed</h1>
          </div>
          <Link to="/messages" className="text-xs text-white/70 hover:text-white">
            Open DMs
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-3 py-3">
        {loading ? (
          <div className="text-center text-sm text-white/50 py-10">Loading feed...</div>
        ) : posts.length === 0 ? (
          <div className="text-center text-sm text-white/50 py-10">No posts yet.</div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => {
              const postComments = commentsByPost[post.id] || [];
              const isLiked = likedPostIds.has(post.id);

              return (
                <article key={post.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-start gap-2.5">
                    <button
                      onClick={() => navigate(`/host/${post.user_id}`)}
                      className="h-10 w-10 overflow-hidden rounded-full bg-white/10"
                      aria-label="Open creator profile"
                    >
                      {post.author_avatar ? (
                        <img src={post.author_avatar} alt={post.author_name} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="h-full w-full bg-white/20" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-xs">
                        <button onClick={() => navigate(`/host/${post.user_id}`)} className="font-semibold text-white hover:underline">
                          {post.author_name}
                        </button>
                        {post.author_username && <span className="text-white/40">@{post.author_username}</span>}
                        <span className="text-white/30">· {formatTimeAgo(post.created_at)}</span>
                      </div>

                      <p className="mt-1.5 whitespace-pre-wrap text-sm text-white/85">{post.content}</p>

                      {post.image_url && (
                        <div className="mt-2 overflow-hidden rounded-lg border border-white/10">
                          <img src={post.image_url} alt="Post" className="max-h-[420px] w-full object-cover" loading="lazy" />
                        </div>
                      )}

                      <div className="mt-2 flex items-center gap-5 text-xs">
                        <button
                          onClick={() => toggleLike(post.id)}
                          className={`inline-flex items-center gap-1 ${isLiked ? 'text-pink-400' : 'text-white/50 hover:text-pink-300'}`}
                        >
                          <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                          {likeCounts[post.id] || 0}
                        </button>
                        <span className="inline-flex items-center gap-1 text-white/50">
                          <MessageCircle className="h-4 w-4" />
                          {postComments.length}
                        </span>
                      </div>

                      <div className="mt-2 flex items-start gap-2">
                        <Textarea
                          value={commentDrafts[post.id] || ''}
                          onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                          placeholder="Write a comment..."
                          className="min-h-[64px] bg-black/40 text-sm"
                        />
                        <Button
                          onClick={() => addComment(post.id)}
                          disabled={sendingCommentPostId === post.id}
                          size="sm"
                          className="h-10"
                        >
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {postComments.length > 0 && (
                        <div className="mt-2 space-y-1.5 rounded-lg border border-white/10 bg-black/30 p-2">
                          {postComments.slice(-4).map((comment) => (
                            <div key={comment.id} className="text-xs text-white/80">
                              <button
                                onClick={() => navigate(`/host/${comment.user_id}`)}
                                className="mr-1 font-semibold hover:underline"
                              >
                                {comment.author_name}
                              </button>
                              {comment.content}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Feed;