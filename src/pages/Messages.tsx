import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Send, Search, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

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

const Messages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetUserId = searchParams.get('to');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [suggestedCreators, setSuggestedCreators] = useState<Profile[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ id: string; sender_id: string; content: string; created_at: string }[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const db = supabase as any;

  // Fetch conversations
  const fetchConversations = async () => {
    if (!user) return;
    setLoading(true);

    const { data: parts } = await db
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (!parts || parts.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const convoIds = parts.map((p: any) => p.conversation_id);

    const { data: convos } = await db
      .from('conversations')
      .select('id, last_message_at')
      .in('id', convoIds)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    // Get other participants
    const { data: allParts } = await db
      .from('conversation_participants')
      .select('conversation_id, user_id')
      .in('conversation_id', convoIds);

    const otherUserIds = [...new Set(
      (allParts || [])
        .filter((p: any) => p.user_id !== user.id)
        .map((p: any) => p.user_id)
    )] as string[];

    const { data: profiles } = otherUserIds.length
      ? await db.from('profiles').select('user_id, full_name, username, avatar_url').in('user_id', otherUserIds)
      : { data: [] };

    const profileMap = new Map<string, Profile>((profiles || []).map((p: any) => [p.user_id, p]));

    // Get last message per convo
    const { data: lastMsgs } = await db
      .from('direct_messages')
      .select('conversation_id, content')
      .in('conversation_id', convoIds)
      .order('created_at', { ascending: false })
      .limit(convoIds.length);

    const lastMsgMap = new Map<string, string>();
    (lastMsgs || []).forEach((m: any) => {
      if (!lastMsgMap.has(m.conversation_id)) lastMsgMap.set(m.conversation_id, m.content);
    });

    const convoList: Conversation[] = (convos || []).map((c: any) => {
      const otherPart = (allParts || []).find((p: any) => p.conversation_id === c.id && p.user_id !== user.id);
      const otherProfile = otherPart ? profileMap.get(otherPart.user_id) : null;
      return {
        id: c.id,
        last_message_at: c.last_message_at,
        other_user: otherProfile || { user_id: '', full_name: 'Unknown', username: null, avatar_url: null },
        last_message: lastMsgMap.get(c.id),
      };
    });

    setConversations(convoList);
    setLoading(false);
  };

  // Fetch suggested creators
  const fetchSuggested = async () => {
    const { data } = await db
      .from('profiles')
      .select('user_id, full_name, username, avatar_url')
      .limit(12);
    setSuggestedCreators(
      (data || []).filter((p: any) => p.user_id !== user?.id).map((p: any) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        username: p.username,
        avatar_url: p.avatar_url,
      }))
    );
  };

  // Open or create DM with a user
  const openDmWith = async (otherUserId: string) => {
    if (!user) return;

    const dmKey = [user.id, otherUserId].sort().join('_');

    // Check existing
    const { data: existing } = await db
      .from('conversations')
      .select('id')
      .eq('dm_key', dmKey)
      .limit(1);

    if (existing && existing.length > 0) {
      setActiveConvoId(existing[0].id);
      return;
    }

    // Create new
    const { data: newConvo, error } = await db
      .from('conversations')
      .insert({ created_by: user.id, dm_key: dmKey })
      .select('id')
      .single();

    if (error || !newConvo) {
      toast.error('Failed to start conversation');
      return;
    }

    // Add participants
    await db.from('conversation_participants').insert([
      { conversation_id: newConvo.id, user_id: user.id },
      { conversation_id: newConvo.id, user_id: otherUserId },
    ]);

    setActiveConvoId(newConvo.id);
    await fetchConversations();
  };

  // Fetch messages for active convo
  const fetchMessages = async (convoId: string) => {
    const { data } = await db
      .from('direct_messages')
      .select('id, sender_id, content, created_at')
      .eq('conversation_id', convoId)
      .order('created_at', { ascending: true });
    setMessages(data || []);
  };

  // Send message
  const sendMessage = async () => {
    if (!user || !activeConvoId || !draft.trim()) return;
    setSending(true);
    const { error } = await db.from('direct_messages').insert({
      conversation_id: activeConvoId,
      sender_id: user.id,
      content: draft.trim(),
    });
    if (error) {
      toast.error('Failed to send');
    } else {
      setDraft('');
      await fetchMessages(activeConvoId);
    }
    setSending(false);
  };

  useEffect(() => {
    if (user) {
      fetchConversations();
      fetchSuggested();
    }
  }, [user?.id]);

  useEffect(() => {
    if (targetUserId && user) {
      openDmWith(targetUserId);
    }
  }, [targetUserId, user?.id]);

  useEffect(() => {
    if (activeConvoId) {
      fetchMessages(activeConvoId);

      const channel = db
        .channel(`dm-${activeConvoId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `conversation_id=eq.${activeConvoId}` }, () => {
          fetchMessages(activeConvoId);
        })
        .subscribe();

      return () => { db.removeChannel(channel); };
    }
  }, [activeConvoId]);

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 mb-4">Sign in to access messages</p>
          <Link to="/auth"><Button>Sign In</Button></Link>
        </div>
      </div>
    );
  }

  const activeConvo = conversations.find(c => c.id === activeConvoId);

  const filteredCreators = searchQuery
    ? suggestedCreators.filter(c =>
        (c.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.username || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : suggestedCreators;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-3 py-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => activeConvoId ? setActiveConvoId(null) : navigate('/podcasts?tab=feed')}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="text-sm font-semibold">
              {activeConvoId && activeConvo ? (activeConvo.other_user.full_name || activeConvo.other_user.username || 'Chat') : 'Messages'}
            </h1>
          </div>
        </div>
      </header>

      {activeConvoId ? (
        /* Chat View */
        <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full">
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {messages.length === 0 ? (
              <p className="text-center text-white/40 text-sm py-10">No messages yet. Say hello!</p>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                    msg.sender_id === user.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-white/10 text-white'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-white/10 p-3 flex items-end gap-2">
            <Textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Type a message..."
              className="min-h-[44px] max-h-[120px] bg-white/5 text-sm resize-none"
            />
            <Button onClick={sendMessage} disabled={sending || !draft.trim()} size="sm" className="h-10">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        /* Inbox View */
        <div className="max-w-5xl mx-auto w-full px-3 py-3">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
              type="text"
              placeholder="Search creators..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 h-10 pl-10 pr-3 focus:outline-none focus:border-white/30"
            />
          </div>

          {/* Existing conversations */}
          {conversations.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Conversations</h2>
              <div className="space-y-1">
                {conversations.map(convo => (
                  <button
                    key={convo.id}
                    onClick={() => setActiveConvoId(convo.id)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                      {convo.other_user.avatar_url ? (
                        <img src={convo.other_user.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-white/20" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">
                        {convo.other_user.full_name || convo.other_user.username || 'Creator'}
                      </p>
                      {convo.last_message && (
                        <p className="text-xs text-white/40 truncate">{convo.last_message}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Suggested creators */}
          <div>
            <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
              {conversations.length > 0 ? 'Start a new chat' : 'Creators to message'}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {filteredCreators.map(creator => (
                <button
                  key={creator.user_id}
                  onClick={() => openDmWith(creator.user_id)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="h-12 w-12 rounded-full overflow-hidden bg-white/10">
                    {creator.avatar_url ? (
                      <img src={creator.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-white/20" />
                    )}
                  </div>
                  <div className="text-center min-w-0 w-full">
                    <p className="text-xs font-medium text-white truncate">{creator.full_name || creator.username || 'Creator'}</p>
                    {creator.username && <p className="text-[10px] text-white/40 truncate">@{creator.username}</p>}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-primary">
                    <Plus className="h-3 w-3" /> Message
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
