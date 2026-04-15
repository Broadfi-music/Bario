import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Send, Search, Swords, Image, Mic, MicOff, X, Play, Pause, Radio, Sparkles, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ALL_DEMO_SESSIONS } from '@/config/demoSessions';
import { getDemoAvatar } from '@/lib/randomAvatars';
import { getFreshSession, isValidUUID, withAuthRetry } from '@/lib/authUtils';
import BattleInviteModal from '@/components/podcast/BattleInviteModal';

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
  return `${Math.floor(days / 7)}w`;
};

const buildConversationKey = (a: string, b: string) => a < b ? `${a}_${b}` : `${b}_${a}`;

const Messages = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetUserId = searchParams.get('to');
  const backTarget = searchParams.get('from');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dmInitiated = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Voice note state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Image upload state
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);

  // Battle invite
  const [showBattleInvite, setShowBattleInvite] = useState(false);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const goBack = () => {
    if (backTarget) { navigate(decodeURIComponent(backTarget)); return; }
    navigate('/podcasts?tab=feed');
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    if (authLoading) return;
    const initAuth = async () => {
      await supabase.auth.getSession();
      setIsReady(true);
    };
    initAuth();
  }, [authLoading]);

  // ---- Voice Recording ----
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  };

  const cancelRecording = () => {
    if (isRecording) { mediaRecorderRef.current?.stop(); setIsRecording(false); if (recordingTimerRef.current) clearInterval(recordingTimerRef.current); }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
  };

  const togglePreview = () => {
    if (!audioUrl) return;
    if (isPlayingPreview) { audioPreviewRef.current?.pause(); setIsPlayingPreview(false); }
    else { audioPreviewRef.current = new Audio(audioUrl); audioPreviewRef.current.onended = () => setIsPlayingPreview(false); audioPreviewRef.current.play(); setIsPlayingPreview(true); }
  };

  // ---- Image Upload ----
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedImages.length > 5) { toast.error('Max 5 images'); return; }
    const newImages = [...selectedImages, ...files].slice(0, 5);
    setSelectedImages(newImages);
    setImagePreviewUrls(newImages.map(f => URL.createObjectURL(f)));
    e.target.value = '';
  };

  const removeImage = (idx: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== idx));
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== idx));
  };

  // ---- Send Message (text, voice, images) ----
  const sendMessage = async () => {
    if (!user || !activeConvoId) return;
    const hasContent = draft.trim() || audioBlob || selectedImages.length > 0;
    if (!hasContent) return;

    const session = await getFreshSession();
    if (!session) { toast.error('Session expired'); navigate('/auth'); return; }

    setSending(true);
    let content = draft.trim();

    // Upload images
    if (selectedImages.length > 0) {
      const urls: string[] = [];
      for (const img of selectedImages) {
        const ext = img.name.split('.').pop() || 'jpg';
        const path = `dm/${activeConvoId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from('user-uploads').upload(path, img);
        if (!error) {
          const { data: urlData } = supabase.storage.from('user-uploads').getPublicUrl(path);
          urls.push(urlData.publicUrl);
        }
      }
      if (urls.length) content = (content ? content + '\n' : '') + urls.map(u => `[img]${u}[/img]`).join('\n');
    }

    // Upload voice note
    if (audioBlob) {
      const path = `dm/${activeConvoId}/voice-${Date.now()}.webm`;
      const { error } = await supabase.storage.from('user-uploads').upload(path, audioBlob);
      if (!error) {
        const { data: urlData } = supabase.storage.from('user-uploads').getPublicUrl(path);
        content = (content ? content + '\n' : '') + `[voice]${urlData.publicUrl}[/voice]`;
      }
    }

    if (!content) { setSending(false); return; }

    const optimisticId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, { id: optimisticId, sender_id: user.id, content, created_at: new Date().toISOString() }]);
    setDraft('');
    setSelectedImages([]);
    setImagePreviewUrls([]);
    setAudioBlob(null);
    setAudioUrl(null);

    const { data, error } = await withAuthRetry(async () => {
      const result = await supabase.from('direct_messages').insert({ conversation_id: activeConvoId, sender_id: user.id, content }).select('id, sender_id, content, created_at').single();
      return result as { data: Message | null; error: any };
    });

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      setDraft(content);
      toast.error('Failed to send');
    } else if (data) {
      setMessages(prev => prev.map(m => m.id === optimisticId ? data : m));
      setConversations(prev => prev.map(c => c.id === activeConvoId ? { ...c, last_message: content, last_message_at: data.created_at } : c));
    }
    setSending(false);
  };

  // ---- Data fetching (same logic, condensed) ----
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setIsLoadingConversations(true);
    const { data: parts } = await supabase.from('conversation_participants').select('conversation_id').eq('user_id', user.id);
    if (!parts?.length) { setConversations([]); setIsLoadingConversations(false); return; }
    const convoIds = parts.map(p => p.conversation_id);
    const { data: convos } = await supabase.from('conversations').select('id, last_message_at').in('id', convoIds).order('last_message_at', { ascending: false, nullsFirst: false });
    const { data: allParts } = await supabase.from('conversation_participants').select('conversation_id, user_id').in('conversation_id', convoIds);
    const otherUserIds = [...new Set((allParts || []).filter(p => p.user_id !== user.id).map(p => p.user_id))];
    const { data: profiles } = otherUserIds.length ? await supabase.from('profiles').select('user_id, full_name, username, avatar_url').in('user_id', otherUserIds) : { data: [] };
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    const { data: lastMsgs } = await supabase.from('direct_messages').select('conversation_id, content').in('conversation_id', convoIds).order('created_at', { ascending: false });
    const lastMsgMap = new Map<string, string>();
    (lastMsgs || []).forEach(m => { if (!lastMsgMap.has(m.conversation_id)) lastMsgMap.set(m.conversation_id, m.content); });
    const next = (convos || []).map(c => {
      const otherPart = (allParts || []).find(p => p.conversation_id === c.id && p.user_id !== user.id);
      return { id: c.id, last_message_at: c.last_message_at, other_user: (otherPart ? profileMap.get(otherPart.user_id) : null) || { user_id: '', full_name: 'Unknown', username: null, avatar_url: null }, last_message: lastMsgMap.get(c.id) };
    });
    setConversations(next);
    if (activeConvoId) { const a = next.find(c => c.id === activeConvoId); if (a) setActiveConversation(a); }
    setIsLoadingConversations(false);
  }, [user, activeConvoId]);

  const fetchSuggested = async () => {
    const { data } = await supabase.from('profiles').select('user_id, full_name, username, avatar_url').limit(12);
    setSuggestedCreators((data || []).filter(p => p.user_id !== user?.id));
  };

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase.from('profiles').select('user_id, full_name, username, avatar_url').or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`).limit(10);
      setSearchResults((data || []).filter(p => p.user_id !== user?.id));
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => { dmInitiated.current = false; }, [targetUserId]);

  const openDmWith = useCallback(async (otherUserId: string) => {
    if (!user) { toast.error('Please sign in'); navigate('/auth'); return; }
    if (!isValidUUID(otherUserId)) { toast('Demo creator — messaging available with real creators.'); return; }
    if (user.id === otherUserId) { toast.error('Cannot message yourself'); return; }
    try {
      const session = await getFreshSession();
      if (!session) { toast.error('Session expired'); navigate('/auth'); return; }
      const dmKey = buildConversationKey(user.id, otherUserId);
      const { data: existing } = await supabase.from('conversations').select('id').eq('dm_key', dmKey).limit(1).maybeSingle();
      if (existing?.id) { await hydrateAndOpen(existing.id, otherUserId); return; }
      const { data: rpcId, error } = await withAuthRetry(async () => { const r = await supabase.rpc('start_direct_conversation', { other_user_id: otherUserId }); return { data: r.data as string | null, error: r.error }; });
      if (!rpcId && !error) { /* fallback */ const { data: p } = await supabase.from('conversation_participants').select('conversation_id').eq('user_id', user.id); const myIds = (p || []).map(x => x.conversation_id); if (myIds.length) { const { data: s } = await supabase.from('conversation_participants').select('conversation_id').eq('user_id', otherUserId).in('conversation_id', myIds).limit(1); if (s?.[0]) { await hydrateAndOpen(s[0].conversation_id, otherUserId); return; } } }
      if (rpcId) await hydrateAndOpen(rpcId, otherUserId);
      else toast.error('Failed to start conversation');
    } catch { toast.error('Something went wrong'); }
  }, [user, navigate]);

  const hydrateAndOpen = async (convoId: string, otherUserId: string) => {
    const { data: p } = await supabase.from('profiles').select('user_id, full_name, username, avatar_url').eq('user_id', otherUserId).limit(1).maybeSingle();
    const otherUser: Profile = p || { user_id: otherUserId, full_name: 'Creator', username: null, avatar_url: null };
    const hydrated: Conversation = { id: convoId, last_message_at: null, other_user: otherUser };
    setConversations(prev => { const e = prev.find(c => c.id === convoId); if (e) return prev.map(c => c.id === convoId ? { ...c, other_user: otherUser } : c); return [hydrated, ...prev]; });
    setActiveConvoId(convoId);
    setActiveConversation(hydrated);
    setMessages([]);
    await fetchMsgs(convoId);
    fetchConversations();
  };

  const fetchMsgs = async (convoId: string) => {
    const { data } = await supabase.from('direct_messages').select('id, sender_id, content, created_at').eq('conversation_id', convoId).order('created_at', { ascending: true });
    setMessages(data || []);
  };

  useEffect(() => { if (isReady && user) { fetchConversations(); fetchSuggested(); } }, [isReady, user?.id]);
  useEffect(() => { if (!isReady || !user || !targetUserId || dmInitiated.current) return; dmInitiated.current = true; openDmWith(targetUserId); }, [isReady, user?.id, targetUserId, openDmWith]);
  useEffect(() => {
    if (activeConvoId) { fetchMsgs(activeConvoId); const ch = supabase.channel(`dm-${activeConvoId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `conversation_id=eq.${activeConvoId}` }, () => fetchMsgs(activeConvoId)).subscribe(); return () => { supabase.removeChannel(ch); }; }
  }, [activeConvoId]);
  useEffect(() => { if (!activeConvoId) { setActiveConversation(null); return; } const c = conversations.find(x => x.id === activeConvoId); if (c) setActiveConversation(c); }, [activeConvoId, conversations]);

  // ---- Message content renderer ----
  const renderMessageContent = (content: string, isMine: boolean) => {
    const parts = content.split(/(\[img\].*?\[\/img\]|\[voice\].*?\[\/voice\])/g);
    return parts.map((part, i) => {
      const imgMatch = part.match(/\[img\](.*?)\[\/img\]/);
      if (imgMatch) return <img key={i} src={imgMatch[1]} alt="" className="rounded-xl max-w-[200px] max-h-[200px] object-cover mt-1 cursor-pointer" onClick={() => window.open(imgMatch[1], '_blank')} />;
      const voiceMatch = part.match(/\[voice\](.*?)\[\/voice\]/);
      if (voiceMatch) return <VoicePlayer key={i} url={voiceMatch[1]} isMine={isMine} />;
      if (part.trim()) return <span key={i}>{part}</span>;
      return null;
    });
  };

  if (!isReady) return <div className="min-h-screen bg-black text-white flex items-center justify-center font-['Space_Grotesk']"><div className="animate-pulse text-white/40">Loading…</div></div>;
  if (!user) return <div className="min-h-screen bg-black text-white flex items-center justify-center font-['Space_Grotesk']"><div className="text-center"><p className="text-white/50 mb-4">Sign in to access messages</p><Link to="/auth"><Button variant="outline" className="rounded-full border-white/20 text-white">Sign In</Button></Link></div></div>;

  const activeConvo = activeConversation || conversations.find(c => c.id === activeConvoId);

  return (
    <div className="h-screen bg-black text-white flex font-['Space_Grotesk']">
      {/* Left Sidebar */}
      <aside className="hidden xl:flex w-56 flex-col border-r border-white/5 flex-shrink-0 bg-[#050505]">
        <div className="p-4"><h2 className="text-sm font-bold tracking-widest uppercase text-white/80">Bario</h2></div>
        <nav className="flex-1 px-2 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <button key={item.label} onClick={() => navigate(item.path)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all text-left">
              <item.icon className="h-5 w-5" /><span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="border-t border-white/5 p-3">
          <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">Channels</p>
          {ALL_DEMO_SESSIONS.slice(0, 4).map(s => (
            <button key={s.id} onClick={() => navigate(`/podcasts?session=${s.id}`)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all text-left">
              <img src={s.hostAvatar || getDemoAvatar(s.hostName)} alt="" className="h-6 w-6 rounded-full object-cover" />
              <div className="min-w-0 flex-1"><p className="text-[11px] truncate">{s.hostName}</p></div>
            </button>
          ))}
        </div>
      </aside>

      {/* Conversation List */}
      <div className={`${activeConvoId ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-col border-r border-white/5 flex-shrink-0 bg-[#0a0a0a]`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors"><ArrowLeft className="h-4 w-4 text-white/60" /></button>
            <h1 className="text-lg font-bold tracking-tight">Messages</h1>
          </div>
        </div>

        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input type="text" placeholder="Search creators…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/5 rounded-2xl text-sm text-white placeholder:text-white/30 h-10 pl-10 pr-3 focus:outline-none focus:border-white/20 transition-colors" />
          </div>
        </div>

        {searchQuery.trim() && searchResults.length > 0 && (
          <div className="border-b border-white/5">
            {searchResults.map(p => (
              <button key={p.user_id} onClick={() => { setSearchQuery(''); openDmWith(p.user_id); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left">
                <div className="h-11 w-11 rounded-full overflow-hidden bg-white/10 flex-shrink-0 ring-1 ring-white/10">
                  {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-gradient-to-br from-purple-600 to-pink-500" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{p.full_name || p.username || 'Creator'}</p>
                  {p.username && <p className="text-xs text-white/30 truncate">@{p.username}</p>}
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {isLoadingConversations ? (
            <div className="text-center text-sm text-white/30 py-10">Loading…</div>
          ) : conversations.length === 0 && !searchQuery.trim() ? (
            <div className="px-4 py-6">
              <p className="text-sm text-white/40 mb-4">No conversations yet. Start chatting!</p>
              <div className="space-y-0.5">
                {suggestedCreators.slice(0, 8).map(c => (
                  <button key={c.user_id} onClick={() => openDmWith(c.user_id)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left group">
                    <div className="h-11 w-11 rounded-full overflow-hidden bg-white/10 flex-shrink-0 ring-1 ring-white/5 group-hover:ring-white/20 transition-all">
                      {c.avatar_url ? <img src={c.avatar_url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-gradient-to-br from-emerald-500 to-cyan-500" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{c.full_name || c.username || 'Creator'}</p>
                      {c.username && <p className="text-xs text-white/25 truncate">@{c.username}</p>}
                    </div>
                    <span className="text-[10px] text-white/20 group-hover:text-white/40 transition-colors">Message</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            conversations.map(convo => (
              <button key={convo.id} onClick={() => setActiveConvoId(convo.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-all text-left border-l-2 ${activeConvoId === convo.id ? 'bg-white/5 border-l-white' : 'border-l-transparent'}`}>
                <div className="relative">
                  <div className="h-12 w-12 rounded-full overflow-hidden bg-white/10 flex-shrink-0 ring-1 ring-white/10">
                    {convo.other_user.avatar_url ? <img src={convo.other_user.avatar_url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-gradient-to-br from-violet-500 to-fuchsia-500" />}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold truncate">{convo.other_user.full_name || convo.other_user.username || 'Creator'}</p>
                    {convo.last_message_at && <span className="text-[10px] text-white/25 flex-shrink-0 font-mono">{formatTimeAgo(convo.last_message_at)}</span>}
                  </div>
                  {convo.last_message && <p className="text-xs text-white/35 truncate mt-0.5">{convo.last_message.replace(/\[img\].*?\[\/img\]/g, '📷').replace(/\[voice\].*?\[\/voice\]/g, '🎤')}</p>}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <div className={`${activeConvoId ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0 bg-[#050505]`}>
        {activeConvoId && activeConvo ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl">
              <button onClick={() => setActiveConvoId(null)} className="md:hidden h-8 w-8 flex items-center justify-center rounded-full hover:bg-white/10"><ArrowLeft className="h-4 w-4" /></button>
              <button onClick={() => navigate(`/host/${activeConvo.other_user.user_id}`)} className="h-10 w-10 rounded-full overflow-hidden bg-white/10 flex-shrink-0 ring-2 ring-white/10 hover:ring-white/30 transition-all">
                {activeConvo.other_user.avatar_url ? <img src={activeConvo.other_user.avatar_url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-gradient-to-br from-purple-500 to-pink-500" />}
              </button>
              <button onClick={() => navigate(`/host/${activeConvo.other_user.user_id}`)} className="min-w-0 flex-1 text-left hover:opacity-80 transition-opacity">
                <p className="text-sm font-bold truncate">{activeConvo.other_user.full_name || activeConvo.other_user.username || 'Creator'}</p>
                {activeConvo.other_user.username && <p className="text-[11px] text-white/30 font-mono">@{activeConvo.other_user.username}</p>}
              </button>
              {/* Battle from DM */}
              <button onClick={() => setShowBattleInvite(true)} className="h-9 w-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-yellow-500/20 text-white/50 hover:text-yellow-400 transition-all" title="Start Battle">
                <Swords className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 scrollbar-hide" style={{ backgroundImage: 'radial-gradient(circle at 50% 100%, rgba(255,255,255,0.02), transparent 70%)' }}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="h-20 w-20 rounded-full overflow-hidden bg-white/5 mb-4 ring-2 ring-white/10">
                    {activeConvo.other_user.avatar_url ? <img src={activeConvo.other_user.avatar_url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-gradient-to-br from-purple-500 to-pink-500" />}
                  </div>
                  <p className="font-bold text-xl">{activeConvo.other_user.full_name || activeConvo.other_user.username}</p>
                  {activeConvo.other_user.username && <p className="text-sm text-white/30 font-mono mt-0.5">@{activeConvo.other_user.username}</p>}
                  <button onClick={() => navigate(`/host/${activeConvo.other_user.user_id}`)} className="mt-3 text-xs border border-white/10 rounded-full px-5 py-2 hover:bg-white/5 transition-all text-white/60 hover:text-white">
                    View Profile
                  </button>
                  <p className="text-xs text-white/20 mt-6 italic">Say something creative ✨</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMine = msg.sender_id === user.id;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-200`}>
                      {!isMine && (
                        <button onClick={() => navigate(`/host/${activeConvo.other_user.user_id}`)} className="h-7 w-7 rounded-full overflow-hidden bg-white/10 mr-2 mt-auto flex-shrink-0 hover:ring-1 hover:ring-white/20 transition-all">
                          {activeConvo.other_user.avatar_url ? <img src={activeConvo.other_user.avatar_url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-gradient-to-br from-purple-500 to-pink-500" />}
                        </button>
                      )}
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                        isMine ? 'bg-white text-black rounded-br-md' : 'bg-white/8 text-white rounded-bl-md border border-white/5'
                      }`}>
                        <div className="space-y-1">{renderMessageContent(msg.content, isMine)}</div>
                        <p className={`text-[10px] mt-1 font-mono ${isMine ? 'text-black/40' : 'text-white/25'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Image previews */}
            {imagePreviewUrls.length > 0 && (
              <div className="px-4 py-2 border-t border-white/5 flex gap-2 overflow-x-auto">
                {imagePreviewUrls.map((url, i) => (
                  <div key={i} className="relative flex-shrink-0">
                    <img src={url} alt="" className="h-16 w-16 rounded-xl object-cover ring-1 ring-white/10" />
                    <button onClick={() => removeImage(i)} className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center"><X className="h-3 w-3 text-white" /></button>
                  </div>
                ))}
              </div>
            )}

            {/* Voice recording preview */}
            {(isRecording || audioBlob) && (
              <div className="px-4 py-2 border-t border-white/5 flex items-center gap-3">
                {isRecording ? (
                  <>
                    <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm font-mono text-red-400">{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
                    <div className="flex-1" />
                    <button onClick={cancelRecording} className="text-xs text-white/40 hover:text-white">Cancel</button>
                    <button onClick={stopRecording} className="h-8 px-4 bg-red-500 text-white rounded-full text-xs font-semibold">Stop</button>
                  </>
                ) : audioBlob && (
                  <>
                    <button onClick={togglePreview} className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                      {isPlayingPreview ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    </button>
                    <span className="text-xs text-white/50 font-mono">Voice note • {recordingTime}s</span>
                    <div className="flex-1" />
                    <button onClick={cancelRecording} className="text-xs text-white/40 hover:text-white">Discard</button>
                  </>
                )}
              </div>
            )}

            {/* Composer */}
            <div className="border-t border-white/5 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom)+64px)] md:pb-3 bg-[#0a0a0a]/80 backdrop-blur-xl">
              <div className="flex items-end gap-2">
                <div className="flex gap-1">
                  <button onClick={() => fileInputRef.current?.click()} className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-all" title="Send images">
                    <Image className="h-5 w-5" />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
                  <button onClick={isRecording ? stopRecording : startRecording} className={`h-10 w-10 flex items-center justify-center rounded-full transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-white/10 text-white/40 hover:text-white'}`} title="Voice note">
                    {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </button>
                </div>
                <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Type a message…" className="flex-1 bg-white/5 border border-white/5 rounded-2xl text-sm text-white placeholder:text-white/25 h-10 px-4 focus:outline-none focus:border-white/20 transition-colors" />
                <button onClick={sendMessage} disabled={sending || (!draft.trim() && !audioBlob && selectedImages.length === 0)}
                  className="h-10 w-10 flex items-center justify-center rounded-full bg-white text-black hover:bg-white/90 disabled:opacity-20 transition-all flex-shrink-0">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#050505]">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                <Send className="h-7 w-7 text-white/20" />
              </div>
              <h2 className="text-2xl font-bold mb-2 tracking-tight">Your Messages</h2>
              <p className="text-sm text-white/30 mb-6">Send messages, voice notes, and photos to other creators.</p>
              <Button variant="outline" className="rounded-full border-white/10 text-white hover:bg-white/5" onClick={() => document.querySelector<HTMLInputElement>('input[placeholder="Search creators…"]')?.focus()}>
                Start a conversation
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Battle Invite Modal */}
      <BattleInviteModal isOpen={showBattleInvite} onClose={() => setShowBattleInvite(false)} />
    </div>
  );
};

// Voice player component
const VoicePlayer = ({ url, isMine }: { url: string; isMine: boolean }) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggle = () => {
    if (!audioRef.current) { audioRef.current = new Audio(url); audioRef.current.onended = () => { setPlaying(false); setProgress(0); }; audioRef.current.ontimeupdate = () => { if (audioRef.current) setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100); }; }
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <button onClick={toggle} className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${isMine ? 'bg-black/10 hover:bg-black/20' : 'bg-white/10 hover:bg-white/20'} transition-colors`}>
        {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
      </button>
      <div className="flex-1 h-1 bg-current/10 rounded-full overflow-hidden">
        <div className="h-full bg-current/40 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>
      <Mic className="h-3 w-3 opacity-40" />
    </div>
  );
};

export default Messages;
