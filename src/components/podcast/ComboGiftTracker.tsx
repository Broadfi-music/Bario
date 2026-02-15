import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';

interface ComboGiftTrackerProps {
  isDemo?: boolean;
}

const ComboGiftTracker = ({ isDemo = true }: ComboGiftTrackerProps) => {
  const [comboCount, setComboCount] = useState(0);
  const [showCombo, setShowCombo] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Demo: simulate gift bursts
  useEffect(() => {
    if (!isDemo) return;

    const triggerBurst = () => {
      const burstSize = Math.floor(Math.random() * 8) + 3;
      let i = 0;
      const burstInterval = setInterval(() => {
        i++;
        setComboCount(prev => prev + 1);
        setShowCombo(true);

        // Reset hide timer
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          setShowCombo(false);
          setTimeout(() => setComboCount(0), 500);
        }, 4000);

        if (i >= burstSize) clearInterval(burstInterval);
      }, 600 + Math.random() * 400);
    };

    // First burst after 45 seconds
    const initial = setTimeout(triggerBurst, 45000);
    // Then every 1-2 minutes
    const interval = setInterval(triggerBurst, 60000 + Math.random() * 60000);

    return () => {
      clearTimeout(initial);
      clearInterval(interval);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isDemo]);

  const getComboStyle = () => {
    if (comboCount >= 10) return { border: 'border-red-500', text: 'text-red-400', bg: 'bg-red-500/20', glow: 'shadow-red-500/50', shake: true };
    if (comboCount >= 5) return { border: 'border-orange-500', text: 'text-orange-400', bg: 'bg-orange-500/20', glow: 'shadow-orange-500/40', shake: false };
    if (comboCount >= 2) return { border: 'border-yellow-500', text: 'text-yellow-400', bg: 'bg-yellow-500/20', glow: 'shadow-yellow-500/30', shake: false };
    return { border: 'border-white/20', text: 'text-white', bg: 'bg-white/10', glow: '', shake: false };
  };

  const style = getComboStyle();

  return (
    <AnimatePresence>
      {showCombo && comboCount >= 2 && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: 1, 
            opacity: 1,
            x: style.shake ? [0, -3, 3, -3, 3, 0] : 0,
          }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', damping: 12 }}
          className="absolute top-16 left-2 z-40"
        >
          <div className={`${style.bg} ${style.border} border rounded-xl px-3 py-2 backdrop-blur-lg shadow-lg ${style.glow}`}>
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 0.3, repeat: Infinity }}
              >
                <Zap className={`w-4 h-4 ${style.text}`} />
              </motion.div>
              <div>
                <motion.span
                  key={comboCount}
                  initial={{ scale: 1.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`text-lg font-black ${style.text}`}
                >
                  x{comboCount}
                </motion.span>
                <p className="text-[9px] text-white/40 -mt-0.5">COMBO</p>
              </div>
              {comboCount >= 10 && (
                <motion.span
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="text-lg"
                >
                  💥
                </motion.span>
              )}
              {comboCount >= 5 && comboCount < 10 && (
                <span className="text-sm">🔥</span>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ComboGiftTracker;
