import { Flame } from 'lucide-react';

interface LoyaltyStreakProps {
  streak: number;
  compact?: boolean;
}

const getStreakColor = (streak: number) => {
  if (streak >= 30) return 'text-red-400';
  if (streak >= 14) return 'text-orange-400';
  if (streak >= 7) return 'text-yellow-400';
  if (streak >= 3) return 'text-amber-300';
  return 'text-white/40';
};

const getStreakChatColor = (streak: number) => {
  if (streak >= 30) return 'text-red-300';
  if (streak >= 14) return 'text-orange-300';
  if (streak >= 7) return 'text-yellow-300';
  return '';
};

const LoyaltyStreak = ({ streak, compact = true }: LoyaltyStreakProps) => {
  if (streak < 2) return null;

  const color = getStreakColor(streak);

  return (
    <span className={`inline-flex items-center gap-0.5 ${compact ? '' : 'px-1 py-0.5 rounded bg-white/5'}`} title={`${streak}-session streak`}>
      <Flame className={`w-2.5 h-2.5 ${color}`} />
      <span className={`text-[9px] font-bold ${color}`}>{streak}</span>
    </span>
  );
};

export { getStreakChatColor };
export default LoyaltyStreak;
