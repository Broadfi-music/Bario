import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Timer } from 'lucide-react';

interface PollOption {
  text: string;
  votes: number;
}

interface Poll {
  question: string;
  options: PollOption[];
}

const DEMO_POLLS: Poll[] = [
  { question: "What's your favorite music genre?", options: [{ text: 'Hip Hop', votes: 0 }, { text: 'R&B', votes: 0 }, { text: 'Afrobeats', votes: 0 }, { text: 'Pop', votes: 0 }] },
  { question: 'Best time for live sessions?', options: [{ text: 'Morning', votes: 0 }, { text: 'Afternoon', votes: 0 }, { text: 'Evening', votes: 0 }, { text: 'Late Night', votes: 0 }] },
  { question: 'How did you find Bario?', options: [{ text: 'TikTok', votes: 0 }, { text: 'Friend', votes: 0 }, { text: 'Google', votes: 0 }, { text: 'Twitter/X', votes: 0 }] },
  { question: 'Should the host play more music?', options: [{ text: 'Yes! 🎵', votes: 0 }, { text: 'No, talk more', votes: 0 }, { text: 'Mix both', votes: 0 }] },
  { question: 'Rate this session so far!', options: [{ text: '🔥 Fire', votes: 0 }, { text: '👍 Good', votes: 0 }, { text: '😐 Mid', votes: 0 }] },
];

interface LivePollProps {
  isDemo?: boolean;
}

const LivePoll = ({ isDemo = true }: LivePollProps) => {
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [userVoted, setUserVoted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const pollIndexRef = { current: 0 };

  useEffect(() => {
    if (!isDemo) return;

    const launchPoll = () => {
      const poll = DEMO_POLLS[pollIndexRef.current % DEMO_POLLS.length];
      pollIndexRef.current++;
      // Reset votes with some initial randomness
      const fresh: Poll = {
        ...poll,
        options: poll.options.map(o => ({ ...o, votes: Math.floor(Math.random() * 8) + 2 }))
      };
      setActivePoll(fresh);
      setUserVoted(false);
      setTimeLeft(30);
    };

    // First poll after 60 seconds
    const initial = setTimeout(launchPoll, 60000);
    const interval = setInterval(launchPoll, 240000 + Math.random() * 60000);

    return () => { clearTimeout(initial); clearInterval(interval); };
  }, [isDemo]);

  // Countdown + simulate votes
  useEffect(() => {
    if (!activePoll) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setTimeout(() => setActivePoll(null), 3000);
          return 0;
        }
        // Simulate votes
        if (prev % 4 === 0) {
          setActivePoll(p => p ? {
            ...p,
            options: p.options.map(o => ({
              ...o,
              votes: o.votes + Math.floor(Math.random() * 4)
            }))
          } : null);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activePoll?.question]);

  const handleVote = (idx: number) => {
    if (userVoted || !activePoll) return;
    setUserVoted(true);
    setActivePoll(p => p ? {
      ...p,
      options: p.options.map((o, i) => i === idx ? { ...o, votes: o.votes + 1 } : o)
    } : null);
  };

  const totalVotes = activePoll?.options.reduce((s, o) => s + o.votes, 0) || 1;
  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-amber-500'];

  return (
    <AnimatePresence>
      {activePoll && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          className="absolute top-2 left-2 right-14 z-40"
        >
          <div className="bg-black/90 backdrop-blur-lg rounded-xl border border-white/10 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="w-3 h-3 text-blue-400" />
                <span className="text-[10px] font-bold text-blue-400 uppercase">Live Poll</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-white/40">
                <Timer className="w-3 h-3" />
                {timeLeft}s
              </div>
            </div>

            <p className="text-xs font-semibold text-white mb-2">{activePoll.question}</p>

            <div className="space-y-1.5">
              {activePoll.options.map((option, i) => {
                const pct = Math.round((option.votes / totalVotes) * 100);
                return (
                  <button
                    key={i}
                    onClick={() => handleVote(i)}
                    disabled={userVoted}
                    className="w-full relative overflow-hidden rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <motion.div
                      className={`absolute inset-y-0 left-0 ${colors[i % colors.length]} opacity-20`}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.4 }}
                    />
                    <div className="relative flex items-center justify-between px-2.5 py-1.5">
                      <span className="text-[11px] text-white font-medium">{option.text}</span>
                      <span className="text-[10px] text-white/60">{pct}%</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="text-[9px] text-white/30 mt-1.5 text-right">{totalVotes} votes</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LivePoll;
