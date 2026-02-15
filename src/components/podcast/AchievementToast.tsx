import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award } from 'lucide-react';
import { getDemoAvatar } from '@/lib/randomAvatars';

interface Achievement {
  id: string;
  userName: string;
  badge: string;
  title: string;
  emoji: string;
}

const DEMO_ACHIEVEMENTS: { title: string; emoji: string }[] = [
  { title: 'First Comment!', emoji: '💬' },
  { title: 'Chatty (10 msgs)', emoji: '🗣️' },
  { title: 'Generous Gifter', emoji: '🎁' },
  { title: 'Night Owl 🦉', emoji: '🌙' },
  { title: 'Early Bird', emoji: '🐦' },
  { title: 'Vibe Setter', emoji: '✨' },
  { title: 'Hype Machine', emoji: '🔥' },
  { title: 'Poll Master', emoji: '📊' },
];

const DEMO_NAMES = [
  'ThoughtLeader', 'MindfulMike', 'WisdomSeeker', 'GrowthMaster',
  'SoulfulSara', 'PositivePete', 'BookWorm', 'ZenMaster',
];

interface AchievementToastProps {
  isDemo?: boolean;
}

const AchievementToast = ({ isDemo = true }: AchievementToastProps) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    if (!isDemo) return;

    const awardAchievement = () => {
      const name = DEMO_NAMES[Math.floor(Math.random() * DEMO_NAMES.length)];
      const ach = DEMO_ACHIEVEMENTS[Math.floor(Math.random() * DEMO_ACHIEVEMENTS.length)];
      const id = `ach-${Date.now()}`;

      setAchievements(prev => [...prev.slice(-2), { id, userName: name, badge: ach.emoji, title: ach.title, emoji: ach.emoji }]);

      // Remove after 5 seconds
      setTimeout(() => {
        setAchievements(prev => prev.filter(a => a.id !== id));
      }, 5000);
    };

    // First after 40 seconds
    const initial = setTimeout(awardAchievement, 40000);
    const interval = setInterval(awardAchievement, 30000 + Math.random() * 30000);

    return () => { clearTimeout(initial); clearInterval(interval); };
  }, [isDemo]);

  return (
    <div className="absolute bottom-52 left-2 z-40 space-y-1.5 pointer-events-none">
      <AnimatePresence>
        {achievements.map(ach => (
          <motion.div
            key={ach.id}
            initial={{ x: -200, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -200, opacity: 0 }}
            transition={{ type: 'spring', damping: 15 }}
            className="flex items-center gap-2 bg-black/80 backdrop-blur-sm rounded-full px-3 py-1.5 border border-yellow-500/30"
          >
            <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
              <img src={getDemoAvatar(ach.userName)} alt="" className="w-full h-full object-cover" />
            </div>
            <Award className="w-3 h-3 text-yellow-400 flex-shrink-0" />
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-yellow-400">{ach.userName}</span>
              <span className="text-[10px] text-white/60">earned</span>
              <span className="text-[10px] text-white font-medium">{ach.emoji} {ach.title}</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default AchievementToast;
