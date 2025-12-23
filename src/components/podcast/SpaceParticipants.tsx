import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Mic, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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
  hostName?: string;
  hostAvatar?: string | null;
  onLeave?: () => void;
}

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

const getDisplayName = (userId: string) => {
  const names = ['TNTR...', 'Raymond...', 'Teresa Pro', 'susana c...', 'Steven S...', 'BennyS...', 'Sheldon ...', 'Billy Sim...', 'Dan', 'CW MD', 'Ron Perry', 'JD Gonz...', 'OkieRPh', 'STARR3...', 'John F. H...', 'Lonnie ...'];
  const index = userId.charCodeAt(0) % names.length;
  return names[index];
};

const SpaceParticipants = ({ sessionId, hostId, isHost, title, hostName, hostAvatar, onLeave }: SpaceParticipantsProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [myParticipation, setMyParticipation] = useState<Participant | null>(null);

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

  const toggleHandRaise = async () => {
    if (!myParticipation) return;

    await supabase
      .from('podcast_participants')
      .update({ hand_raised: !myParticipation.hand_raised })
      .eq('id', myParticipation.id);
  };

  const goToHostProfile = () => {
    navigate(`/podcast-host/${hostId}`);
  };

  const hosts = participants.filter(p => p.role === 'host' || p.role === 'co_host');
  const listeners = participants.filter(p => p.role === 'listener' || p.role === 'speaker');

  // Create demo participants if none exist
  const demoParticipants = participants.length === 0 ? [
    { id: 'demo-1', user_id: hostId, role: 'host' as const, is_muted: false, hand_raised: false, joined_at: '' },
    { id: 'demo-2', user_id: 'cohost-1', role: 'co_host' as const, is_muted: true, hand_raised: false, joined_at: '' },
    ...Array.from({ length: 12 }, (_, i) => ({
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
    <div className="flex flex-col h-full bg-black px-4 py-2">
      {/* Title */}
      <div className="mb-3">
        <h1 className="text-lg font-bold text-white line-clamp-2">
          {title || 'Live Podcast Session'}
        </h1>
      </div>

      {/* Participants Grid - Twitter Space Style */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
          {displayParticipants.map((p, index) => {
            const isHostRole = p.role === 'host';
            const isCoHost = p.role === 'co_host';
            const name = isHostRole && hostName ? hostName : getDisplayName(p.user_id);
            const avatarColor = getAvatarColor(p.user_id);
            const avatarUrl = isHostRole && hostAvatar ? hostAvatar : null;
            
            return (
              <div 
                key={p.id} 
                className="flex flex-col items-center gap-1 cursor-pointer"
                onClick={isHostRole ? goToHostProfile : undefined}
              >
                <div className="relative">
                  {/* Avatar */}
                  <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center overflow-hidden ${isHostRole ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-black' : ''}`}>
                    {avatarUrl ? (
                      <img 
                        src={avatarUrl} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-sm font-bold">
                        {name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  
                  {/* Verified badge for host */}
                  {isHostRole && (
                    <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 bg-blue-500 rounded-full p-0.5">
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                      </svg>
                    </div>
                  )}
                </div>
                
                {/* Name */}
                <span className="text-[10px] text-white font-medium text-center truncate w-full">
                  {name}
                </span>
                
                {/* Role Label */}
                {(isHostRole || isCoHost) && (
                  <span className={`text-[9px] ${
                    isHostRole ? 'text-purple-400' : 'text-white/60'
                  }`}>
                    {isHostRole && (
                      <span className="flex items-center gap-0.5">
                        <span className="inline-flex gap-0.5">
                          <span className="w-0.5 h-2 bg-purple-500 rounded-full animate-pulse" />
                          <span className="w-0.5 h-1.5 bg-purple-500 rounded-full animate-pulse delay-75" />
                          <span className="w-0.5 h-2 bg-purple-500 rounded-full animate-pulse delay-150" />
                        </span>
                        Host
                      </span>
                    )}
                    {isCoHost && 'Co-host'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Listeners count & Request */}
      <div className="flex items-center justify-between py-2 mt-1">
        <div className="flex items-center gap-3">
          {/* Mic/Request button */}
          <button 
            onClick={toggleHandRaise}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            <div className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center">
              <Mic className="h-4 w-4" />
            </div>
            <span className="text-xs">Request</span>
          </button>
        </div>

        {/* Join Space button */}
        {!myParticipation && (
          <Button
            onClick={joinSession}
            size="sm"
            className="bg-purple-600 hover:bg-purple-500 rounded-full px-6"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Join Space
          </Button>
        )}
      </div>
    </div>
  );
};

export default SpaceParticipants;
