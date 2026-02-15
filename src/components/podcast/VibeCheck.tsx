import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const VIBES = [
  { emoji: '🔥', label: 'Fire' },
  { emoji: '❤️', label: 'Love' },
  { emoji: '🤯', label: 'Mind-blown' },
  { emoji: '😌', label: 'Chill' },
  { emoji: '😴', label: 'Sleepy' },
];

interface VibeCheckProps {
  isDemo?: boolean;
}

const VibeCheck = ({ isDemo = true }: VibeCheckProps) => {
  const [active, setActive] = useState(false);
  const [votes, setVotes] = useState<number[]>([0, 0, 0, 0, 0]);
  const [userVoted, setUserVoted] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (!isDemo) return;

    const trigger = () => {
      setActive(true);
      setUserVoted(false);
      setShowResults(false);
      // Random initial votes weighted towards fire & love
      setVotes([
        Math.floor(Math.random() * 20) + 15,
        Math.floor(Math.random() * 15) + 10,
        Math.floor(Math.random() * 10) + 5,
        Math.floor(Math.random() * 8) + 3,
        Math.floor(Math.random() * 4) + 1,
      ]);

      // Show results after 10 seconds
      setTimeout(() => setShowResults(true), 10000);
      // Hide after 15 seconds
      setTimeout(() => setActive(false), 15000);
    };

    // First vibe check after 75 seconds
    const initial = setTimeout(trigger, 75000);
    const interval = setInterval(trigger, 120000 + Math.random() * 60000);

    return () => { clearTimeout(initial); clearInterval(interval); };
  }, [isDemo]);

  // Simulate votes trickling in
  useEffect(() => {
    if (!active || showResults) return;
    const timer = setInterval(() => {
      setVotes(prev => prev.map((v, i) => v + (Math.random() > 0.6 ? Math.floor(Math.random() * 3) : 0)));
    }, 2000);
    return () => clearInterval(timer);
  }, [active, showResults]);

  const handleVote = (idx: number) => {
    if (userVoted) return;
    setUserVoted(true);
    setVotes(prev => prev.map((v, i) => i === idx ? v + 1 : v));
  };

  const total = votes.reduce((s, v) => s + v, 0) || 1;
  const topIdx = votes.indexOf(Math.max(...votes));
  const colors = ['#ef4444', '#ec4899', '#8b5cf6', '#06b6d4', '#6b7280'];

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 18 }}
          className="absolute bottom-52 left-1/2 -translate-x-1/2 z-40"
        >
          <div className="bg-black/90 backdrop-blur-lg rounded-2xl border border-white/10 px-4 py-3 min-w-[220px]">
            <p className="text-[10px] font-bold text-white/50 uppercase text-center mb-2 tracking-wider">
              Vibe Check ✨
            </p>

            {!showResults ? (
              <div className="flex items-center justify-center gap-2">
                {VIBES.map((vibe, i) => (
                  <motion.button
                    key={vibe.emoji}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleVote(i)}
                    disabled={userVoted}
                    className={`text-2xl p-1.5 rounded-xl transition-all ${
                      userVoted ? 'opacity-50' : 'hover:bg-white/10'
                    }`}
                  >
                    {vibe.emoji}
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {/* Simple donut-like visualization */}
                <div className="flex items-center justify-center gap-1 h-6">
                  {votes.map((v, i) => (
                    <motion.div
                      key={i}
                      initial={{ width: 0 }}
                      animate={{ width: `${(v / total) * 100}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-full rounded-full min-w-[4px]"
                      style={{ backgroundColor: colors[i] }}
                    />
                  ))}
                </div>
                {/* Winner */}
                <div className="text-center">
                  <span className="text-lg">{VIBES[topIdx].emoji}</span>
                  <p className="text-[10px] text-white/60">
                    Room is feeling <span className="text-white font-bold">{VIBES[topIdx].label}</span>
                  </p>
                </div>
              </div>
            )}

            {!showResults && (
              <p className="text-[9px] text-white/30 text-center mt-1">
                {userVoted ? 'Voted!' : 'Tap your vibe'}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VibeCheck;
