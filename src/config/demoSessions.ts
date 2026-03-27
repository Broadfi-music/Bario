// 10 Multilingual Demo Sessions — always-live seeded rooms
import { getDemoAvatar } from '@/lib/randomAvatars';

// Room cover images
import aiDebateCover from '@/assets/room-covers/ai-debate.jpg';
import redFlagsCover from '@/assets/room-covers/red-flags.jpg';
import bitcoinCover from '@/assets/room-covers/bitcoin.jpg';
import comedyCover from '@/assets/room-covers/comedy.jpg';
import heartbreakCover from '@/assets/room-covers/heartbreak.jpg';
import bollywoodCover from '@/assets/room-covers/bollywood.jpg';
import iplCover from '@/assets/room-covers/ipl.jpg';
import meditationCover from '@/assets/room-covers/meditation.jpg';
import messiRonaldoCover from '@/assets/room-covers/messi-ronaldo.jpg';
import menaTechCover from '@/assets/room-covers/mena-tech.jpg';

// Host avatar images
import marcusChenAvatar from '@/assets/host-avatars/marcus-chen.jpg';
import tashaMooreAvatar from '@/assets/host-avatars/tasha-moore.jpg';
import alexRiveraAvatar from '@/assets/host-avatars/alex-rivera.jpg';
import djSmoothAvatar from '@/assets/host-avatars/dj-smooth.jpg';
import mayaRossAvatar from '@/assets/host-avatars/maya-ross.jpg';
import rajMalhotraAvatar from '@/assets/host-avatars/raj-malhotra.jpg';
import sunilVermaAvatar from '@/assets/host-avatars/sunil-verma.jpg';
import swamiAnandaAvatar from '@/assets/host-avatars/swami-ananda.jpg';
import carlosMendozaAvatar from '@/assets/host-avatars/carlos-mendoza.jpg';
import omarHassanAvatar from '@/assets/host-avatars/omar-hassan.jpg';

export interface DemoSpeaker {
  id: string;
  name: string;
  role: 'host' | 'co_host' | 'speaker';
  avatarGradient: string;
  avatarUrl?: string;
}

export type VisualTheme = 
  | 'neural-network' 
  | 'heartbeat-waves' 
  | 'crypto-charts' 
  | 'confetti-burst' 
  | 'aurora-ripple' 
  | 'bollywood-sparkle' 
  | 'cricket-energy' 
  | 'mandala-breath' 
  | 'dual-orbs' 
  | 'geometric-mosaic';

export type EnergyLevel = 'calm' | 'moderate' | 'heated' | 'intense';

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
  language: string;
  baseListenerCount: number;
  speakers: DemoSpeaker[];
  visualTheme: VisualTheme;
  energy: EnergyLevel;
}

const STORAGE_BASE = 'https://sufbohhsxlrefkoubmed.supabase.co/storage/v1/object/public/demo-audio';

// Map 5 generated audio files across 10 rooms
const AUDIO = {
  room1: `${STORAGE_BASE}/demo-room-1.mp3`,
  room2: `${STORAGE_BASE}/demo-room-2.mp3`,
  room3: `${STORAGE_BASE}/demo-room-3.mp3`,
  room4: `${STORAGE_BASE}/demo-room-4.mp3`,
  room6: `${STORAGE_BASE}/demo-room-6.mp3`,
};

const sessions: DemoSession[] = [
  // ── English (5) ──────────────────────────────────────────
  {
    id: 'demo-room-1', hostId: 'demo-host-marcus-chen',
    title: 'Is AI Taking Over Creative Jobs?',
    description: 'Heated debate on whether artificial intelligence will replace human creativity',
    coverImageUrl: aiDebateCover,
    audioUrl: AUDIO.room1,
    hostName: 'Marcus Chen', hostAvatar: marcusChenAvatar,
    category: 'Technology', language: 'en', baseListenerCount: 312,
    visualTheme: 'neural-network', energy: 'heated',
    speakers: [
      { id: 'demo-host-marcus-chen', name: 'Marcus Chen', role: 'host', avatarGradient: 'from-blue-500 to-indigo-500', avatarUrl: marcusChenAvatar },
      { id: 'demo-sp-priya', name: 'Priya Sharma', role: 'co_host', avatarGradient: 'from-pink-500 to-rose-500', avatarUrl: getDemoAvatar('Priya Sharma') },
      { id: 'demo-sp-jake', name: 'Jake Wilson', role: 'speaker', avatarGradient: 'from-emerald-500 to-green-500', avatarUrl: getDemoAvatar('Jake Wilson') },
    ],
  },
  {
    id: 'demo-room-2', hostId: 'demo-host-tasha',
    title: 'Relationship Red Flags You\'re Ignoring',
    description: 'Real talk about the warning signs people overlook when in love',
    coverImageUrl: redFlagsCover,
    audioUrl: AUDIO.room2,
    hostName: 'Tasha Moore', hostAvatar: tashaMooreAvatar,
    category: 'Lifestyle', language: 'en', baseListenerCount: 487,
    visualTheme: 'heartbeat-waves', energy: 'intense',
    speakers: [
      { id: 'demo-host-tasha', name: 'Tasha Moore', role: 'host', avatarGradient: 'from-purple-500 to-pink-500', avatarUrl: tashaMooreAvatar },
      { id: 'demo-sp-devon', name: 'Devon Brooks', role: 'co_host', avatarGradient: 'from-amber-500 to-orange-500', avatarUrl: getDemoAvatar('Devon Brooks') },
      { id: 'demo-sp-nina', name: 'Nina Patel', role: 'speaker', avatarGradient: 'from-teal-500 to-cyan-500', avatarUrl: getDemoAvatar('Nina Patel') },
      { id: 'demo-sp-marcus2', name: 'Marcus Wright', role: 'speaker', avatarGradient: 'from-blue-500 to-indigo-500', avatarUrl: getDemoAvatar('Marcus Wright') },
    ],
  },
  {
    id: 'demo-room-3', hostId: 'demo-host-alex-r',
    title: 'Bitcoin to $200K - Real or Fantasy?',
    description: 'Deep market analysis on whether crypto can reach new all-time highs',
    coverImageUrl: bitcoinCover,
    audioUrl: AUDIO.room3,
    hostName: 'Alex Rivera', hostAvatar: alexRiveraAvatar,
    category: 'Finance', language: 'en', baseListenerCount: 256,
    visualTheme: 'crypto-charts', energy: 'moderate',
    speakers: [
      { id: 'demo-host-alex-r', name: 'Alex Rivera', role: 'host', avatarGradient: 'from-yellow-500 to-amber-500', avatarUrl: alexRiveraAvatar },
      { id: 'demo-sp-sam', name: 'Sam Turner', role: 'co_host', avatarGradient: 'from-indigo-500 to-blue-500', avatarUrl: getDemoAvatar('Sam Turner') },
      { id: 'demo-sp-lisa', name: 'Lisa Chen', role: 'speaker', avatarGradient: 'from-rose-500 to-pink-500', avatarUrl: getDemoAvatar('Lisa Chen') },
    ],
  },
  {
    id: 'demo-room-4', hostId: 'demo-host-dj-smooth',
    title: 'Late Night Comedy Hour',
    description: 'Stand-up stories and hilarious takes on everyday life',
    coverImageUrl: comedyCover,
    audioUrl: AUDIO.room4,
    hostName: 'DJ Smooth', hostAvatar: djSmoothAvatar,
    category: 'Entertainment', language: 'en', baseListenerCount: 534,
    visualTheme: 'confetti-burst', energy: 'intense',
    speakers: [
      { id: 'demo-host-dj-smooth', name: 'DJ Smooth', role: 'host', avatarGradient: 'from-red-500 to-orange-500', avatarUrl: djSmoothAvatar },
      { id: 'demo-sp-carmen', name: 'Carmen Lee', role: 'co_host', avatarGradient: 'from-violet-500 to-purple-500', avatarUrl: getDemoAvatar('Carmen Lee') },
      { id: 'demo-sp-bigmike', name: 'Big Mike', role: 'speaker', avatarGradient: 'from-green-500 to-emerald-500', avatarUrl: getDemoAvatar('Big Mike') },
    ],
  },
  {
    id: 'demo-room-5', hostId: 'demo-host-maya',
    title: 'Healing After Heartbreak',
    description: 'A safe space to talk about moving on and self-recovery',
    coverImageUrl: heartbreakCover,
    audioUrl: AUDIO.room1,
    hostName: 'Dr. Maya Ross', hostAvatar: mayaRossAvatar,
    category: 'Wellness', language: 'en', baseListenerCount: 189,
    visualTheme: 'aurora-ripple', energy: 'calm',
    speakers: [
      { id: 'demo-host-maya', name: 'Dr. Maya Ross', role: 'host', avatarGradient: 'from-sky-500 to-blue-500', avatarUrl: mayaRossAvatar },
      { id: 'demo-sp-jordan', name: 'Jordan Ellis', role: 'co_host', avatarGradient: 'from-slate-500 to-gray-500', avatarUrl: getDemoAvatar('Jordan Ellis') },
    ],
  },
  // ── Hindi (3) ────────────────────────────────────────────
  {
    id: 'demo-room-6', hostId: 'demo-host-raj',
    title: 'Bollywood vs Hollywood Debate',
    description: 'Kya Bollywood ab Hollywood ke level pe hai? Suniye dono taraf ke arguments',
    coverImageUrl: bollywoodCover,
    audioUrl: AUDIO.room6,
    hostName: 'Raj Malhotra', hostAvatar: rajMalhotraAvatar,
    category: 'Entertainment', language: 'hi', baseListenerCount: 423,
    visualTheme: 'bollywood-sparkle', energy: 'heated',
    speakers: [
      { id: 'demo-host-raj', name: 'Raj Malhotra', role: 'host', avatarGradient: 'from-orange-500 to-red-500', avatarUrl: rajMalhotraAvatar },
      { id: 'demo-sp-ananya', name: 'Ananya Gupta', role: 'co_host', avatarGradient: 'from-pink-500 to-fuchsia-500', avatarUrl: getDemoAvatar('Ananya Gupta') },
      { id: 'demo-sp-vikram', name: 'Vikram Singh', role: 'speaker', avatarGradient: 'from-blue-500 to-cyan-500', avatarUrl: getDemoAvatar('Vikram Singh') },
    ],
  },
  {
    id: 'demo-room-7', hostId: 'demo-host-sunil',
    title: 'IPL Season - Best Team Debate',
    description: 'Kaun jeetega IPL? Mumbai, Chennai ya RCB? Join the argument!',
    coverImageUrl: iplCover,
    audioUrl: AUDIO.room6,
    hostName: 'Sunil Verma', hostAvatar: sunilVermaAvatar,
    category: 'Sports', language: 'hi', baseListenerCount: 567,
    visualTheme: 'cricket-energy', energy: 'intense',
    speakers: [
      { id: 'demo-host-sunil', name: 'Sunil Verma', role: 'host', avatarGradient: 'from-blue-600 to-indigo-600', avatarUrl: sunilVermaAvatar },
      { id: 'demo-sp-ritu', name: 'Ritu Sharma', role: 'co_host', avatarGradient: 'from-red-500 to-pink-500', avatarUrl: getDemoAvatar('Ritu Sharma') },
      { id: 'demo-sp-amit', name: 'Amit Joshi', role: 'speaker', avatarGradient: 'from-yellow-500 to-orange-500', avatarUrl: getDemoAvatar('Amit Joshi') },
    ],
  },
  {
    id: 'demo-room-9', hostId: 'demo-host-swami',
    title: 'Dhyaan Aur Shanti - Meditation Talk',
    description: 'Mann ki shaanti aur dhyaan ke baare mein ek shantipoorna charcha',
    coverImageUrl: meditationCover,
    audioUrl: AUDIO.room6,
    hostName: 'Swami Ananda', hostAvatar: swamiAnandaAvatar,
    category: 'Spirituality', language: 'hi', baseListenerCount: 145,
    visualTheme: 'mandala-breath', energy: 'calm',
    speakers: [
      { id: 'demo-host-swami', name: 'Swami Ananda', role: 'host', avatarGradient: 'from-amber-400 to-yellow-500', avatarUrl: swamiAnandaAvatar },
      { id: 'demo-sp-meera', name: 'Meera Devi', role: 'co_host', avatarGradient: 'from-rose-400 to-pink-500', avatarUrl: getDemoAvatar('Meera Devi') },
    ],
  },
  // ── Spanish (1) ──────────────────────────────────────────
  {
    id: 'demo-room-10', hostId: 'demo-host-carlos',
    title: 'Messi vs Ronaldo - El Gran Debate',
    description: 'El debate eterno del fútbol. ¿Quién es el mejor de todos los tiempos?',
    coverImageUrl: messiRonaldoCover,
    audioUrl: AUDIO.room4,
    hostName: 'Carlos Mendoza', hostAvatar: carlosMendozaAvatar,
    category: 'Sports', language: 'es', baseListenerCount: 389,
    visualTheme: 'dual-orbs', energy: 'heated',
    speakers: [
      { id: 'demo-host-carlos', name: 'Carlos Mendoza', role: 'host', avatarGradient: 'from-green-500 to-emerald-500', avatarUrl: carlosMendozaAvatar },
      { id: 'demo-sp-isabella', name: 'Isabella Torres', role: 'co_host', avatarGradient: 'from-red-500 to-rose-500', avatarUrl: getDemoAvatar('Isabella Torres') },
      { id: 'demo-sp-diego', name: 'Diego Ruiz', role: 'speaker', avatarGradient: 'from-blue-500 to-sky-500', avatarUrl: getDemoAvatar('Diego Ruiz') },
    ],
  },
  // ── Arabic (1) ───────────────────────────────────────────
  {
    id: 'demo-room-13', hostId: 'demo-host-omar',
    title: 'Future of Technology in MENA',
    description: 'مستقبل التكنولوجيا في منطقة الشرق الأوسط وشمال أفريقيا',
    coverImageUrl: menaTechCover,
    audioUrl: AUDIO.room3,
    hostName: 'Omar Hassan', hostAvatar: omarHassanAvatar,
    category: 'Technology', language: 'ar', baseListenerCount: 234,
    visualTheme: 'geometric-mosaic', energy: 'moderate',
    speakers: [
      { id: 'demo-host-omar', name: 'Omar Hassan', role: 'host', avatarGradient: 'from-teal-500 to-emerald-500', avatarUrl: omarHassanAvatar },
      { id: 'demo-sp-layla', name: 'Layla Khalid', role: 'co_host', avatarGradient: 'from-rose-500 to-red-500', avatarUrl: getDemoAvatar('Layla Khalid') },
    ],
  },
];

export const ALL_DEMO_SESSIONS = sessions;

export const isDemoSessionId = (id: string) => sessions.some(s => s.id === id);

export const getDemoSessionById = (id: string): DemoSession | null =>
  sessions.find(s => s.id === id) ?? null;

/** Convert any demo session to the shape PodcastFeed / KickStyleLive expects */
export const getDemoLiveHostById = (id: string) => {
  const s = getDemoSessionById(id);
  if (!s) return null;
  return {
    id: s.id,
    host_id: s.hostId,
    title: s.title,
    description: s.description,
    listener_count: s.baseListenerCount + Math.floor(Math.random() * 80),
    host_name: s.hostName,
    host_avatar: s.hostAvatar,
    category: s.category,
    cover_image_url: s.coverImageUrl,
  };
};

export const getAllDemoLiveHosts = () => sessions.map(s => ({
  id: s.id,
  host_id: s.hostId,
  title: s.title,
  description: s.description,
  listener_count: s.baseListenerCount + Math.floor(Math.random() * 80),
  host_name: s.hostName,
  host_avatar: s.hostAvatar,
  category: s.category,
  cover_image_url: s.coverImageUrl,
}));

export const getAllDemoLiveSessions = () => sessions.map(s => ({
  id: s.id,
  title: s.title,
  host_id: s.hostId,
  host_name: s.hostName,
  host_avatar: s.hostAvatar,
  cover_image_url: s.coverImageUrl,
  listener_count: s.baseListenerCount + Math.floor(Math.random() * 80),
  status: 'live' as const,
  is_battle: false,
}));

export const getAllDemoPodcastSessions = () => sessions.map((s, i) => ({
  id: s.id,
  host_id: s.hostId,
  title: s.title,
  description: s.description,
  cover_image_url: s.coverImageUrl,
  status: 'live' as 'scheduled' | 'live' | 'ended',
  listener_count: s.baseListenerCount + Math.floor(Math.random() * 80),
  started_at: new Date(Date.now() - (10 + i * 5) * 60 * 1000).toISOString(),
  host_name: s.hostName,
  host_avatar: s.hostAvatar,
  category: s.category,
}));

// Chat messages per language
export const demoChatsByLanguage: Record<string, { content: string; userName: string }[]> = {
  en: [
    { content: 'This is so insightful! 🔥', userName: 'ThoughtLeader' },
    { content: 'Great point!', userName: 'MindfulMike' },
    { content: 'Love this discussion 💜', userName: 'WisdomSeeker' },
    { content: 'Facts only 💯', userName: 'RealTalk' },
    { content: 'Mind blown 🤯', userName: 'DeepThinker' },
    { content: 'Thank you for sharing', userName: 'GratefulGrace' },
    { content: 'I disagree but respect the take', userName: 'DevilsAdvocate' },
    { content: 'This needs to be heard!', userName: 'SignalBoost' },
    { content: 'Pure gold 💎', userName: 'ValueSeeker' },
    { content: 'Exactly what I needed today', userName: 'PositivePete' },
  ],
  hi: [
    { content: 'Bahut sahi baat! 🔥', userName: 'DesiVibes' },
    { content: 'Ekdum sahi 💯', userName: 'BollywoodFan' },
    { content: 'Kya baat hai!', userName: 'CricketLover' },
    { content: 'Main agree karta hoon 👏', userName: 'MumbaiMaverick' },
    { content: 'Bohot acha topic hai yeh', userName: 'DelhiDude' },
    { content: 'Waah! Mazaa aa gaya', userName: 'IndianHustler' },
    { content: 'Bilkul sahi kaha 🙏', userName: 'SpiritualSoul' },
    { content: 'Ek aur point add karna chahta hoon', userName: 'StartupGuru' },
  ],
  es: [
    { content: '¡Esto es increíble! 🔥', userName: 'LatinoVibes' },
    { content: 'Totalmente de acuerdo 💯', userName: 'FútbolFan' },
    { content: '¡Qué buen debate!', userName: 'MusicaLatina' },
    { content: 'Messi sin duda 🐐', userName: 'MessiFan' },
    { content: '¡Viva la música latina! 🎵', userName: 'SalsaKing' },
    { content: 'Muy interesante 👏', userName: 'EmprendedorX' },
    { content: 'No estoy de acuerdo pero respeto', userName: 'DebateKing' },
    { content: '¡Grande! Sigan así', userName: 'ApoyoTotal' },
  ],
  ar: [
    { content: 'كلام رائع! 🔥', userName: 'TechArab' },
    { content: 'أتفق تماما 💯', userName: 'MENAVision' },
    { content: 'نقاش ممتاز 👏', userName: 'ArabInnovator' },
    { content: 'الله يعطيكم العافية', userName: 'GulfTech' },
    { content: 'معلومات قيمة جدا', userName: 'KnowledgeSeeker' },
    { content: 'يا سلام! رائع 🌟', userName: 'ArabicPride' },
    { content: 'المستقبل مشرق 🚀', userName: 'StartupMENA' },
    { content: 'شكرا على هذا المحتوى', userName: 'ArabLearner' },
  ],
};

/** Get chat messages for a demo session based on its language */
export const getDemoChatMessages = (sessionId: string) => {
  const session = getDemoSessionById(sessionId);
  const lang = session?.language ?? 'en';
  return demoChatsByLanguage[lang] ?? demoChatsByLanguage.en;
};

// Legacy compatibility exports
export const DEMO_SESSION_ID = sessions[0].id;
export const DEMO_HOST_ID = sessions[0].hostId;
export const demoSession = sessions[0];
