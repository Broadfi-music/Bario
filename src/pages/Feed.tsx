import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Send, ArrowLeft, Radio, Swords, Sparkles, User, Mic, Users } from 'lucide-react';
import { useFollowSystem } from '@/hooks/useFollowSystem';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ALL_DEMO_SESSIONS } from '@/config/demoSessions';
import { getDemoAvatar } from '@/lib/randomAvatars';

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

type LiveSession = {
  id: string;
  title: string;
  host_name: string;
  host_avatar: string | null;
  listener_count: number;
};

type SuggestedCreator = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
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

const NAV_ITEMS = [
  { icon: Radio, label: 'Live', path: '/podcasts?tab=live' },
  { icon: Swords, label: 'Battles', path: '/podcasts?tab=battles' },
  { icon: Sparkles, label: 'AI Remix', path: '/dashboard/create' },
  { icon: User, label: 'My Page', path: '/dashboard/profile' },
];

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
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [suggestedCreators, setSuggestedCreators] = useState<SuggestedCreator[]>([]);
  const { toggleFollow, isFollowing } = useFollowSystem();

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
    const userIds = [...new Set(postsRows.map((p: any) => p.user_id))] as string[];

    const { data: profiles } = userIds.length
      ? await db.from('profiles').select('user_id, full_name, username, avatar_url').in('user_id', userIds)
      : { data: [] };

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

  const fetchLiveSessions = async () => {
    // Always use demo sessions for Live Now sidebar
    setLiveSessions(ALL_DEMO_SESSIONS.slice(0, 4).map(s => ({
      id: s.id,
      title: s.title,
      host_name: s.hostName,
      host_avatar: s.hostAvatar || getDemoAvatar(s.hostName),
      listener_count: s.baseListenerCount + Math.floor(Math.random() * 50),
    })));
  };

  const fetchSuggestedCreators = async () => {
    const { data } = await db
      .from('profiles')
      .select('user_id, full_name, username, avatar_url')
      .limit(8);

    setSuggestedCreators(
      (data || []).filter((p: any) => p.user_id !== user?.id).slice(0, 6).map((p: any) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        username: p.username,
        avatar_url: p.avatar_url,
      }))
    );
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
        (likes || []).filter((l: any) => l.user_id === user.id).map((l: any) => l.post_id as string)
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
    const commentUserIds = [...new Set(commentRows.map((c: any) => c.user_id))] as string[];

    const { data: commentProfiles } = commentUserIds.length
      ? await db.from('profiles').select('user_id, full_name, username, avatar_url').in('user_id', commentUserIds)
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
    if (!user) { toast.error('Please sign in to like posts'); return; }
    const hasLiked = likedPostIds.has(postId);
    if (hasLiked) {
      await db.from('host_post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
      const next = new Set(likedPostIds);
      next.delete(postId);
      setLikedPostIds(next);
      setLikeCounts(prev => ({ ...prev, [postId]: Math.max((prev[postId] || 1) - 1, 0) }));
    } else {
      await db.from('host_post_likes').insert({ post_id: postId, user_id: user.id });
      const next = new Set(likedPostIds);
      next.add(postId);
      setLikedPostIds(next);
      setLikeCounts(prev => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }));
    }
  };

  const addComment = async (postId: string) => {
    if (!user) { toast.error('Please sign in to comment'); return; }
    const content = commentDrafts[postId]?.trim();
    if (!content) return;
    setSendingCommentPostId(postId);
    const { error } = await db.from('host_post_comments').insert({ post_id: postId, user_id: user.id, content });
    if (error) { toast.error('Failed to comment'); setSendingCommentPostId(null); return; }
    setCommentDrafts(prev => ({ ...prev, [postId]: '' }));
    await fetchEngagement(postIds);
    setSendingCommentPostId(null);
  };

  useEffect(() => {
    fetchPosts();
    fetchLiveSessions();
    fetchSuggestedCreators();
  }, []);

  useEffect(() => { fetchEngagement(postIds); }, [postIds.join(','), user?.id]);

  useEffect(() => {
    const channel = db
      .channel('feed-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'host_posts' }, () => fetchPosts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'host_post_likes' }, () => fetchEngagement(postIds))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'host_post_comments' }, () => fetchEngagement(postIds))
      .subscribe();
    return () => { db.removeChannel(channel); };
  }, [postIds.join(',')]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-center px-3 py-2.5 relative">
          <button
            onClick={() => navigate('/podcasts?tab=feed')}
            className="absolute left-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-foreground/70 hover:bg-secondary hover:text-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-black tracking-tight italic">Creator Feed</h1>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-3 py-3 flex gap-4">
        {/* Left Sidebar - hidden on mobile */}
        <aside className="hidden lg:block w-52 flex-shrink-0">
          <div className="sticky top-14 space-y-1">
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider px-2 mb-2">Navigate</p>
            {NAV_ITEMS.map(item => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors text-left"
              >
                <item.icon className="h-4 w-4" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            ))}

            {/* Recommended Channels */}
            <div className="mt-5 pt-4 border-t border-white/10">
              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider px-2 mb-2">Recommended</p>
              {ALL_DEMO_SESSIONS.slice(0, 5).map(session => (
                <button
                  key={session.id}
                  onClick={() => navigate(`/podcasts?session=${session.id}`)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors text-left"
                >
                  <div className="h-6 w-6 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                    <img src={session.hostAvatar || getDemoAvatar(session.hostName)} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] truncate">{session.hostName}</p>
                    <p className="text-[9px] text-white/30 truncate">{session.category}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Feed */}
        <main className="flex-1 min-w-0">
          {loading ? (
            <div className="text-center text-sm text-white/50 py-10">Loading feed...</div>
          ) : posts.length === 0 ? (
            <div className="text-center text-sm text-white/50 py-10">No posts yet.</div>
          ) : (
            <div className="space-y-2">
              {posts.map(post => {
                const postComments = commentsByPost[post.id] || [];
                const isLiked = likedPostIds.has(post.id);

                return (
                  <article key={post.id} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <button
                        onClick={() => navigate(`/host/${post.user_id}`)}
                        className="h-8 w-8 overflow-hidden rounded-full bg-white/10 flex-shrink-0"
                      >
                        {post.author_avatar ? (
                          <img src={post.author_avatar} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="h-full w-full bg-white/20" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <button onClick={() => navigate(`/host/${post.user_id}`)} className="font-semibold text-white hover:underline">
                            {post.author_name}
                          </button>
                          {post.author_username && <span className="text-white/40">@{post.author_username}</span>}
                          <span className="text-white/30">· {formatTimeAgo(post.created_at)}</span>
                        </div>

                        <p className="mt-1 whitespace-pre-wrap text-[13px] text-white/85 leading-snug">{post.content}</p>

                        {post.image_url && (
                          <div className="mt-1.5 overflow-hidden rounded-lg border border-white/10">
                            <img src={post.image_url} alt="Post" className="max-h-[300px] w-full object-cover" loading="lazy" />
                          </div>
                        )}

                        <div className="mt-1.5 flex items-center gap-4 text-[11px]">
                          <button
                            onClick={() => toggleLike(post.id)}
                            className={`inline-flex items-center gap-1 ${isLiked ? 'text-pink-400' : 'text-white/50 hover:text-pink-300'}`}
                          >
                            <Heart className={`h-3.5 w-3.5 ${isLiked ? 'fill-current' : ''}`} />
                            {likeCounts[post.id] || 0}
                          </button>
                          <span className="inline-flex items-center gap-1 text-white/50">
                            <MessageCircle className="h-3.5 w-3.5" />
                            {postComments.length}
                          </span>
                        </div>

                        {/* Compact comment input */}
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <input
                            value={commentDrafts[post.id] || ''}
                            onChange={e => setCommentDrafts(prev => ({ ...prev, [post.id]: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addComment(post.id); } }}
                            placeholder="Reply..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-full text-[11px] text-white placeholder:text-white/30 h-7 px-3 focus:outline-none focus:border-white/20"
                          />
                          <button
                            onClick={() => addComment(post.id)}
                            disabled={sendingCommentPostId === post.id || !commentDrafts[post.id]?.trim()}
                            className="h-7 w-7 flex items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 disabled:opacity-30"
                          >
                            <Send className="h-3 w-3" />
                          </button>
                        </div>

                        {postComments.length > 0 && (
                          <div className="mt-1.5 space-y-1 pl-1">
                            {postComments.slice(-3).map(comment => (
                              <div key={comment.id} className="text-[11px] text-white/70">
                                <button onClick={() => navigate(`/host/${comment.user_id}`)} className="mr-1 font-semibold text-white/90 hover:underline">
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

        {/* Right Sidebar - hidden on mobile */}
        <aside className="hidden lg:block w-60 flex-shrink-0">
          <div className="sticky top-14 space-y-5">
            {/* Live Sessions */}
            <div>
              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2">Live Now</p>
              <div className="space-y-1.5">
                {liveSessions.map(session => (
                  <button
                    key={session.id}
                    onClick={() => navigate(`/podcasts?session=${session.id}`)}
                    className="w-full flex items-center gap-2 p-2 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="h-8 w-8 rounded-full overflow-hidden bg-white/10 flex-shrink-0 relative">
                      {session.host_avatar ? (
                        <img src={session.host_avatar} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-white/20" />
                      )}
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border border-black" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-white truncate">{session.title}</p>
                      <div className="flex items-center gap-1 text-[9px] text-white/40">
                        <span>{session.host_name}</span>
                        <span>·</span>
                        <Users className="h-2.5 w-2.5" />
                        <span>{session.listener_count}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Creators to Follow */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Creators to Follow</p>
              <div className="space-y-1">
                {suggestedCreators.map(creator => (
                  <div key={creator.user_id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                    <button onClick={() => navigate(`/host/${creator.user_id}`)} className="h-8 w-8 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                      {creator.avatar_url ? <img src={creator.avatar_url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-secondary" />}
                    </button>
                    <button onClick={() => navigate(`/host/${creator.user_id}`)} className="min-w-0 flex-1 text-left">
                      <p className="text-[11px] font-medium text-foreground truncate">{creator.full_name || creator.username || 'Creator'}</p>
                      {creator.username && <p className="text-[9px] text-muted-foreground truncate">@{creator.username}</p>}
                    </button>
                    <button
                      onClick={() => toggleFollow(creator.user_id)}
                      className={`text-[9px] border rounded-full px-2 py-0.5 transition-colors ${
                        isFollowing(creator.user_id)
                          ? 'border-foreground/30 text-foreground/70 hover:border-destructive hover:text-destructive'
                          : 'border-foreground/20 text-muted-foreground hover:border-foreground/40'
                      }`}
                    >
                      {isFollowing(creator.user_id) ? 'Following' : 'Follow'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Feed;
