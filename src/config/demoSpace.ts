// Demo Live Space Configuration
// This provides a persistent demo session that plays pre-recorded audio
// to attract first-time users when no real live sessions are running
import { getDemoAvatar } from '@/lib/randomAvatars';

export const DEMO_SESSION_ID = 'demo-live-session';
export const DEMO_HOST_ID = 'demo-host-solomon';

export interface DemoSpeaker {
  id: string;
  name: string;
  role: 'host' | 'co_host' | 'speaker';
  avatarGradient: string;
  avatarUrl?: string;
}

export interface DemoSession {
  id: string;
  hostId: string;
  title: string;
  description: string;
  coverImageUrl: string;
  audioUrl: string;
  hostName: string;
  hostAvatar: string | null;
  category: string;
  baseListenerCount: number;
  speakers: DemoSpeaker[];
}

export const DEMO_SESSION_ID_2 = 'demo-live-session-2';
export const DEMO_HOST_ID_2 = 'demo-host-teri';

export const DEMO_SESSION_ID_3 = 'demo-live-session-3';
export const DEMO_HOST_ID_3 = 'demo-host-marcus';

export const demoSession: DemoSession = {
  id: DEMO_SESSION_ID,
  hostId: DEMO_HOST_ID,
  title: 'As A Man Thinketh - Live Discussion',
  description: 'Join our live discussion on Chapter 2: Effect of Thought on Circumstances',
  coverImageUrl: '/demo/demo-space-cover.jpg',
  audioUrl: '/demo/demo-space-audio.mp3',
  hostName: 'Solomon Harvey',
  hostAvatar: getDemoAvatar('Solomon Harvey'),
  category: 'Philosophy',
  baseListenerCount: 127,
  speakers: [
    {
      id: 'demo-host-solomon',
      name: 'Solomon Harvey',
      role: 'host',
      avatarGradient: 'from-purple-500 to-pink-500',
      avatarUrl: getDemoAvatar('Solomon Harvey'),
    },
    {
      id: 'demo-speaker-1',
      name: 'Mind Coach',
      role: 'co_host',
      avatarGradient: 'from-blue-500 to-cyan-500',
      avatarUrl: getDemoAvatar('Mind Coach'),
    },
    {
      id: 'demo-speaker-2',
      name: 'Wisdom Seeker',
      role: 'speaker',
      avatarGradient: 'from-emerald-500 to-teal-500',
      avatarUrl: getDemoAvatar('Wisdom Seeker'),
    },
  ],
};

export const demoSession2: DemoSession = {
  id: DEMO_SESSION_ID_2,
  hostId: DEMO_HOST_ID_2,
  title: 'Reconciling the CEOs Capacity Dilemma',
  description: 'How To Do Business — Long time do business and become successful with Jackson Johsep',
  coverImageUrl: '/demo/demo-space-cover-2.jpg',
  audioUrl: '/demo/demo-space-audio-2.mp3',
  hostName: 'Teri Beckman',
  hostAvatar: getDemoAvatar('Teri Beckman'),
  category: 'Business',
  baseListenerCount: 89,
  speakers: [
    {
      id: 'demo-host-teri',
      name: 'Teri Beckman',
      role: 'host',
      avatarGradient: 'from-amber-500 to-orange-500',
      avatarUrl: getDemoAvatar('Teri Beckman'),
    },
    {
      id: 'demo-speaker-3',
      name: 'Jackson Johsep',
      role: 'co_host',
      avatarGradient: 'from-indigo-500 to-blue-500',
      avatarUrl: getDemoAvatar('Jackson Johsep'),
    },
  ],
};

export const demoSession3: DemoSession = {
  id: DEMO_SESSION_ID_3,
  hostId: DEMO_HOST_ID_3,
  title: 'Innovative Ways to Make Money',
  description: 'Discover creative and modern strategies to build multiple income streams',
  coverImageUrl: '/demo/demo-space-cover-3.jpg',
  audioUrl: '/demo/demo-space-audio-3.mp3',
  hostName: 'Marcus Cole',
  hostAvatar: getDemoAvatar('Marcus Cole'),
  category: 'Finance',
  baseListenerCount: 103,
  speakers: [
    {
      id: 'demo-host-marcus',
      name: 'Marcus Cole',
      role: 'host',
      avatarGradient: 'from-green-500 to-emerald-500',
      avatarUrl: getDemoAvatar('Marcus Cole'),
    },
    {
      id: 'demo-speaker-4',
      name: 'Finance Guru',
      role: 'co_host',
      avatarGradient: 'from-yellow-500 to-amber-500',
      avatarUrl: getDemoAvatar('Finance Guru'),
    },
    {
      id: 'demo-speaker-5',
      name: 'Side Hustle Pro',
      role: 'speaker',
      avatarGradient: 'from-teal-500 to-cyan-500',
      avatarUrl: getDemoAvatar('Side Hustle Pro'),
    },
  ],
};

// Simulated chat messages that cycle through the demo session
export const demoChatMessages = [
  { content: 'This chapter changed my perspective 🙏', userName: 'ThoughtLeader' },
  { content: 'The power of thoughts is incredible!', userName: 'MindfulMike' },
  { content: 'Love this discussion! 💜', userName: 'WisdomSeeker' },
  { content: 'So inspiring 🔥', userName: 'GrowthMaster' },
  { content: 'Mind = blown 🤯', userName: 'DeepThinker' },
  { content: 'Thank you for sharing this wisdom', userName: 'SoulfulSara' },
  { content: 'Every thought shapes our reality', userName: 'ConsciousCris' },
  { content: 'This is exactly what I needed today', userName: 'PositivePete' },
  { content: 'The audiobook is amazing quality!', userName: 'BookWorm' },
  { content: 'Taking notes on everything 📝', userName: 'LearnDaily' },
  { content: 'Solomon Harvey narrates so well', userName: 'AudioLover' },
  { content: 'We become what we think about', userName: 'ZenMaster' },
  { content: 'Sharing this with my friends', userName: 'ShareTheWisdom' },
  { content: 'Life changing content ✨', userName: 'TransformNow' },
  { content: 'This book should be required reading', userName: 'BookReviewer' },
  { content: 'The mind is everything', userName: 'PhilosophyFan' },
  { content: 'Pure gold! 💎', userName: 'ValueSeeker' },
  { content: 'I listen to this every morning', userName: 'MorningRitual' },
  { content: 'James Allen was a genius', userName: 'ClassicReader' },
  { content: 'Self-mastery begins with thought mastery', userName: 'MasterMind' },
  { content: 'This changed my morning routine', userName: 'EarlyRiser' },
  { content: 'Who else is listening from work? 👋', userName: 'WorkLifeBalance' },
  { content: 'The narrator voice is so calming', userName: 'PeacefulListener' },
  { content: 'As within, so without 🧘', userName: 'InnerPeace' },
  { content: 'Bookmarking this for later!', userName: 'SaveForLater' },
];

export const demoChatMessages2 = [
  { content: 'CEOs need to learn to delegate 💡', userName: 'BizGuru' },
  { content: 'Capacity planning is everything!', userName: 'StartupSteve' },
  { content: 'Great insights Teri! 🔥', userName: 'LeadershipPro' },
  { content: 'This is gold for entrepreneurs', userName: 'HustleQueen' },
  { content: 'Jackson knows his stuff 💪', userName: 'ScaleUp' },
  { content: 'Taking notes! 📝', userName: 'BizLearner' },
  { content: 'The capacity dilemma is so real', userName: 'CEOmindset' },
  { content: 'Love this discussion format', userName: 'PodcastFan' },
];

export const demoChatMessages3 = [
  { content: 'This is game-changing advice! 💰', userName: 'MoneyMaker' },
  { content: 'Side hustles are the future 🚀', userName: 'HustleHard' },
  { content: 'Taking notes on everything! 📝', userName: 'WealthBuilder' },
  { content: 'Passive income is the key 🔑', userName: 'InvestSmart' },
  { content: 'Anyone tried dropshipping?', userName: 'EcomPro' },
  { content: 'Multiple streams of income 💪', userName: 'DiversifyNow' },
  { content: 'Great breakdown Marcus! 🔥', userName: 'FinanceFan' },
  { content: 'The crypto tips are solid', userName: 'BlockchainBob' },
  { content: 'Freelancing changed my life', userName: 'FreelanceKing' },
  { content: 'Real estate is still king 🏠', userName: 'PropertyPro' },
  { content: 'Love the practical examples', userName: 'ActionTaker' },
  { content: 'This should be taught in schools', userName: 'EduReform' },
  { content: 'Financial freedom here I come! ✨', userName: 'FreedomSeeker' },
  { content: 'The affiliate marketing tips 👌', userName: 'AffiliateAce' },
  { content: 'Sharing this with my network', userName: 'NetworkGrowth' },
];

// Helper to check if a session ID is any demo session
export const isDemoSessionId = (id: string) => id === DEMO_SESSION_ID || id === DEMO_SESSION_ID_2 || id === DEMO_SESSION_ID_3;

// Get demo session by ID
export const getDemoSessionById = (id: string): DemoSession | null => {
  if (id === DEMO_SESSION_ID) return demoSession;
  if (id === DEMO_SESSION_ID_2) return demoSession2;
  if (id === DEMO_SESSION_ID_3) return demoSession3;
  return null;
};

// Convert demo session to the format expected by PodcastFeed
export const getDemoLiveHost = () => ({
  id: demoSession.id,
  host_id: demoSession.hostId,
  title: demoSession.title,
  description: demoSession.description,
  listener_count: demoSession.baseListenerCount + Math.floor(Math.random() * 50),
  host_name: demoSession.hostName,
  host_avatar: demoSession.coverImageUrl,
  category: demoSession.category,
  cover_image_url: demoSession.coverImageUrl,
});

export const getDemoLiveHost2 = () => ({
  id: demoSession2.id,
  host_id: demoSession2.hostId,
  title: demoSession2.title,
  description: demoSession2.description,
  listener_count: demoSession2.baseListenerCount + Math.floor(Math.random() * 30),
  host_name: demoSession2.hostName,
  host_avatar: demoSession2.coverImageUrl,
  category: demoSession2.category,
  cover_image_url: demoSession2.coverImageUrl,
});

// Convert demo session to the format expected by GlobalHeatmap
export const getDemoLiveSession = () => ({
  id: demoSession.id,
  title: demoSession.title,
  host_id: demoSession.hostId,
  host_name: demoSession.hostName,
  host_avatar: demoSession.coverImageUrl,
  cover_image_url: demoSession.coverImageUrl,
  listener_count: demoSession.baseListenerCount + Math.floor(Math.random() * 50),
  status: 'live' as const,
  is_battle: false,
});

export const getDemoLiveSession2 = () => ({
  id: demoSession2.id,
  title: demoSession2.title,
  host_id: demoSession2.hostId,
  host_name: demoSession2.hostName,
  host_avatar: demoSession2.coverImageUrl,
  cover_image_url: demoSession2.coverImageUrl,
  listener_count: demoSession2.baseListenerCount + Math.floor(Math.random() * 30),
  status: 'live' as const,
  is_battle: false,
});

// Convert demo session to the format expected by KickStyleLive
export const getDemoPodcastSession = () => ({
  id: demoSession.id,
  host_id: demoSession.hostId,
  title: demoSession.title,
  description: demoSession.description,
  cover_image_url: demoSession.coverImageUrl,
  status: 'live' as 'scheduled' | 'live' | 'ended',
  listener_count: demoSession.baseListenerCount + Math.floor(Math.random() * 50),
  started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  host_name: demoSession.hostName,
  host_avatar: demoSession.hostAvatar,
  category: demoSession.category,
});

export const getDemoPodcastSession2 = () => ({
  id: demoSession2.id,
  host_id: demoSession2.hostId,
  title: demoSession2.title,
  description: demoSession2.description,
  cover_image_url: demoSession2.coverImageUrl,
  status: 'live' as 'scheduled' | 'live' | 'ended',
  listener_count: demoSession2.baseListenerCount + Math.floor(Math.random() * 30),
  started_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  host_name: demoSession2.hostName,
  host_avatar: demoSession2.hostAvatar,
  category: demoSession2.category,
});

export const getDemoLiveHost3 = () => ({
  id: demoSession3.id,
  host_id: demoSession3.hostId,
  title: demoSession3.title,
  description: demoSession3.description,
  listener_count: demoSession3.baseListenerCount + Math.floor(Math.random() * 40),
  host_name: demoSession3.hostName,
  host_avatar: demoSession3.coverImageUrl,
  category: demoSession3.category,
  cover_image_url: demoSession3.coverImageUrl,
});

export const getDemoLiveSession3 = () => ({
  id: demoSession3.id,
  title: demoSession3.title,
  host_id: demoSession3.hostId,
  host_name: demoSession3.hostName,
  host_avatar: demoSession3.coverImageUrl,
  cover_image_url: demoSession3.coverImageUrl,
  listener_count: demoSession3.baseListenerCount + Math.floor(Math.random() * 40),
  status: 'live' as const,
  is_battle: false,
});

export const getDemoPodcastSession3 = () => ({
  id: demoSession3.id,
  host_id: demoSession3.hostId,
  title: demoSession3.title,
  description: demoSession3.description,
  cover_image_url: demoSession3.coverImageUrl,
  status: 'live' as 'scheduled' | 'live' | 'ended',
  listener_count: demoSession3.baseListenerCount + Math.floor(Math.random() * 40),
  started_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  host_name: demoSession3.hostName,
  host_avatar: demoSession3.hostAvatar,
  category: demoSession3.category,
});
