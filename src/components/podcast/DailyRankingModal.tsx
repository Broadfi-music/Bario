import { useState } from 'react';
import { X, Trophy, Flame } from 'lucide-react';
import { getRandomAvatarUrl } from '@/lib/randomAvatars';

interface RankedUser {
  name: string;
  avatar: string;
  score: number;
  league: string;
  leagueColor: string;
}

interface DailyRankingModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  onSendGift?: () => void;
}

const DEMO_RANKED_USERS: RankedUser[] = [
  { name: 'Cara Melisa', avatar: getRandomAvatarUrl('Cara Melisa'), score: 104900, league: 'A1', leagueColor: 'bg-orange-500' },
  { name: 'MC Christopher', avatar: getRandomAvatarUrl('MC Christopher'), score: 61800, league: 'C1', leagueColor: 'bg-green-500' },
  { name: 'Dhakhta Ray', avatar: getRandomAvatarUrl('Dhakhta Ray'), score: 47700, league: 'A3', leagueColor: 'bg-orange-500' },
  { name: 'Prince Elly', avatar: getRandomAvatarUrl('Prince Elly'), score: 40900, league: 'A1', leagueColor: 'bg-orange-500' },
  { name: 'Neeja Backup', avatar: getRandomAvatarUrl('Neeja Backup'), score: 36700, league: 'A1', leagueColor: 'bg-orange-500' },
  { name: 'Atai Johnson', avatar: getRandomAvatarUrl('Atai Johnson'), score: 33200, league: 'A1', leagueColor: 'bg-orange-500' },
  { name: 'Sofia Grande', avatar: getRandomAvatarUrl('Sofia Grande'), score: 28100, league: 'B2', leagueColor: 'bg-blue-500' },
  { name: 'Kwame Asante', avatar: getRandomAvatarUrl('Kwame Asante'), score: 24500, league: 'B1', leagueColor: 'bg-blue-500' },
  { name: 'Lily Zhang', avatar: getRandomAvatarUrl('Lily Zhang'), score: 19800, league: 'C2', leagueColor: 'bg-green-500' },
  { name: 'Omar Hassan', avatar: getRandomAvatarUrl('Omar Hassan'), score: 15200, league: 'D1', leagueColor: 'bg-gray-500' },
];

const formatScore = (n: number) => {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
};

const LEAGUES = ['Daily Ranking', 'League D3'];

const DailyRankingModal = ({ isOpen, onClose, sessionId, onSendGift }: DailyRankingModalProps) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'popular'>('daily');
  const [activeLeague, setActiveLeague] = useState(0);

  if (!isOpen) return null;

  const top3 = DEMO_RANKED_USERS.slice(0, 3);
  const rest = DEMO_RANKED_USERS.slice(3);
  // Reorder top 3 for podium: #2, #1, #3
  const podium = [top3[1], top3[0], top3[2]];

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('daily')}
              className={`text-sm font-bold pb-1 ${activeTab === 'daily' ? 'text-black border-b-2 border-black' : 'text-gray-400'}`}
            >
              Daily Ranking
            </button>
            <button
              onClick={() => setActiveTab('popular')}
              className={`text-sm font-bold pb-1 ${activeTab === 'popular' ? 'text-black border-b-2 border-black' : 'text-gray-400'}`}
            >
              Popular LIVE
            </button>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* League Tags */}
        <div className="flex gap-2 px-4 py-3">
          {LEAGUES.map((league, i) => (
            <button
              key={league}
              onClick={() => setActiveLeague(i)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                activeLeague === i
                  ? 'bg-yellow-50 border-yellow-400 text-yellow-700'
                  : 'bg-gray-50 border-gray-200 text-gray-500'
              }`}
            >
              {i === 0 && <Flame className="w-3.5 h-3.5 text-yellow-500" />}
              {league}
            </button>
          ))}
        </div>

        {/* Next Update */}
        <div className="flex items-center justify-between px-4 pb-2 text-xs text-gray-400">
          <span>Next update: 23:04:04 ⓘ</span>
          <button className="flex items-center gap-1 text-orange-400 font-medium">
            <Trophy className="w-3.5 h-3.5" />
            Ranking history
          </button>
        </div>

        {/* Podium - Top 3 */}
        <div className="flex items-end justify-center gap-3 px-4 py-4">
          {podium.map((user, i) => {
            const rank = i === 0 ? 2 : i === 1 ? 1 : 3;
            const size = rank === 1 ? 'w-20 h-20' : 'w-16 h-16';
            const rankColors: Record<number, string> = { 1: 'text-yellow-500', 2: 'text-gray-400', 3: 'text-orange-400' };
            const rankBg: Record<number, string> = { 1: 'bg-yellow-100', 2: 'bg-gray-100', 3: 'bg-orange-100' };

            return (
              <div key={user.name} className="flex flex-col items-center gap-1">
                <div className="relative">
                  <div className={`${size} rounded-full overflow-hidden border-2 ${rank === 1 ? 'border-yellow-400' : rank === 2 ? 'border-gray-300' : 'border-orange-400'}`}>
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  </div>
                  <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 ${rankBg[rank]} rounded-full w-6 h-6 flex items-center justify-center`}>
                    <span className={`text-xs font-bold ${rankColors[rank]}`}>{rank}</span>
                  </div>
                </div>
                <p className="text-xs font-semibold text-gray-800 mt-2 max-w-[80px] truncate text-center">{user.name}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold text-white ${user.leagueColor}`}>
                  {user.league}
                </span>
                <span className="text-xs text-gray-500 font-medium">{formatScore(user.score)}</span>
              </div>
            );
          })}
        </div>

        {/* Rest of Rankings */}
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {rest.map((user, i) => (
            <div key={user.name} className="flex items-center gap-3 py-2.5 border-b border-gray-50">
              <span className="w-5 text-sm font-bold text-gray-400">{i + 4}</span>
              <div className="w-10 h-10 rounded-full overflow-hidden">
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{user.name}</p>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold text-white ${user.leagueColor}`}>
                {user.league}
              </span>
              <span className="text-sm text-gray-500 font-medium">{formatScore(user.score)}</span>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="px-4 py-3 border-t border-gray-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden">
            <img src={getRandomAvatarUrl('CurrentUser')} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400">7.1K Diamonds to reach No. 99</p>
          </div>
          <button
            onClick={() => { onClose(); onSendGift?.(); }}
            className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-full transition-colors"
          >
            Send Gift
          </button>
        </div>
      </div>
    </div>
  );
};

export default DailyRankingModal;
