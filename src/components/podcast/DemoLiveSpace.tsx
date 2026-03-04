import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Plus, Trophy, Mic, MicOff, LogOut, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { demoSession, demoSession2, demoSession3, DemoSpeaker, DemoSession, DEMO_SESSION_ID_2, DEMO_SESSION_ID_3 } from '@/config/demoSpace';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import AuthPromptModal from './AuthPromptModal';
import TopEngagementModal from './TopEngagementModal';
import DailyRankingModal from './DailyRankingModal';
import MysteryMusicDrop from './MysteryMusicDrop';
import SpotlightRoulette from './SpotlightRoulette';
import ComboGiftTracker from './ComboGiftTracker';
import AchievementToast from './AchievementToast';

import VibeCheck from './VibeCheck';
import { getRandomAvatarUrl } from '@/lib/randomAvatars';

// Audio waveform animation component
const AudioWaveform = ({ isActive }: { isActive: boolean }) => {
  if (!isActive) return null;
  
  return (
    <div className="flex items-center gap-[2px] h-3">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="w-[3px] bg-green-500 rounded-full animate-pulse"
          style={{
            height: `${Math.random() * 8 + 4}px`,
            animationDelay: `${i * 0.1}s`,
            animationDuration: '0.4s',
          }}
        />
      ))}
    </div>
  );
};

interface DemoLiveSpaceProps {
  onLeave?: () => void;
  sessionId?: string;
}

const DemoLiveSpace = ({ onLeave, sessionId }: DemoLiveSpaceProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Pick the right demo session
  const activeDemo: DemoSession = sessionId === DEMO_SESSION_ID_3 ? demoSession3 : sessionId === DEMO_SESSION_ID_2 ? demoSession2 : demoSession;
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [listenerCount, setListenerCount] = useState(activeDemo.baseListenerCount);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<string>(activeDemo.speakers[0].id);
  const [engagementCount, setEngagementCount] = useState(12);
  const [localFollowing, setLocalFollowing] = useState(false);
  const [showEngagementModal, setShowEngagementModal] = useState(false);
  const [showDailyRanking, setShowDailyRanking] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [mutedSpeakers, setMutedSpeakers] = useState<Record<string, boolean>>({});
  const [mysteryDropEnabled, setMysteryDropEnabled] = useState(true);

  // Initialize and auto-play audio
  useEffect(() => {
    audioRef.current = new Audio(activeDemo.audioUrl);
    audioRef.current.loop = true;
    audioRef.current.volume = 1.0;
    
    // Auto-play with a small delay
    const playTimer = setTimeout(() => {
      audioRef.current?.play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.log('Autoplay blocked, waiting for user interaction:', err);
          // Show play button if autoplay is blocked
        });
    }, 500);

    return () => {
      clearTimeout(playTimer);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [activeDemo.audioUrl]);

  // Simulate fluctuating listener count
  useEffect(() => {
    const interval = setInterval(() => {
      setListenerCount(prev => {
        const change = Math.floor(Math.random() * 11) - 5; // -5 to +5
        const newCount = Math.max(85, Math.min(200, prev + change));
        return newCount;
      });
    }, 8000 + Math.random() * 4000); // 8-12 seconds

    return () => clearInterval(interval);
  }, []);

  // Simulate rotating active speaker
  useEffect(() => {
    const interval = setInterval(() => {
      const speakers = activeDemo.speakers;
      const currentIndex = speakers.findIndex(s => s.id === activeSpeaker);
      const nextIndex = (currentIndex + 1) % speakers.length;
      setActiveSpeaker(speakers[nextIndex].id);
    }, 15000 + Math.random() * 10000);
    return () => clearInterval(interval);
  }, [activeSpeaker]);

  // Simulate engagement count growth
  useEffect(() => {
    const interval = setInterval(() => {
      setEngagementCount(prev => prev + Math.floor(Math.random() * 3));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleFollow = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setLocalFollowing(prev => !prev);
    toast.success(localFollowing ? 'Unfollowed' : 'Following!');
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => toast.error('Unable to play audio'));
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleJoinSession = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    toast.success('Joined! You can now hear everyone.');
  };

  const handleLeave = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    onLeave?.();
    navigate('/podcasts');
  };

  const handleSpeakerMuteToggle = (speakerId: string) => {
    setMutedSpeakers(prev => {
      const newState = { ...prev, [speakerId]: !prev[speakerId] };
      toast.success(newState[speakerId] ? 'Mic muted' : 'Mic unmuted');
      return newState;
    });
  };

  const handleSpeakerLeave = (speakerName: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    toast.success(`${speakerName} left the session`);
    onLeave?.();
    navigate('/podcasts');
  };

  const renderSpeaker = (speaker: DemoSpeaker) => {
    const isActive = speaker.id === activeSpeaker && isPlaying && !mutedSpeakers[speaker.id];
    const isSpeakerMuted = !!mutedSpeakers[speaker.id];
    // In a real app, check if speaker.id matches the logged-in user's participant ID
    // For demo, all speakers/hosts get the self-action popover
    const isSelf = speaker.role === 'host' || speaker.role === 'co_host' || speaker.role === 'speaker';

    const avatarContent = (
      <div className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center ${isActive ? 'ring-2 ring-green-500/50' : ''} ${isSpeakerMuted ? 'opacity-50' : ''} cursor-pointer hover:opacity-80 transition-opacity`}>
        {speaker.avatarUrl ? (
          <img src={speaker.avatarUrl} alt={speaker.name} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${speaker.avatarGradient} flex items-center justify-center`}>
            <span className="text-white font-bold text-xs">{speaker.name.charAt(0)}</span>
          </div>
        )}
      </div>
    );

    return (
      <div key={speaker.id} className="flex flex-col items-center gap-1">
        <div className="relative">
          {isSelf ? (
            <Popover>
              <PopoverTrigger asChild>
                <button className="relative">
                  {avatarContent}
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-36 p-1.5 bg-zinc-900 border-white/10 rounded-xl shadow-xl"
                side="top"
                sideOffset={8}
              >
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => handleSpeakerMuteToggle(speaker.id)}
                    className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-xs font-medium text-white hover:bg-white/10 transition-colors"
                  >
                    {isSpeakerMuted ? (
                      <>
                        <MicOff className="w-3.5 h-3.5 text-red-400" />
                        <span>Unmute Mic</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5 text-green-400" />
                        <span>Mute Mic</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleSpeakerLeave(speaker.name)}
                    className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Leave Session</span>
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <button
              onClick={() => navigate(`/host/${speaker.id}?from=${activeDemo.id}`)}
              className="relative"
            >
              {avatarContent}
            </button>
          )}
          {isActive && (
            <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2">
              <AudioWaveform isActive={true} />
            </div>
          )}
          {isSpeakerMuted && (
            <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2">
              <MicOff className="w-3 h-3 text-red-400" />
            </div>
          )}
          {speaker.role === 'host' && (
            <div className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[8px] font-bold px-1 py-0.5 rounded-full">
              HOST
            </div>
          )}
        </div>
        <button
          onClick={() => navigate(`/host/${speaker.id}?from=${activeDemo.id}`)}
          className="text-white text-[10px] font-medium text-center leading-tight max-w-[70px] truncate hover:text-white/80 transition-colors"
        >
          {speaker.name}
        </button>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-black relative">
      {/* Engagement Overlays */}
      <MysteryMusicDrop isDemo roomCategory={activeDemo.category} roomTitle={activeDemo.title} enabled={mysteryDropEnabled} isHost onSkip={() => {}} />
      <SpotlightRoulette isDemo />
      <ComboGiftTracker isDemo />
      <AchievementToast isDemo />
      
      <VibeCheck isDemo />

      {/* Session Header - extra top padding for PWA header */}
      <div className="px-4 pt-14 pb-2 sm:py-3 border-b border-white/5 bg-black shrink-0">
        <div className="flex items-center gap-2">
          {/* Host avatar */}
          <button
            onClick={() => navigate(`/host/${activeDemo.speakers[0]?.id}?from=${activeDemo.id}`)}
            className="shrink-0 hover:opacity-80 transition-opacity"
          >
            <div className="w-6 h-6 rounded-full overflow-hidden">
              {activeDemo.speakers[0]?.avatarUrl ? (
                <img src={activeDemo.speakers[0].avatarUrl} alt={activeDemo.hostName} className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${activeDemo.speakers[0]?.avatarGradient}`} />
              )}
            </div>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-white/50">{activeDemo.hostName} · <Users className="inline h-3 w-3" /> {listenerCount}</p>
          </div>
        </div>
        <p className="text-white font-bold text-sm mt-1.5">{activeDemo.title}</p>

            {/* Engagement, D1, Follow under title */}
            <div className="flex items-center gap-2 mt-1">
              {/* Top Engagement */}
              <button onClick={() => setShowEngagementModal(true)} className="flex items-center gap-1 hover:opacity-80 transition-opacity">
                {[
                  getRandomAvatarUrl('ThoughtLeader'),
                  getRandomAvatarUrl('MindfulMike'),
                ].map((avatar, i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full overflow-hidden border border-black/50 ${i > 0 ? '-ml-1.5' : ''}`}
                  >
                    <img src={avatar} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
                <span className="text-[10px] text-white/50 font-medium ml-0.5">{engagementCount}</span>
              </button>

              {/* D1 Ranking */}
              <button onClick={() => setShowDailyRanking(true)} className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-yellow-500/20 hover:bg-yellow-500/30 transition-colors">
                <Trophy className="w-3 h-3 text-yellow-400" />
                <span className="text-[10px] text-yellow-400 font-semibold">D1</span>
              </button>

              {/* Mystery Drop Toggle */}
              <button
                onClick={() => setMysteryDropEnabled(prev => !prev)}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full transition-colors ${
                  mysteryDropEnabled ? 'bg-purple-500/20 hover:bg-purple-500/30' : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                <Music className={`w-3 h-3 ${mysteryDropEnabled ? 'text-purple-400' : 'text-white/40'}`} />
                <span className={`text-[10px] font-semibold ${mysteryDropEnabled ? 'text-purple-400' : 'text-white/40'}`}>
                  {mysteryDropEnabled ? 'Drop' : 'Off'}
                </span>
              </button>

              {/* Follow Button */}
              <button
                onClick={handleFollow}
                className={`h-5 px-2 rounded text-[10px] font-semibold transition-colors ${
                  localFollowing
                    ? 'bg-white/10 text-white hover:bg-white/20'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                }`}
              >
                {localFollowing ? 'Following' : 'Follow'}
              </button>
            </div>
      </div>

      {/* Speakers Area - Horizontal Row */}
      <div className="flex-1 flex items-center justify-center px-4 py-4 min-h-0 bg-black">
        <div className="grid grid-cols-4 gap-4 justify-items-center">
          {activeDemo.speakers.map(speaker => renderSpeaker(speaker))}
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={`slot-${i}`} className="flex flex-col items-center gap-1">
              <button
                onClick={async () => {
                  if (!user) {
                    setShowAuthModal(true);
                    return;
                  }
                  // Get user profile for name/avatar
                  const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name, username, avatar_url')
                    .eq('user_id', user.id)
                    .single();

                  const userName = profile?.username || profile?.full_name || user.email?.split('@')[0] || 'Listener';
                  const userAvatar = profile?.avatar_url || null;

                  const { error } = await supabase
                    .from('space_join_requests')
                    .insert({
                      session_id: activeDemo.id,
                      user_id: user.id,
                      user_name: userName,
                      user_avatar: userAvatar,
                      status: 'pending',
                    });

                  if (error) {
                    if (error.code === '23505') {
                      toast.info('You already sent a request to join!');
                    } else {
                      toast.error('Failed to send join request');
                    }
                  } else {
                    toast.success('Request sent to host!');
                  }
                }}
                className="w-10 h-10 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center hover:border-white/40 hover:bg-white/5 transition-colors"
              >
                <Plus className="w-4 h-4 text-white/40" />
              </button>
              <span className="text-white/30 text-[10px]">Join</span>
            </div>
          ))}
        </div>
      </div>


      {/* Auth Modal */}
      <AuthPromptModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />

      {/* Top Engagement Modal */}
      <TopEngagementModal
        isOpen={showEngagementModal}
        onClose={() => setShowEngagementModal(false)}
        sessionId={activeDemo.id}
        onSendGift={() => { setShowEngagementModal(false); setShowGiftModal(true); }}
      />

      {/* Daily Ranking Modal */}
      <DailyRankingModal
        isOpen={showDailyRanking}
        onClose={() => setShowDailyRanking(false)}
        sessionId={activeDemo.id}
        onSendGift={() => { setShowDailyRanking(false); setShowGiftModal(true); }}
      />
    </div>
  );
};

export default DemoLiveSpace;
