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
      // Only use tracks with deezer preview URLs (most reliable for browser playback)
      const playable = tracksRef.current.filter(t => 
        t.previewUrl && (t.previewUrl.includes('dzcdn.net') || t.previewUrl.includes('deezer') || t.source === 'deezer')
      );
      if (playable.length === 0) return;

      const track = playable[trackIndexRef.current % playable.length];
      trackIndexRef.current++;
      setCurrentDrop(track);
      setVotes({ keep: 0, skip: 0 });
      setUserVoted(false);
      setTimeLeft(90);

      // Play preview - NO crossOrigin (Deezer doesn't support CORS headers)
      try {
        if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
        const audio = new Audio();
        audio.volume = 0.20;
        audio.loop = true;
        audio.preload = 'auto';
        
        audio.addEventListener('canplaythrough', () => {
          console.log('🎵 Mystery Drop audio ready:', track.title);
        });
        audio.addEventListener('error', (e) => {
          console.error('🎵 Mystery Drop audio FAILED to load:', track.title, audio.error?.message || 'unknown error');
        });
        
        audio.src = track.previewUrl;
        audioRef.current = audio;
        
        audio.play()
          .then(() => console.log('🎵 Mystery Drop playing:', track.title, 'by', track.artist))
          .catch((err) => console.warn('🎵 Mystery Drop autoplay blocked:', err.message));
      } catch (e) {
        console.error('🎵 Mystery Drop audio error:', e);
      }
    };

    // First drop after 20s, then every 3 minutes
    const initial = setTimeout(triggerDrop, 20000);
    const interval = setInterval(triggerDrop, 180000);

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
          className="absolute top-14 right-1 z-40 w-44 sm:w-56"
        >
            <div className="bg-black/90 backdrop-blur-lg rounded-xl border border-purple-500/30 p-2 shadow-2xl shadow-purple-500/10">
              <div className="flex items-center gap-1.5 mb-1">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}>
                  <Disc3 className="w-3 h-3 text-purple-400" />
                </motion.div>
                <span className="text-[8px] font-bold text-purple-400 uppercase tracking-wider">Mystery Drop!</span>
                <span className="ml-auto text-[8px] text-white/40">{timeLeft}s</span>
              </div>

              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-7 h-7 rounded-md overflow-hidden bg-white/10 flex-shrink-0">
                  <img src={currentDrop.coverUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-white truncate">{currentDrop.title}</p>
                  <p className="text-[8px] text-white/50 truncate">{currentDrop.artist}</p>
                </div>
              </div>

            <div className="h-1 bg-white/10 rounded-full mb-1.5 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                animate={{ width: `${keepPercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

              <div className="flex gap-1.5">
                <button
                  onClick={() => handleVote('keep')}
                  disabled={userVoted}
                  className={`flex-1 flex items-center justify-center gap-0.5 py-1 rounded-md text-[9px] font-semibold transition-all ${
                    userVoted ? 'opacity-60' : 'hover:scale-105'
                  } bg-green-500/20 text-green-400 border border-green-500/30`}
                >
                  <ThumbsUp className="w-2.5 h-2.5" /> {votes.keep}
                </button>
                <button
                  onClick={() => handleVote('skip')}
                  disabled={userVoted}
                  className={`flex-1 flex items-center justify-center gap-0.5 py-1 rounded-md text-[9px] font-semibold transition-all ${
                    userVoted ? 'opacity-60' : 'hover:scale-105'
                  } bg-red-500/20 text-red-400 border border-red-500/30`}
                >
                  <ThumbsDown className="w-2.5 h-2.5" /> {votes.skip}
                </button>
              </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MysteryMusicDrop;
