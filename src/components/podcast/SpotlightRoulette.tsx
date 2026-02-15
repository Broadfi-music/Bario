import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { getDemoAvatar } from '@/lib/randomAvatars';

const DEMO_LISTENERS = [
  'ThoughtLeader', 'MindfulMike', 'WisdomSeeker', 'GrowthMaster', 'DeepThinker',
  'SoulfulSara', 'ConsciousCris', 'PositivePete', 'BookWorm', 'LearnDaily',
  'AudioLover', 'ZenMaster', 'ShareTheWisdom', 'TransformNow', 'MasterMind',
];

interface SpotlightRouletteProps {
  isDemo?: boolean;
}

const SpotlightRoulette = ({ isDemo = true }: SpotlightRouletteProps) => {
  const [spotlightUser, setSpotlightUser] = useState<{ name: string; avatar: string } | null>(null);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    if (!isDemo) return;

    const triggerSpotlight = () => {
      setSpinning(true);
      
      // Spin for 2 seconds then land
      setTimeout(() => {
        const name = DEMO_LISTENERS[Math.floor(Math.random() * DEMO_LISTENERS.length)];
        setSpinning(false);
        setSpotlightUser({ name, avatar: getDemoAvatar(name) });

        // Hide after 8 seconds
        setTimeout(() => setSpotlightUser(null), 8000);
      }, 2000);
    };

    // First spotlight after 90 seconds
    const initialTimer = setTimeout(triggerSpotlight, 90000);
    // Then every 3-5 minutes
    const interval = setInterval(triggerSpotlight, 180000 + Math.random() * 120000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [isDemo]);

  return (
    <AnimatePresence>
      {(spinning || spotlightUser) && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="absolute top-1/3 left-1/2 -translate-x-1/2 z-40"
        >
          <div className="relative">
            {/* Glow ring */}
            <motion.div
              animate={{ 
                boxShadow: [
                  '0 0 20px rgba(168,85,247,0.4)',
                  '0 0 40px rgba(168,85,247,0.6)',
                  '0 0 20px rgba(168,85,247,0.4)',
                ],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="bg-black/90 backdrop-blur-lg rounded-2xl border-2 border-purple-500 p-4 min-w-[180px]"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-1 mb-1">
                  <Sparkles className="w-3 h-3 text-yellow-400" />
                  <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider">Spotlight</span>
                  <Sparkles className="w-3 h-3 text-yellow-400" />
                </div>
                
                {spinning ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.3, repeat: Infinity, ease: 'linear' }}
                    className="w-14 h-14 rounded-full border-2 border-dashed border-purple-400 flex items-center justify-center"
                  >
                    <span className="text-lg">🎰</span>
                  </motion.div>
                ) : spotlightUser && (
                  <>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', damping: 10 }}
                      className="relative"
                    >
                      <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-yellow-400 ring-offset-2 ring-offset-black">
                        <img src={spotlightUser.avatar} alt="" className="w-full h-full object-cover" />
                      </div>
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.5, repeat: 3 }}
                        className="absolute -top-1 -right-1 text-lg"
                      >
                        ⭐
                      </motion.div>
                    </motion.div>
                    <p className="text-sm font-bold text-white">{spotlightUser.name}</p>
                    <p className="text-[10px] text-purple-300">You're in the spotlight!</p>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SpotlightRoulette;
