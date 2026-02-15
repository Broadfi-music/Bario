import { useState, useCallback, useRef, useEffect } from 'react';

export interface AchievementDef {
  id: string;
  title: string;
  emoji: string;
  condition: (stats: UserStats) => boolean;
}

export interface UserStats {
  messagesSent: number;
  giftsSent: number;
  minutesInRoom: number;
  isLateNight: boolean;
  joinedInFirstMinute: boolean;
  pollsVoted: number;
  reactionsUsed: number;
}

const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_comment', title: 'First Comment!', emoji: '💬', condition: s => s.messagesSent >= 1 },
  { id: 'chatty', title: 'Chatty (10 msgs)', emoji: '🗣️', condition: s => s.messagesSent >= 10 },
  { id: 'generous', title: 'Generous Gifter', emoji: '🎁', condition: s => s.giftsSent >= 3 },
  { id: 'night_owl', title: 'Night Owl', emoji: '🌙', condition: s => s.isLateNight },
  { id: 'early_bird', title: 'Early Bird', emoji: '🐦', condition: s => s.joinedInFirstMinute },
  { id: 'vibe_setter', title: 'Vibe Setter', emoji: '✨', condition: s => s.reactionsUsed >= 5 },
  { id: 'poll_master', title: 'Poll Master', emoji: '📊', condition: s => s.pollsVoted >= 3 },
  { id: 'dedicated', title: 'Dedicated (5 min)', emoji: '⏱️', condition: s => s.minutesInRoom >= 5 },
];

export const useAchievements = () => {
  const [earnedIds, setEarnedIds] = useState<Set<string>>(new Set());
  const [latestAchievement, setLatestAchievement] = useState<AchievementDef | null>(null);
  const statsRef = useRef<UserStats>({
    messagesSent: 0,
    giftsSent: 0,
    minutesInRoom: 0,
    isLateNight: new Date().getHours() >= 0 && new Date().getHours() < 5,
    joinedInFirstMinute: true,
    pollsVoted: 0,
    reactionsUsed: 0,
  });

  // Track time in room
  useEffect(() => {
    const interval = setInterval(() => {
      statsRef.current.minutesInRoom += 1;
      checkAchievements();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const checkAchievements = useCallback(() => {
    for (const ach of ACHIEVEMENTS) {
      if (!earnedIds.has(ach.id) && ach.condition(statsRef.current)) {
        setEarnedIds(prev => new Set([...prev, ach.id]));
        setLatestAchievement(ach);
        // Clear latest after 5 seconds
        setTimeout(() => setLatestAchievement(null), 5000);
        break; // One at a time
      }
    }
  }, [earnedIds]);

  const trackMessage = useCallback(() => {
    statsRef.current.messagesSent++;
    checkAchievements();
  }, [checkAchievements]);

  const trackGift = useCallback(() => {
    statsRef.current.giftsSent++;
    checkAchievements();
  }, [checkAchievements]);

  const trackPollVote = useCallback(() => {
    statsRef.current.pollsVoted++;
    checkAchievements();
  }, [checkAchievements]);

  const trackReaction = useCallback(() => {
    statsRef.current.reactionsUsed++;
    checkAchievements();
  }, [checkAchievements]);

  return {
    earnedIds,
    latestAchievement,
    trackMessage,
    trackGift,
    trackPollVote,
    trackReaction,
    allAchievements: ACHIEVEMENTS,
  };
};
