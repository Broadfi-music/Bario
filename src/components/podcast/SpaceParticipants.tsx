import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Mic, MicOff, MoreHorizontal, ChevronDown, UserPlus, Link2, MessageSquare, Feather } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useFollowSystem } from '@/hooks/useFollowSystem';

interface Participant {
  id: string;
  user_id: string;
  role: 'host' | 'co_host' | 'speaker' | 'listener';
  is_muted: boolean;
  hand_raised: boolean;
  joined_at: string;
  avatar?: string;
  name?: string;
}

interface SpaceParticipantsProps {
  sessionId: string;
  hostId: string;
  isHost: boolean;
  title?: string;
  onLeave?: () => void;
}

// Generate random avatar colors
const getAvatarColor = (id: string) => {
  const colors = [
    'from-orange-500 to-red-500',
    'from-blue-500 to-purple-500',
    'from-green-500 to-teal-500',
    'from-pink-500 to-rose-500',
    'from-yellow-500 to-orange-500',
    'from-indigo-500 to-blue-500',
  ];
  const index = id.charCodeAt(0) % colors.length;
  return colors[index];
};

// Generate fake names for demo
const getDisplayName = (userId: string, role: string) => {
  const names = ['TNTR...', 'Raymond...', 'Teresa Pro', 'susana c...', 'Steven S...', 'BennyS...', 'Sheldon ...', 'Billy Sim...', 'Dan', 'CW MD', 'Ron Perry', 'JD Gonz...', 'OkieRPh', 'STARR3...', 'John F. H...', 'Lonnie ...'];
  const index = userId.charCodeAt(0) % names.length;
  return names[index];
};

const SpaceParticipants = ({ sessionId, hostId, isHost, title, onLeave }: SpaceParticipantsProps) => {
  const { user } = useAuth();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [myParticipation, setMyParticipation] = useState<Participant | null>(null);
  const { isFollowing, toggleFollow } = useFollowSystem();

  useEffect(() => {
    const fetchParticipants = async () => {
      const { data } = await supabase
        .from('podcast_participants')
        .select('*')
        .eq('session_id', sessionId)
        .order('joined_at', { ascending: true });
      
      if (data) {
        setParticipants(data as Participant[]);
        if (user) {
          const myP = data.find(p => p.user_id === user.id);
          setMyParticipation(myP as Participant || null);
        }
      }
    };

    fetchParticipants();

    const channel = supabase
      .channel(`participants-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'podcast_participants',
          filter: `session_id=eq.${sessionId}`
        },
        () => fetchParticipants()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, user]);

  const joinSession = async () => {
    if (!user) {
      toast.error('Please login to join');
      return;
    }

    const { error } = await supabase.from('podcast_participants').insert({
      session_id: sessionId,
      user_id: user.id,
      role: 'listener',
      is_muted: true
    });

    if (error) {
      toast.error('Failed to join session');
    } else {
      toast.success('Joined the space!');
    }
  };

  const leaveSession = async () => {
    if (!user || !myParticipation) return;

    await supabase
      .from('podcast_participants')
      .delete()
      .eq('id', myParticipation.id);
    
    toast.success('Left the space');
    onLeave?.();
  };

  const toggleHandRaise = async () => {
    if (!myParticipation) return;

    await supabase
      .from('podcast_participants')
      .update({ hand_raised: !myParticipation.hand_raised })
      .eq('id', myParticipation.id);
  };

  const hosts = participants.filter(p => p.role === 'host' || p.role === 'co_host');
  const listeners = participants.filter(p => p.role === 'listener' || p.role === 'speaker');

  // Create demo participants if none exist
  const demoParticipants = participants.length === 0 ? [
    { id: 'demo-1', user_id: 'host-1', role: 'host' as const, is_muted: false, hand_raised: false, joined_at: '' },
    { id: 'demo-2', user_id: 'cohost-1', role: 'co_host' as const, is_muted: true, hand_raised: false, joined_at: '' },
    ...Array.from({ length: 14 }, (_, i) => ({
      id: `demo-${i + 3}`,
      user_id: `user-${i}`,
      role: 'listener' as const,
      is_muted: true,
      hand_raised: false,
      joined_at: ''
    }))
  ] : [...hosts, ...listeners];

  const displayParticipants = demoParticipants;

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <button className="text-white/60 hover:text-white">
          <ChevronDown className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-4">
          <button className="text-white/60 hover:text-white">
            <MoreHorizontal className="h-5 w-5" />
          </button>
          <button 
            onClick={leaveSession}
            className="text-red-500 font-semibold text-sm hover:text-red-400"
          >
            Leave
          </button>
        </div>
      </div>

      {/* REC Badge */}
      <div className="px-4 py-2">
        <div className="inline-flex items-center px-2 py-0.5 border border-white/40 rounded text-xs text-white/80">
          REC
        </div>
      </div>

      {/* Title */}
      <div className="px-4 pb-4">
        <h1 className="text-xl font-bold text-white">
          {title || 'Live Podcast Session'}
        </h1>
      </div>

      {/* Participants Grid - Twitter Space Style */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="grid grid-cols-4 gap-4">
          {displayParticipants.map((p, index) => {
            const isHostRole = p.role === 'host';
            const isCoHost = p.role === 'co_host';
            const name = getDisplayName(p.user_id, p.role);
            const avatarColor = getAvatarColor(p.user_id);
            
            return (
              <div key={p.id} className="flex flex-col items-center gap-1">
                <div className="relative">
                  {/* Avatar */}
                  <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center overflow-hidden`}>
                    {index === 0 ? (
                      <img 
                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100" 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-lg font-bold">
                        {name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  
                  {/* Verified badge for host */}
                  {isHostRole && (
                    <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 bg-blue-500 rounded-full p-0.5">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                      </svg>
                    </div>
                  )}
                </div>
                
                {/* Name */}
                <span className="text-xs text-white font-medium text-center truncate w-full">
                  {name}
                </span>
                
                {/* Role Label */}
                <span className={`text-[10px] ${
                  isHostRole ? 'text-purple-400' : isCoHost ? 'text-white/60' : 'text-white/40'
                }`}>
                  {isHostRole && (
                    <span className="flex items-center gap-0.5">
                      <span className="inline-flex gap-0.5">
                        <span className="w-1 h-3 bg-purple-500 rounded-full animate-pulse" />
                        <span className="w-1 h-2 bg-purple-500 rounded-full animate-pulse delay-75" />
                        <span className="w-1 h-3 bg-purple-500 rounded-full animate-pulse delay-150" />
                      </span>
                      Host
                    </span>
                  )}
                  {isCoHost && 'Co-host'}
                  {!isHostRole && !isCoHost && 'Listener'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Actions - Twitter Space Style */}
      <div className="border-t border-white/10 px-4 py-3 bg-black">
        <div className="flex items-center justify-between">
          {/* Left actions */}
          <div className="flex items-center gap-3">
            {/* Mic button */}
            <button 
              onClick={toggleHandRaise}
              className="w-12 h-12 rounded-full border-2 border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:border-white/40 transition-colors"
            >
              <Mic className="h-5 w-5" />
            </button>
            
            {/* Request button */}
            <button className="text-white/40 text-xs">
              Request
            </button>
          </div>

          {/* Center actions */}
          <div className="flex items-center gap-4">
            <button className="text-white/60 hover:text-white">
              <UserPlus className="h-5 w-5" />
            </button>
            <button className="text-white/60 hover:text-white">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
            <button className="text-white/60 hover:text-white">
              <Link2 className="h-5 w-5" />
            </button>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <button className="w-10 h-10 rounded-full bg-sky-500 flex items-center justify-center hover:bg-sky-400 transition-colors">
              <Feather className="h-4 w-4 text-white" />
            </button>
            <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
              <MessageSquare className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Join button overlay if not joined */}
      {!myParticipation && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
          <Button
            onClick={joinSession}
            size="lg"
            className="bg-purple-600 hover:bg-purple-500 px-8 rounded-full shadow-lg shadow-purple-500/30"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Join Space
          </Button>
        </div>
      )}
    </div>
  );
};

export default SpaceParticipants;
