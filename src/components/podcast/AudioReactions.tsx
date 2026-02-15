import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Reaction {
  id: string;
  emoji: string;
  x: number;
}

const REACTIONS = [
  { emoji: '👏', label: 'Applause' },
  { emoji: '📯', label: 'Horn' },
  { emoji: '😂', label: 'Laugh' },
  { emoji: '🤩', label: 'Wow' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '❤️', label: 'Love' },
];

// Generate simple synth sounds using Web Audio API
const playReactionSound = (type: string) => {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 0.1;

    switch (type) {
      case '👏':
        osc.type = 'square';
        osc.frequency.value = 800;
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        break;
      case '📯':
        osc.type = 'sawtooth';
        osc.frequency.value = 440;
        osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        break;
      case '😂':
        osc.type = 'sine';
        osc.frequency.value = 600;
        osc.frequency.linearRampToValueAtTime(300, ctx.currentTime + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        break;
      default:
        osc.type = 'sine';
        osc.frequency.value = 1000;
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    }

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
    setTimeout(() => ctx.close(), 500);
  } catch {}
};

interface AudioReactionsProps {
  isDemo?: boolean;
}

const AudioReactions = ({ isDemo = true }: AudioReactionsProps) => {
  const [floatingReactions, setFloatingReactions] = useState<Reaction[]>([]);
  const [cooldown, setCooldown] = useState(false);
  const cooldownTimer = useRef<NodeJS.Timeout | null>(null);

  const addReaction = useCallback((emoji: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    const x = 20 + Math.random() * 60; // random x position %
    setFloatingReactions(prev => [...prev.slice(-15), { id, emoji, x }]);
    
    // Remove after animation
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== id));
    }, 2000);
  }, []);

  const handleReaction = (emoji: string) => {
    if (cooldown) return;
    addReaction(emoji);
    playReactionSound(emoji);
    setCooldown(true);
    cooldownTimer.current = setTimeout(() => setCooldown(false), 3000);
  };

  // Demo: auto-trigger reactions
  useEffect(() => {
    if (!isDemo) return;
    const interval = setInterval(() => {
      const r = REACTIONS[Math.floor(Math.random() * REACTIONS.length)];
      addReaction(r.emoji);
    }, 15000 + Math.random() * 25000);
    return () => clearInterval(interval);
  }, [isDemo, addReaction]);

  useEffect(() => {
    return () => { if (cooldownTimer.current) clearTimeout(cooldownTimer.current); };
  }, []);

  return (
    <>
      {/* Floating reactions */}
      <div className="absolute bottom-48 right-2 w-16 h-40 pointer-events-none z-30 overflow-hidden">
        <AnimatePresence>
          {floatingReactions.map(r => (
            <motion.div
              key={r.id}
              initial={{ y: 160, x: r.x * 0.16, opacity: 1, scale: 0.5 }}
              animate={{ y: -40, opacity: 0, scale: 1.2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, ease: 'easeOut' }}
              className="absolute text-xl"
            >
              {r.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Reaction buttons row */}
      <div className="flex items-center gap-1 px-1">
        {REACTIONS.map(r => (
          <button
            key={r.emoji}
            onClick={() => handleReaction(r.emoji)}
            disabled={cooldown}
            className={`text-base p-1 rounded-full transition-all ${
              cooldown ? 'opacity-30 cursor-not-allowed' : 'hover:scale-125 hover:bg-white/10 active:scale-90'
            }`}
            title={r.label}
          >
            {r.emoji}
          </button>
        ))}
        {cooldown && (
          <span className="text-[9px] text-white/30 ml-1">cooldown...</span>
        )}
      </div>
    </>
  );
};

export default AudioReactions;
