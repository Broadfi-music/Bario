import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, Trophy, Timer } from 'lucide-react';
import { getDemoAvatar } from '@/lib/randomAvatars';

interface Question {
  question: string;
  options: string[];
  correct: number;
  category: string;
}

const DEMO_QUESTIONS: Question[] = [
  { question: "Who sang 'Bohemian Rhapsody'?", options: ['Queen', 'Beatles', 'Led Zeppelin', 'Pink Floyd'], correct: 0, category: '🎵 Music Trivia' },
  { question: 'Finish the lyric: "Is this the real life..."', options: ['...or is this fantasy?', '...or just a dream?', '...or just pretend?', '...or is this love?'], correct: 0, category: '🎤 Finish the Lyric' },
  { question: 'What year was Spotify launched?', options: ['2006', '2008', '2010', '2012'], correct: 1, category: '🎵 Music Trivia' },
  { question: "Which artist has the most Grammys?", options: ['Beyoncé', 'Taylor Swift', 'Adele', 'Stevie Wonder'], correct: 0, category: '🏆 Music Trivia' },
  { question: 'What instrument has 88 keys?', options: ['Guitar', 'Piano', 'Organ', 'Harp'], correct: 1, category: '🎹 General Knowledge' },
  { question: 'Finish the lyric: "We will, we will..."', options: ['...rock you!', '...beat you!', '...shake you!', '...get you!'], correct: 0, category: '🎤 Finish the Lyric' },
];

const DEMO_WINNERS = ['ThoughtLeader', 'MindfulMike', 'GrowthMaster', 'SoulfulSara', 'BookWorm'];

interface MiniGameProps {
  isDemo?: boolean;
}

const MiniGame = ({ isDemo = true }: MiniGameProps) => {
  const [activeGame, setActiveGame] = useState<Question | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [winner, setWinner] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState<number | null>(null);
  const questionIdx = useRef(0);

  useEffect(() => {
    if (!isDemo) return;

    const launch = () => {
      const q = DEMO_QUESTIONS[questionIdx.current % DEMO_QUESTIONS.length];
      questionIdx.current++;
      setActiveGame(q);
      setTimeLeft(15);
      setWinner(null);
      setUserAnswer(null);
    };

    // First game after 2 minutes
    const initial = setTimeout(launch, 120000);
    const interval = setInterval(launch, 300000 + Math.random() * 60000);

    return () => { clearTimeout(initial); clearInterval(interval); };
  }, [isDemo]);

  useEffect(() => {
    if (!activeGame) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Pick a winner
          const name = DEMO_WINNERS[Math.floor(Math.random() * DEMO_WINNERS.length)];
          setWinner(name);
          setTimeout(() => setActiveGame(null), 4000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeGame?.question]);

  const handleAnswer = (idx: number) => {
    if (userAnswer !== null || winner) return;
    setUserAnswer(idx);
  };

  return (
    <AnimatePresence>
      {activeGame && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', damping: 18 }}
          className="absolute top-2 left-2 right-14 z-40"
        >
          <div className="bg-black/90 backdrop-blur-lg rounded-xl border border-emerald-500/30 p-3 shadow-lg shadow-emerald-500/10">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Gamepad2 className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] font-bold text-emerald-400 uppercase">{activeGame.category}</span>
              </div>
              {!winner && (
                <div className="flex items-center gap-1 text-[10px] text-white/40">
                  <Timer className="w-3 h-3" />
                  {timeLeft}s
                </div>
              )}
            </div>

            {/* Question */}
            <p className="text-xs font-semibold text-white mb-2">{activeGame.question}</p>

            {!winner ? (
              <div className="grid grid-cols-2 gap-1.5">
                {activeGame.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    className={`text-[11px] px-2 py-1.5 rounded-lg font-medium transition-all ${
                      userAnswer === i
                        ? i === activeGame.correct
                          ? 'bg-green-500/30 border border-green-500 text-green-300'
                          : 'bg-red-500/30 border border-red-500 text-red-300'
                        : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-2 bg-yellow-500/10 rounded-lg p-2 border border-yellow-500/30"
              >
                <Trophy className="w-4 h-4 text-yellow-400" />
                <div className="w-6 h-6 rounded-full overflow-hidden">
                  <img src={getDemoAvatar(winner)} alt="" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-yellow-400">{winner} wins!</p>
                  <p className="text-[9px] text-white/40">+50 coins 🪙</p>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MiniGame;
