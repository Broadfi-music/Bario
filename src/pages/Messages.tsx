import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Send, Search, Settings, Radio, Sparkles, User, Users, Mic } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ALL_DEMO_SESSIONS } from '@/config/demoSessions';
import { getDemoAvatar, getRandomAvatarUrl } from '@/lib/randomAvatars';
import { useFollowSystem } from '@/hooks/useFollowSystem';
import { getFreshSession, isValidUUID, withAuthRetry } from '@/lib/authUtils';

type Profile = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type Conversation = {
  id: string;
  last_message_at: string | null;
  other_user: Profile;
  last_message?: string;
};

type Message = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

const NAV_ITEMS = [
  { icon: Radio, label: 'Home', path: '/podcasts?tab=feed' },
  { icon: Sparkles, label: 'Feed', path: '/feed' },
  { icon: User, label: 'My Page', path: '/dashboard/profile' },
];

const formatTimeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
};

const buildConversationKey = (currentUserId: string, otherUserId: string) => {
  return currentUserId < otherUserId
    ? `${currentUserId}_${otherUserId}`
    : `${otherUserId}_${currentUserId}`;
};

const Messages = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetUserId = searchParams.get('to');
  const backTarget = searchParams.get('from');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dmInitiated = useRef(false);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [suggestedCreators, setSuggestedCreators] = useState<Profile[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const goBack = () => {
    if (backTarget) {
      navigate(decodeURIComponent(backTarget));
      return;
    }
    navigate('/podcasts');
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  // Wait for auth to be fully ready
  useEffect(() => {
    if (authLoading) return;
    
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setIsReady(true);
      } else {
        setIsReady(true); // Still ready, just no user
      }
    };
    initAuth();
  }, [authLoading]);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setIsLoadingConversations(true);

    const { data: parts } = await supabase.from('conversation_participants').select('conversation_id').eq('user_id', user.id);
    if (!parts || parts.length === 0) { setConversations([]); setIsLoadingConversations(false); return; }

    const convoIds = parts.map((p: any) => p.conversation_id);
    const { data: convos } = await supabase.from('conversations').select('id, last_message_at').in('id', convoIds).order('last_message_at', { ascending: false, nullsFirst: false });
    const { data: allParts } = await supabase.from('conversation_participants').select('conversation_id, user_id').in('conversation_id', convoIds);

    const otherUserIds = [...new Set((allParts || []).filter((p: any) => p.user_id !== user.id).map((p: any) => p.user_id))] as string[];
    const { data: profiles } = otherUserIds.length ? await supabase.from('profiles').select('user_id, full_name, username, avatar_url').in('user_id', otherUserIds) : { data: [] };
    const profileMap = new Map<string, Profile>((profiles || []).map((p: any) => [p.user_id, p]));

    const { data: lastMsgs } = await supabase.from('direct_messages').select('conversation_id, content').in('conversation_id', convoIds).order('created_at', { ascending: false });
    const lastMsgMap = new Map<string, string>();
    (lastMsgs || []).forEach((m: any) => { if (!lastMsgMap.has(m.conversation_id)) lastMsgMap.set(m.conversation_id, m.content); });

    const nextConversations = (convos || []).map((c: any) => {
      const otherPart = (allParts || []).find((p: any) => p.conversation_id === c.id && p.user_id !== user.id);
      const otherProfile = otherPart ? profileMap.get(otherPart.user_id) : null;
      return {
        id: c.id,
        last_message_at: c.last_message_at,
        other_user: otherProfile || { user_id: '', full_name: 'Unknown', username: null, avatar_url: null },
        last_message: lastMsgMap.get(c.id),
      };
    });

    setConversations(nextConversations);

    if (activeConvoId) {
      const currentActive = nextConversations.find((convo) => convo.id === activeConvoId) || null;
      if (currentActive) setActiveConversation(currentActive);
    }

    setIsLoadingConversations(false);
  }, [user, activeConvoId]);

  const fetchSuggested = async () => {
    const { data } = await supabase.from('profiles').select('user_id, full_name, username, avatar_url').limit(12);
    setSuggestedCreators((data || []).filter((p: any) => p.user_id !== user?.id));
  };

  const searchCreators = async (query: string) => {
    if (!query.trim()) { setSearchResults([]); return; }
    setSearching(true);
    const { data } = await supabase.from('profiles').select('user_id, full_name, username, avatar_url').or(`full_name.ilike.%${query}%,username.ilike.%${query}%`).limit(10);
    setSearchResults((data || []).filter((p: any) => p.user_id !== user?.id));
    setSearching(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => searchCreators(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const openDmWith = useCallback(async (otherUserId: string) => {
    if (!user) {
      toast.error('Please sign in to message creators');
      navigate('/auth');
      return;
    }

    if (!isValidUUID(otherUserId)) {
      toast('This is a demo creator. Messaging is available with real creators who have signed up.');
      return;
    }

    if (user.id === otherUserId) {
      toast.error('You cannot message yourself');
      return;
    }

    try {
      const session = await getFreshSession();
      if (!session) {
        toast.error('Session expired. Please sign in again.');
        navigate('/auth');
        return;
      }

      const dmKey = buildConversationKey(user.id, otherUserId);

      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('dm_key', dmKey)
        .limit(1)
        .maybeSingle();

      if (existingConversation?.id) {
        await hydrateAndOpenConversation(existingConversation.id, otherUserId);
        return;
      }

      const { data: conversationId, error } = await supabase.rpc('start_direct_conversation', { other_user_id: otherUserId });

      if (error) {
        console.error('DM RPC error:', error);

        if (error.message?.includes('JWT') || error.code === 'PGRST303') {
          const retrySession = await getFreshSession();
          if (!retrySession) {
            toast.error('Session expired. Please sign in again.');
            navigate('/auth');
            return;
          }
          const { data: retryId, error: retryErr } = await supabase.rpc('start_direct_conversation', { other_user_id: otherUserId });
          if (retryErr || !retryId) {
            const { data: recoveredConversation } = await supabase
              .from('conversations')
              .select('id')
              .eq('dm_key', dmKey)
              .limit(1)
              .maybeSingle();

            if (recoveredConversation?.id) {
              await hydrateAndOpenConversation(recoveredConversation.id, otherUserId);
              return;
            }

            console.error('DM retry error:', retryErr);
            toast.error('Failed to start conversation. Please try again.');
            return;
          }
          await hydrateAndOpenConversation(retryId, otherUserId);
          return;
        }

        const { data: recoveredConversation } = await supabase
          .from('conversations')
          .select('id')
          .eq('dm_key', dmKey)
          .limit(1)
          .maybeSingle();

        if (recoveredConversation?.id) {
          await hydrateAndOpenConversation(recoveredConversation.id, otherUserId);
          return;
        }
        
        toast.error('Failed to start conversation. Please try again.');
        return;
      }

      if (!conversationId) {
        toast.error('Failed to create conversation');
        return;
      }

      await hydrateAndOpenConversation(conversationId, otherUserId);
    } catch (err) {
      console.error('Unexpected DM error:', err);
      toast.error('Something went wrong. Please try again.');
    }
  }, [user, navigate]);

  const hydrateAndOpenConversation = async (convoId: string, otherUserId: string) => {
    // Fetch other user's profile
    const { data: otherProfile } = await supabase
      .from('profiles')
      .select('user_id, full_name, username, avatar_url')
      .eq('user_id', otherUserId)
      .limit(1)
      .maybeSingle();

    const otherUser: Profile = otherProfile || {
      user_id: otherUserId,
      full_name: 'Creator',
      username: null,
      avatar_url: null,
    };

    const hydratedConversation: Conversation = {
      id: convoId,
      last_message_at: null,
      other_user: otherUser,
      last_message: undefined,
    };

    setConversations(prev => {
      const exists = prev.find(c => c.id === convoId);
      if (exists) return prev.map((conversation) => conversation.id === convoId ? { ...conversation, other_user: otherUser } : conversation);
      return [{
        id: convoId,
        last_message_at: null,
        other_user: otherUser,
        last_message: undefined,
      }, ...prev];
    });

    setActiveConvoId(convoId);
    setActiveConversation(hydratedConversation);
    setMessages([]);
    await fetchMessages(convoId);
    fetchConversations();
  };

  const fetchMessages = async (convoId: string) => {
    const { data } = await supabase.from('direct_messages').select('id, sender_id, content, created_at').eq('conversation_id', convoId).order('created_at', { ascending: true });
    setMessages(data || []);
  };

  const sendMessage = async () => {
    if (!user || !activeConvoId || !draft.trim()) return;

    const session = await getFreshSession();
    if (!session) {
      toast.error('Session expired. Please sign in again.');
      navigate('/auth');
      return;
    }

    const content = draft.trim();
    setSending(true);
    const optimisticId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setDraft('');

    const { data, error } = await withAuthRetry(async () => {
      const result = await supabase
        .from('direct_messages')
        .insert({ conversation_id: activeConvoId, sender_id: user.id, content })
        .select('id, sender_id, content, created_at')
        .single();
      return result as { data: { id: string; sender_id: string; content: string; created_at: string } | null; error: any };
    });

    if (error) { 
      console.error('Send message error:', error);
      setMessages(prev => prev.filter(message => message.id !== optimisticId));
      setDraft(content);
      toast.error('Failed to send message'); 
    } else { 
      if (data) {
        setMessages(prev => prev.map(message => message.id === optimisticId ? data as Message : message));
        setConversations(prev => prev.map(convo => convo.id === activeConvoId ? { ...convo, last_message: content, last_message_at: data.created_at } : convo));
        setActiveConversation(prev => prev && prev.id === activeConvoId ? { ...prev, last_message: content, last_message_at: data.created_at } : prev);
      } else {
        await fetchMessages(activeConvoId);
      }
    }
    setSending(false);
  };

  // Load conversations when auth ready
  useEffect(() => {
    if (isReady && user) {
      fetchConversations();
      fetchSuggested();
    }
  }, [isReady, user?.id]);

  // Handle ?to= param - open DM with target user
  useEffect(() => {
    if (!isReady || !user || !targetUserId || dmInitiated.current) return;
    dmInitiated.current = true;
    openDmWith(targetUserId);
  }, [isReady, user?.id, targetUserId, openDmWith]);

  // Realtime subscription for active conversation
  useEffect(() => {
    if (activeConvoId) {
      fetchMessages(activeConvoId);
      const channel = supabase.channel(`dm-${activeConvoId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `conversation_id=eq.${activeConvoId}` }, () => fetchMessages(activeConvoId)).subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [activeConvoId]);

  useEffect(() => {
    if (!activeConvoId) {
      setActiveConversation(null);
      return;
    }

    const conversation = conversations.find((item) => item.id === activeConvoId);
    if (conversation) setActiveConversation(conversation);
  }, [activeConvoId, conversations]);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading messages…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Sign in to access messages</p>
          <Link to="/auth"><Button variant="outline">Sign In</Button></Link>
        </div>
      </div>
    );
  }

  const activeConvo = activeConversation || conversations.find(c => c.id === activeConvoId);

  return (
    <div className="h-screen bg-background text-foreground flex">
      {/* Left Sidebar - Navigation */}
      <aside className="hidden xl:flex w-56 flex-col border-r border-border flex-shrink-0">
        <div className="p-4">
          <h2 className="text-sm font-bold tracking-wide">Bario</h2>
        </div>
        <nav className="flex-1 px-2 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <button key={item.label} onClick={() => navigate(item.path)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-full text-foreground/70 hover:text-foreground hover:bg-secondary transition-colors text-left">
              <item.icon className="h-5 w-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Suggested Channels</p>
          {ALL_DEMO_SESSIONS.slice(0, 4).map(s => (
            <button key={s.id} onClick={() => navigate(`/podcasts?session=${s.id}`)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-foreground/60 hover:text-foreground hover:bg-secondary/50 transition-colors text-left">
              <img src={s.hostAvatar || getDemoAvatar(s.hostName)} alt="" className="h-6 w-6 rounded-full object-cover" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] truncate">{s.hostName}</p>
                <p className="text-[9px] text-muted-foreground truncate">{s.category}</p>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Conversation List Panel */}
      <div className={`${activeConvoId ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-col border-r border-border flex-shrink-0`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <button onClick={goBack} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-secondary">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="text-base font-bold">Messages</h1>
          </div>
          <button className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-secondary">
            <Settings className="h-4 w-4 text-foreground/60" />
          </button>
        </div>

        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search people"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-secondary border-0 rounded-full text-sm text-foreground placeholder:text-muted-foreground h-10 pl-10 pr-3 focus:outline-none focus:ring-1 focus:ring-foreground/20"
            />
          </div>
        </div>

        {searchQuery.trim() && searchResults.length > 0 && (
          <div className="border-b border-border">
            {searchResults.map(p => (
              <button key={p.user_id} onClick={() => { setSearchQuery(''); openDmWith(p.user_id); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left">
                <div className="h-10 w-10 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                  {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-secondary" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{p.full_name || p.username || 'Creator'}</p>
                  {p.username && <p className="text-xs text-muted-foreground truncate">@{p.username}</p>}
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {isLoadingConversations ? (
            <div className="text-center text-sm text-muted-foreground py-10">Loading...</div>
          ) : conversations.length === 0 && !searchQuery.trim() ? (
            <div className="px-4 py-6">
              <p className="text-sm text-muted-foreground mb-4">No conversations yet. Start chatting with a creator!</p>
              <div className="space-y-1">
                {suggestedCreators.slice(0, 8).map(c => (
                  <button key={c.user_id} onClick={() => openDmWith(c.user_id)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/50 transition-colors text-left">
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                      {c.avatar_url ? <img src={c.avatar_url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-secondary" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{c.full_name || c.username || 'Creator'}</p>
                      {c.username && <p className="text-xs text-muted-foreground truncate">@{c.username}</p>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            conversations.map(convo => (
              <button
                key={convo.id}
                onClick={() => setActiveConvoId(convo.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left ${activeConvoId === convo.id ? 'bg-secondary/50' : ''}`}
              >
                <div className="h-12 w-12 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                  {convo.other_user.avatar_url ? <img src={convo.other_user.avatar_url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-secondary" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold truncate">{convo.other_user.full_name || convo.other_user.username || 'Creator'}</p>
                    {convo.last_message_at && <span className="text-[11px] text-muted-foreground flex-shrink-0">{formatTimeAgo(convo.last_message_at)}</span>}
                  </div>
                  {convo.last_message && <p className="text-xs text-muted-foreground truncate mt-0.5">{convo.last_message}</p>}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat View Panel */}
      <div className={`${activeConvoId ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0`}>
        {activeConvoId && activeConvo ? (
          <>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <button onClick={() => setActiveConvoId(null)} className="md:hidden h-8 w-8 flex items-center justify-center rounded-full hover:bg-secondary">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="h-9 w-9 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                {activeConvo.other_user.avatar_url ? <img src={activeConvo.other_user.avatar_url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-secondary" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate">{activeConvo.other_user.full_name || activeConvo.other_user.username || 'Creator'}</p>
                {activeConvo.other_user.username && <p className="text-xs text-muted-foreground">@{activeConvo.other_user.username}</p>}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 scrollbar-hide">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="h-16 w-16 rounded-full overflow-hidden bg-secondary mb-3">
                    {activeConvo.other_user.avatar_url ? <img src={activeConvo.other_user.avatar_url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-secondary" />}
                  </div>
                  <p className="font-bold text-lg">{activeConvo.other_user.full_name || activeConvo.other_user.username}</p>
                  {activeConvo.other_user.username && <p className="text-sm text-muted-foreground">@{activeConvo.other_user.username}</p>}
                  <button onClick={() => navigate(`/host/${activeConvo.other_user.user_id}`)} className="mt-2 text-xs border border-border rounded-full px-4 py-1.5 hover:bg-secondary transition-colors">
                    View Profile
                  </button>
                  <p className="text-xs text-muted-foreground mt-4">Start a conversation</p>
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.sender_id === user.id
                        ? 'bg-foreground text-background rounded-br-sm'
                        : 'bg-secondary text-foreground rounded-bl-sm'
                    }`}>
                      {msg.content}
                      <p className={`text-[10px] mt-1 ${msg.sender_id === user.id ? 'text-background/50' : 'text-muted-foreground'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-border p-3 flex items-end gap-2">
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Start a new message"
                className="flex-1 bg-secondary rounded-full text-sm text-foreground placeholder:text-muted-foreground h-10 px-4 focus:outline-none focus:ring-1 focus:ring-foreground/20"
              />
              <button onClick={sendMessage} disabled={sending || !draft.trim()} className="h-10 w-10 flex items-center justify-center rounded-full bg-foreground text-background hover:bg-foreground/90 disabled:opacity-30 transition-colors">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-sm">
              <h2 className="text-2xl font-bold mb-1">Select a message</h2>
              <p className="text-sm text-muted-foreground mb-4">Choose from your existing conversations or start a new one.</p>
              <Button variant="outline" className="rounded-full" onClick={() => document.querySelector<HTMLInputElement>('input[placeholder="Search people"]')?.focus()}>
                New message
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
