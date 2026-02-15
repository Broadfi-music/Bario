import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, ThumbsUp, ThumbsDown, Disc3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Track {
  title: string;
  artist: string;
  coverUrl: string;
  previewUrl: string;
  source?: string;
}

interface MysteryMusicDropProps {
  isDemo?: boolean;
  sessionId?: string;
}

const MysteryMusicDrop = ({ isDemo = true, sessionId }: MysteryMusicDropProps) => {
  const [currentDrop, setCurrentDrop] = useState<Track | null>(null);
  const [votes, setVotes] = useState({ keep: 0, skip: 0 });
  const [userVoted, setUserVoted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tracksRef = useRef<Track[]>([]);
  const trackIndexRef = useRef(0);
  const fetchedRef = useRef(false);

  // Fetch real trending tracks from edge function
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchTracks = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('mystery-music');
        if (!error && data?.tracks?.length) {
          tracksRef.current = data.tracks;
          console.log(`🎵 Mystery Music: loaded ${data.tracks.length} trending tracks`);
        }
      } catch (e) {
        console.error('Failed to fetch mystery tracks:', e);
      }
    };
    fetchTracks();
  }, []);

  // Trigger drops on timer
  useEffect(() => {
    const triggerDrop = () => {
      if (tracksRef.current.length === 0) return;

      const track = tracksRef.current[trackIndexRef.current % tracksRef.current.length];
      trackIndexRef.current++;
      setCurrentDrop(track);
      setVotes({ keep: 0, skip: 0 });
      setUserVoted(false);
      setTimeLeft(15);

      // Play preview
      try {
        if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
        audioRef.current = new Audio(track.previewUrl);
        audioRef.current.volume = 0.25;
        audioRef.current.play().catch(() => {});
      } catch {}
    };

    // First drop after 30s, then every 2-3 minutes
    const initial = setTimeout(triggerDrop, 30000);
    const interval = setInterval(triggerDrop, 120000 + Math.random() * 60000);

    return () => {
      clearTimeout(initial);
      clearInterval(interval);
      audioRef.current?.pause();
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!currentDrop) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (!userVoted) {
            setVotes(v => ({
              keep: v.keep + Math.floor(Math.random() * 30) + 15,
              skip: v.skip + Math.floor(Math.random() * 15) + 5
            }));
          }
          setTimeout(() => {
            setCurrentDrop(null);
            audioRef.current?.pause();
          }, 2000);
          return 0;
        }
        if (prev % 3 === 0) {
          setVotes(v => ({
            keep: v.keep + Math.floor(Math.random() * 5),
            skip: v.skip + Math.floor(Math.random() * 3),
          }));
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentDrop, userVoted]);

  const handleVote = (type: 'keep' | 'skip') => {
    if (userVoted) return;
    setUserVoted(true);
    setVotes(prev => ({ ...prev, [type]: prev[type] + 1 }));
  };

  const totalVotes = votes.keep + votes.skip;
  const keepPercent = totalVotes > 0 ? Math.round((votes.keep / totalVotes) * 100) : 50;

  return (
    <AnimatePresence>
      {currentDrop && (
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          className="absolute top-16 right-2 z-40 w-64"
        >
          <div className="bg-black/90 backdrop-blur-lg rounded-xl border border-purple-500/30 p-3 shadow-2xl shadow-purple-500/10">
            <div className="flex items-center gap-2 mb-2">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}>
                <Disc3 className="w-4 h-4 text-purple-400" />
              </motion.div>
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Mystery Drop!</span>
              <span className="ml-auto text-[10px] text-white/40">{timeLeft}s</span>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                <img src={currentDrop.coverUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{currentDrop.title}</p>
                <p className="text-[10px] text-white/50 truncate">{currentDrop.artist}</p>
              </div>
              <Music className="w-3 h-3 text-white/30" />
            </div>

            <div className="h-1.5 bg-white/10 rounded-full mb-2 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                animate={{ width: `${keepPercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleVote('keep')}
                disabled={userVoted}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  userVoted ? 'opacity-60' : 'hover:scale-105'
                } bg-green-500/20 text-green-400 border border-green-500/30`}
              >
                <ThumbsUp className="w-3 h-3" /> Keep ({votes.keep})
              </button>
              <button
                onClick={() => handleVote('skip')}
                disabled={userVoted}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  userVoted ? 'opacity-60' : 'hover:scale-105'
                } bg-red-500/20 text-red-400 border border-red-500/30`}
              >
                <ThumbsDown className="w-3 h-3" /> Skip ({votes.skip})
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MysteryMusicDrop;
