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
import AudioReactions from './AudioReactions';
import LoyaltyStreak from './LoyaltyStreak';
import { getFreshSession, isDemoSession } from '@/lib/authUtils';
import { getDemoAvatar } from '@/lib/randomAvatars';

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
  hideGiftButton?: boolean;
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

const getUserColor = (userId: string) => {
  const colors = ['text-emerald-400', 'text-pink-400', 'text-blue-400', 'text-yellow-400', 'text-cyan-400', 'text-orange-400'];
  const index = userId.charCodeAt(0) % colors.length;
  return colors[index];
};

// Demo loyalty streaks - random streaks for demo users
const getDemoStreak = (userName: string): number => {
  const hash = userName.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const streaks = [0, 0, 2, 3, 5, 7, 10, 14, 0, 3, 0, 1, 8, 4, 0];
  return streaks[hash % streaks.length];
};

type PickerTab = 'emotes' | 'stickers' | 'gifs';

// Random listener names for demo chat
const DEMO_LISTENER_NAMES = [
  'ThoughtLeader', 'MindfulMike', 'WisdomSeeker', 'GrowthMaster', 'DeepThinker',
  'SoulfulSara', 'ConsciousCris', 'PositivePete', 'BookWorm', 'LearnDaily',
  'AudioLover', 'ZenMaster', 'ShareTheWisdom', 'TransformNow', 'BookReviewer',
  'PhilosophyFan', 'ValueSeeker', 'MorningRitual', 'ClassicReader', 'MasterMind',
  'EarlyRiser', 'WorkLifeBalance', 'PeacefulListener', 'InnerPeace', 'SaveForLater',
];

const DEMO_MESSAGES = [
  'This chapter changed my perspective 🙏', 'The power of thoughts is incredible!',
  'Love this discussion! 💜', 'So inspiring 🔥', 'Mind = blown 🤯',
  'Thank you for sharing this wisdom', 'Every thought shapes our reality',
  'This is exactly what I needed today', 'The audiobook is amazing quality!',
  'Taking notes on everything 📝', 'Solomon Harvey narrates so well',
  'We become what we think about', 'Sharing this with my friends',
  'Life changing content ✨', 'This book should be required reading',
  'The mind is everything', 'Pure gold! 💎', 'I listen to this every morning',
  'James Allen was a genius', 'Self-mastery begins with thought mastery',
  'Who else is listening from work? 👋', 'The narrator voice is so calming',
  'As within, so without 🧘', 'Bookmarking this for later!',
];

const TwitchComments = ({ sessionId, hostId, onSendGift, sessionTitle = '', isHost = false, hideGiftButton = false }: TwitchCommentsProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [userProfiles, setUserProfiles] = useState<Map<string, { name: string; avatar?: string }>>(new Map());
  const [showEmojis, setShowEmojis] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const [pickerTab, setPickerTab] = useState<PickerTab>('emotes');
  
  // Get initial username from user metadata immediately (no async needed)
  const getInitialUserName = () => {
    if (!user) return 'Listener';
    const meta = user.user_metadata;
    return meta?.username || meta?.full_name || meta?.name || user.email?.split('@')[0] || 'Listener';
  };
  const [currentUserName, setCurrentUserName] = useState<string>(getInitialUserName);

  // Then fetch the real profile username (may override metadata)
  useEffect(() => {
    if (!user) return;
    const fetchMyProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('user_id', user.id)
        .single();
      if (data) {
        const name = data.username || data.full_name || getInitialUserName();
        setCurrentUserName(name);
      }
    };
    fetchMyProfile();
  }, [user?.id]);

  // TikTok-style "joined the room" messages for demo
  useEffect(() => {
    if (!isDemoSession(sessionId)) return;

    const JOIN_NAMES = [
      'AudioLover', 'ZenMaster', 'TransformNow', 'MasterMind', 'EarlyRiser',
      'WorkLifeBalance', 'PeacefulListener', 'InnerPeace', 'SaveForLater',
      'PhilosophyFan', 'ValueSeeker', 'MorningRitual', 'ClassicReader',
    ];

    const addJoinMessage = () => {
      const name = JOIN_NAMES[Math.floor(Math.random() * JOIN_NAMES.length)];
      const id = `join-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const joinMsg: Comment = {
        id,
        user_id: `demo-join-${name}`,
        content: `joined the room 👋`,
        is_emoji: false,
        created_at: new Date().toISOString(),
        user_name: name,
      };
      setComments(prev => [...prev.slice(-8), joinMsg]);
    };

    // First join after 5s, then every 8-15s
    const initial = setTimeout(addJoinMessage, 5000);
    const interval = setInterval(addJoinMessage, 8000 + Math.random() * 7000);

    return () => { clearTimeout(initial); clearInterval(interval); };
  }, [sessionId]);

  // Demo chat cycling - messages appear and disappear with random names
  useEffect(() => {
    if (!isDemoSession(sessionId)) return;

    let demoIndex = 0;
    const addDemoMessage = () => {
      const name = DEMO_LISTENER_NAMES[Math.floor(Math.random() * DEMO_LISTENER_NAMES.length)];
      const content = DEMO_MESSAGES[demoIndex % DEMO_MESSAGES.length];
      demoIndex++;
      const id = `demo-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const newMsg: Comment = {
        id,
        user_id: `demo-user-${name}`,
        content,
        is_emoji: false,
        created_at: new Date().toISOString(),
        user_name: name,
      };
      setComments(prev => [...prev.slice(-8), newMsg]);
    };

    // Add initial message immediately
    addDemoMessage();

    // Add new messages every 3-6 seconds
    const interval = setInterval(() => {
      addDemoMessage();
    }, 3000 + Math.random() * 3000);

    return () => clearInterval(interval);
  }, [sessionId]);

  // Demo message cleanup - remove after 12 seconds
  useEffect(() => {
    if (!isDemoSession(sessionId)) return;

    const cleanup = setInterval(() => {
      const now = Date.now();
      setComments(prev => prev.filter(c => {
        if (!c.created_at) return true;
        const age = now - new Date(c.created_at).getTime();
        return age < 12000;
      }));
    }, 2000);

    return () => clearInterval(cleanup);
  }, [sessionId]);

  useEffect(() => {
    // Skip database calls for demo sessions
    if (isDemoSession(sessionId)) {
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
      
      if (data && data.length > 0) {
        // Fetch profiles for comment authors
        const userIds = [...new Set(data.map(c => c.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, username, avatar_url')
          .in('user_id', userIds);
        
        // Build profile map
        const profileMap = new Map<string, { name: string; avatar?: string }>();
        profiles?.forEach(p => {
          profileMap.set(p.user_id, {
            name: p.full_name || p.username || 'Listener',
            avatar: p.avatar_url || undefined
          });
        });
        setUserProfiles(prev => new Map([...prev, ...profileMap]));
        
        // Enrich comments with user names
        const enrichedComments = data.map(c => ({
          ...c,
          user_name: profileMap.get(c.user_id)?.name || 'Listener'
        }));
        
        // Reverse to show oldest first
        setComments(enrichedComments.reverse() as Comment[]);
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
            
            // Fetch profile for new commenter if not cached
            const fetchAndAddComment = async () => {
              let userName = 'Listener';
              
              // Check if profile is cached
              setUserProfiles(currentProfiles => {
                if (currentProfiles.has(newComment.user_id)) {
                  userName = currentProfiles.get(newComment.user_id)?.name || 'Listener';
                }
                return currentProfiles;
              });
              
              // If not cached, fetch from database
              if (userName === 'Listener') {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('user_id, full_name, username, avatar_url')
                  .eq('user_id', newComment.user_id)
                  .single();
                
                if (profile) {
                  userName = profile.full_name || profile.username || 'Listener';
                  setUserProfiles(prev => new Map([...prev, 
                    [profile.user_id, { name: userName, avatar: profile.avatar_url || undefined }]
                  ]));
                }
              }
              
              // Add comment with user name
              const enrichedComment = { ...newComment, user_name: userName };
              
              setComments(prev => {
                // Check if this comment already exists by ID
                if (prev.some(c => c.id === enrichedComment.id)) {
                  console.log('💬 Duplicate comment, skipping');
                  return prev;
                }
                // Remove any local version of this comment (matching user and content)
                const filtered = prev.filter(c => 
                  !(c.id.startsWith('local-') && 
                    c.user_id === enrichedComment.user_id && 
                    c.content === enrichedComment.content)
                );
                // Keep last 100 messages
                const updated = [...filtered.slice(-99), enrichedComment];
                console.log('💬 Comments updated, total:', updated.length);
                return updated;
              });
            };
            
            fetchAndAddComment();
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

  // Real-time message fade out - messages disappear after 10 seconds
  // FIXED: Properly handles local messages and demo messages
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setComments(prev => {
        // Skip if no messages or all demo
        if (prev.length === 0) return prev;
        
        // First, mark old messages for fadeOut
        const updated = prev.map(c => {
          // Demo messages don't fade
          if (c.id.startsWith('demo-')) return c;
          
          // For local messages without created_at, use current time
          const messageTime = c.created_at 
            ? new Date(c.created_at).getTime() 
            : now - MESSAGE_DISPLAY_DURATION; // Force fade if no timestamp
          
          const age = now - messageTime;
          
          // Mark for fadeout at 10 seconds
          if (age > MESSAGE_DISPLAY_DURATION && !c.fadeOut) {
            return { ...c, fadeOut: true };
          }
          return c;
        });
        
        // Then remove messages that have been fading out
        const filtered = updated.filter(c => {
          // Keep demo messages
          if (c.id.startsWith('demo-')) return true;
          
          // Get message age
          const messageTime = c.created_at 
            ? new Date(c.created_at).getTime() 
            : now - MESSAGE_DISPLAY_DURATION - 2000; // Force removal if no timestamp
          
          const age = now - messageTime;
          
          // Remove messages older than 12 seconds (10s visible + 2s fade buffer)
          return age < MESSAGE_DISPLAY_DURATION + 2000;
        });
        
        // Also limit total messages to prevent memory issues
        return filtered.slice(-50);
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
      user_name: currentUserName,
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

  const handleReply = (userId: string, userName?: string) => {
    const profile = userProfiles.get(userId);
    const username = userName || profile?.name || 'User';
    setNewComment(`@${username} `);
  };

  const handleUserClick = (userId: string) => {
    navigate(`/host/${userId}?from=${sessionId}`);
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
            ) : comment.id.startsWith('join-') ? (
              <div className="flex items-center gap-1.5 px-2 py-1 animate-in slide-in-from-right-4 duration-150">
                <div className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0">
                  <img src={getDemoAvatar(comment.user_name || 'User')} alt="" className="w-full h-full object-cover" />
                </div>
                <span className="text-[10px] text-white/40">
                  <span className="text-cyan-400 font-medium">{comment.user_name}</span> {comment.content}
                </span>
              </div>
            ) : (
              <div className="flex items-start gap-2 bg-black/40 rounded px-2 py-1.5 backdrop-blur-sm hover:bg-black/60 transition-colors animate-in slide-in-from-right-4 duration-150">
                {/* Chat avatar */}
                <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 mt-0.5">
                  {comment.user_id.startsWith('demo-user-') ? (
                    <img src={getDemoAvatar(comment.user_name || 'User')} alt="" className="w-full h-full object-cover" />
                  ) : userProfiles.get(comment.user_id)?.avatar ? (
                    <img src={userProfiles.get(comment.user_id)!.avatar!} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <img src={getDemoAvatar(comment.user_name || comment.user_id)} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span 
                    className={`text-xs font-bold ${getUserColor(comment.user_id)} cursor-pointer hover:underline`}
                    onClick={() => handleUserClick(comment.user_id)}
                  >
                    {comment.user_name || userProfiles.get(comment.user_id)?.name || 'Listener'}
                  </span>
                  {comment.user_id.startsWith('demo-user-') && comment.user_name && (
                    <LoyaltyStreak streak={getDemoStreak(comment.user_name)} />
                  )}
                  <span className="text-xs text-white/60 mx-0.5">:</span>
                  <span className="text-xs text-white ml-1.5 break-words">
                    {comment.content}
                  </span>
                </div>
                <button
                  onClick={() => handleReply(comment.user_id, comment.user_name)}
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
                onClick={() => setNewComment(prev => prev + emote)}
                className="text-xl hover:scale-125 transition-transform p-1.5 rounded hover:bg-white/10"
              >
                {emote}
              </button>
            ))}
            {pickerTab === 'stickers' && STICKERS.map((sticker, i) => (
              <button
                key={`sticker-${i}`}
                onClick={() => setNewComment(prev => prev + sticker)}
                className="text-2xl hover:scale-125 transition-transform p-1.5 rounded hover:bg-white/10"
              >
                {sticker}
              </button>
            ))}
            {pickerTab === 'gifs' && GIFS.map((gif, i) => (
              <button
                key={`gif-${i}`}
                onClick={() => setNewComment(prev => prev + gif)}
                className="text-2xl hover:scale-125 transition-transform p-1.5 rounded hover:bg-white/10 animate-pulse"
              >
                {gif}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Audio Reactions */}
      <div className="px-2 py-1 bg-black/80 border-t border-white/5">
        <AudioReactions isDemo={isDemoSession(sessionId)} />
      </div>

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

          {!hideGiftButton && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={onSendGift}
              className="text-yellow-400 hover:text-yellow-300 h-8 w-8"
            >
              <Gift className="h-4 w-4" />
            </Button>
          )}

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