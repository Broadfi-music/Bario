// Demo Live Space Configuration
// This provides a persistent demo session that plays pre-recorded audio
// to attract first-time users when no real live sessions are running

export const DEMO_SESSION_ID = 'demo-live-session';
export const DEMO_HOST_ID = 'demo-host-solomon';

export interface DemoSpeaker {
  id: string;
  name: string;
  role: 'host' | 'co_host' | 'speaker';
  avatarGradient: string;
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

export const demoSession: DemoSession = {
  id: DEMO_SESSION_ID,
  hostId: DEMO_HOST_ID,
  title: 'As A Man Thinketh - Live Discussion',
  description: 'Join our live discussion on Chapter 2: Effect of Thought on Circumstances',
  coverImageUrl: '/demo/demo-space-cover.jpg',
  audioUrl: '/demo/demo-space-audio.mp3',
  hostName: 'Solomon Harvey',
  hostAvatar: null,
  category: 'Philosophy',
  baseListenerCount: 127,
  speakers: [
    {
      id: 'demo-host-solomon',
      name: 'Solomon Harvey',
      role: 'host',
      avatarGradient: 'from-purple-500 to-pink-500',
    },
    {
      id: 'demo-speaker-1',
      name: 'Mind Coach',
      role: 'co_host',
      avatarGradient: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'demo-speaker-2',
      name: 'Wisdom Seeker',
      role: 'speaker',
      avatarGradient: 'from-emerald-500 to-teal-500',
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

// Convert demo session to the format expected by PodcastFeed
export const getDemoLiveHost = () => ({
  id: demoSession.id,
  host_id: demoSession.hostId,
  title: demoSession.title,
  description: demoSession.description,
  listener_count: demoSession.baseListenerCount + Math.floor(Math.random() * 50),
  host_name: demoSession.hostName,
  host_avatar: demoSession.hostAvatar,
  category: demoSession.category,
  cover_image_url: demoSession.coverImageUrl,
});

// Convert demo session to the format expected by GlobalHeatmap
export const getDemoLiveSession = () => ({
  id: demoSession.id,
  title: demoSession.title,
  host_id: demoSession.hostId,
  host_name: demoSession.hostName,
  host_avatar: demoSession.hostAvatar,
  listener_count: demoSession.baseListenerCount + Math.floor(Math.random() * 50),
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
  started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // Started 30 mins ago
  host_name: demoSession.hostName,
  host_avatar: demoSession.hostAvatar,
  category: demoSession.category,
});
