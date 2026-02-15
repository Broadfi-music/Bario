import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, ThumbsUp, ThumbsDown, Disc3 } from 'lucide-react';

interface Track {
  title: string;
  artist: string;
  coverUrl: string;
  previewUrl: string;
}

// Demo tracks from Deezer chart previews
const DEMO_TRACKS: Track[] = [
  { title: 'Blinding Lights', artist: 'The Weeknd', coverUrl: 'https://e-cdns-images.dzcdn.net/images/cover/8bdaf37e2e7f1008c9dff5491e9a78a7/250x250-000000-80-0-0.jpg', previewUrl: 'https://cdns-preview-d.dzcdn.net/stream/c-deda7fa9316d9e9e880d2c6207e92260-8.mp3' },
  { title: 'Levitating', artist: 'Dua Lipa', coverUrl: 'https://e-cdns-images.dzcdn.net/images/cover/6fba987e53ab03f9e3bce8a3e1c1c2e0/250x250-000000-80-0-0.jpg', previewUrl: 'https://cdns-preview-e.dzcdn.net/stream/c-e77d23e0c8ed7567a507a6d1b6a9ca1b-9.mp3' },
  { title: 'Stay', artist: 'The Kid LAROI & Justin Bieber', coverUrl: 'https://e-cdns-images.dzcdn.net/images/cover/9c9e1cd3e838b90d94c1b2f46bfe6dc2/250x250-000000-80-0-0.jpg', previewUrl: 'https://cdns-preview-a.dzcdn.net/stream/c-a2e3b9e3b2e3b9e3b2e3b9e3b2e3b9e3-6.mp3' },
  { title: 'Peaches', artist: 'Justin Bieber', coverUrl: 'https://e-cdns-images.dzcdn.net/images/cover/41b0bca7e0cfbbfc4e20e1b3d515c25c/250x250-000000-80-0-0.jpg', previewUrl: 'https://cdns-preview-c.dzcdn.net/stream/c-c7e1e1cd3e838b90d94c1b2f46bfe6dc-5.mp3' },
  { title: 'Montero', artist: 'Lil Nas X', coverUrl: 'https://e-cdns-images.dzcdn.net/images/cover/0c2315d36ca52e3b2e3b9e3b2e3b9e3b/250x250-000000-80-0-0.jpg', previewUrl: 'https://cdns-preview-b.dzcdn.net/stream/c-b2e3b9e3b2e3b9e3b2e3b9e3b2e3b9e3-4.mp3' },
];

interface MysteryMusicDropProps {
  isDemo?: boolean;
}

const MysteryMusicDrop = ({ isDemo = true }: MysteryMusicDropProps) => {
  const [currentDrop, setCurrentDrop] = useState<Track | null>(null);
  const [votes, setVotes] = useState({ keep: 0, skip: 0 });
  const [userVoted, setUserVoted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackIndexRef = useRef(0);

  // Trigger drops every 2-3 minutes
  useEffect(() => {
    if (!isDemo) return;

    const triggerDrop = () => {
      const track = DEMO_TRACKS[trackIndexRef.current % DEMO_TRACKS.length];
      trackIndexRef.current++;
      setCurrentDrop(track);
      setVotes({ keep: 0, skip: 0 });
      setUserVoted(false);
      setTimeLeft(15);

      // Try to play preview
      try {
        audioRef.current = new Audio(track.previewUrl);
        audioRef.current.volume = 0.3;
        audioRef.current.play().catch(() => {});
      } catch {}
    };

    // First drop after 30 seconds
    const initialTimer = setTimeout(triggerDrop, 30000);
    // Then every 2-3 minutes
    const interval = setInterval(triggerDrop, 120000 + Math.random() * 60000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      audioRef.current?.pause();
    };
  }, [isDemo]);

  // Countdown timer
  useEffect(() => {
    if (!currentDrop) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Auto-resolve with simulated votes
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
        // Simulate votes trickling in
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
    setVotes(prev => ({
      ...prev,
      [type]: prev[type] + 1
    }));
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
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              >
                <Disc3 className="w-4 h-4 text-purple-400" />
              </motion.div>
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Mystery Drop!</span>
              <span className="ml-auto text-[10px] text-white/40">{timeLeft}s</span>
            </div>

            {/* Track Info */}
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

            {/* Vote Progress */}
            <div className="h-1.5 bg-white/10 rounded-full mb-2 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                animate={{ width: `${keepPercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Vote Buttons */}
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
