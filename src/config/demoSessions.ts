// 10 Multilingual Demo Sessions — always-live seeded rooms
import { getDemoAvatar } from '@/lib/randomAvatars';

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
const COVER_BASE = '/demo';

// Map 5 generated audio files across 10 rooms
const AUDIO = {
  room1: `${STORAGE_BASE}/demo-room-1.mp3`,   // EN - AI debate
  room2: `${STORAGE_BASE}/demo-room-2.mp3`,   // EN - Relationship
  room3: `${STORAGE_BASE}/demo-room-3.mp3`,   // EN - Bitcoin
  room4: `${STORAGE_BASE}/demo-room-4.mp3`,   // EN - Comedy
  room6: `${STORAGE_BASE}/demo-room-6.mp3`,   // HI - Bollywood
};

const sessions: DemoSession[] = [
  // ── English (5) ──────────────────────────────────────────
  {
    id: 'demo-room-1', hostId: 'demo-host-marcus-chen',
    title: 'Is AI Taking Over Creative Jobs?',
    description: 'Heated debate on whether artificial intelligence will replace human creativity',
    coverImageUrl: `${COVER_BASE}/demo-space-cover.jpg`,
    audioUrl: AUDIO.room1,
    hostName: 'Marcus Chen', hostAvatar: getDemoAvatar('Marcus Chen'),
    category: 'Technology', language: 'en', baseListenerCount: 312,
    speakers: [
      { id: 'demo-host-marcus-chen', name: 'Marcus Chen', role: 'host', avatarGradient: 'from-blue-500 to-indigo-500', avatarUrl: getDemoAvatar('Marcus Chen') },
      { id: 'demo-sp-priya', name: 'Priya Sharma', role: 'co_host', avatarGradient: 'from-pink-500 to-rose-500', avatarUrl: getDemoAvatar('Priya Sharma') },
      { id: 'demo-sp-jake', name: 'Jake Wilson', role: 'speaker', avatarGradient: 'from-emerald-500 to-green-500', avatarUrl: getDemoAvatar('Jake Wilson') },
    ],
  },
  {
    id: 'demo-room-2', hostId: 'demo-host-tasha',
    title: 'Relationship Red Flags You\'re Ignoring',
    description: 'Real talk about the warning signs people overlook when in love',
    coverImageUrl: `${COVER_BASE}/demo-space-cover-2.jpg`,
    audioUrl: AUDIO.room2,
    hostName: 'Tasha Moore', hostAvatar: getDemoAvatar('Tasha Moore'),
    category: 'Lifestyle', language: 'en', baseListenerCount: 487,
    speakers: [
      { id: 'demo-host-tasha', name: 'Tasha Moore', role: 'host', avatarGradient: 'from-purple-500 to-pink-500', avatarUrl: getDemoAvatar('Tasha Moore') },
      { id: 'demo-sp-devon', name: 'Devon Brooks', role: 'co_host', avatarGradient: 'from-amber-500 to-orange-500', avatarUrl: getDemoAvatar('Devon Brooks') },
      { id: 'demo-sp-nina', name: 'Nina Patel', role: 'speaker', avatarGradient: 'from-teal-500 to-cyan-500', avatarUrl: getDemoAvatar('Nina Patel') },
      { id: 'demo-sp-marcus2', name: 'Marcus Wright', role: 'speaker', avatarGradient: 'from-blue-500 to-indigo-500', avatarUrl: getDemoAvatar('Marcus Wright') },
    ],
  },
  {
    id: 'demo-room-3', hostId: 'demo-host-alex-r',
    title: 'Bitcoin to $200K - Real or Fantasy?',
    description: 'Deep market analysis on whether crypto can reach new all-time highs',
    coverImageUrl: `${COVER_BASE}/demo-space-cover-3.jpg`,
    audioUrl: AUDIO.room3,
    hostName: 'Alex Rivera', hostAvatar: getDemoAvatar('Alex Rivera'),
    category: 'Finance', language: 'en', baseListenerCount: 256,
    speakers: [
      { id: 'demo-host-alex-r', name: 'Alex Rivera', role: 'host', avatarGradient: 'from-yellow-500 to-amber-500', avatarUrl: getDemoAvatar('Alex Rivera') },
      { id: 'demo-sp-sam', name: 'Sam Turner', role: 'co_host', avatarGradient: 'from-indigo-500 to-blue-500', avatarUrl: getDemoAvatar('Sam Turner') },
      { id: 'demo-sp-lisa', name: 'Lisa Chen', role: 'speaker', avatarGradient: 'from-rose-500 to-pink-500', avatarUrl: getDemoAvatar('Lisa Chen') },
    ],
  },
  {
    id: 'demo-room-4', hostId: 'demo-host-dj-smooth',
    title: 'Late Night Comedy Hour',
    description: 'Stand-up stories and hilarious takes on everyday life',
    coverImageUrl: `${COVER_BASE}/demo-space-cover.jpg`,
    audioUrl: AUDIO.room4,
    hostName: 'DJ Smooth', hostAvatar: getDemoAvatar('DJ Smooth'),
    category: 'Entertainment', language: 'en', baseListenerCount: 534,
    speakers: [
      { id: 'demo-host-dj-smooth', name: 'DJ Smooth', role: 'host', avatarGradient: 'from-red-500 to-orange-500', avatarUrl: getDemoAvatar('DJ Smooth') },
      { id: 'demo-sp-carmen', name: 'Carmen Lee', role: 'co_host', avatarGradient: 'from-violet-500 to-purple-500', avatarUrl: getDemoAvatar('Carmen Lee') },
      { id: 'demo-sp-bigmike', name: 'Big Mike', role: 'speaker', avatarGradient: 'from-green-500 to-emerald-500', avatarUrl: getDemoAvatar('Big Mike') },
    ],
  },
  {
    id: 'demo-room-5', hostId: 'demo-host-maya',
    title: 'Healing After Heartbreak',
    description: 'A safe space to talk about moving on and self-recovery',
    coverImageUrl: `${COVER_BASE}/demo-space-cover-2.jpg`,
    audioUrl: AUDIO.room1, // Reuse room 1 audio
    hostName: 'Dr. Maya Ross', hostAvatar: getDemoAvatar('Dr. Maya Ross'),
    category: 'Wellness', language: 'en', baseListenerCount: 189,
    speakers: [
      { id: 'demo-host-maya', name: 'Dr. Maya Ross', role: 'host', avatarGradient: 'from-sky-500 to-blue-500', avatarUrl: getDemoAvatar('Dr. Maya Ross') },
      { id: 'demo-sp-jordan', name: 'Jordan Ellis', role: 'co_host', avatarGradient: 'from-slate-500 to-gray-500', avatarUrl: getDemoAvatar('Jordan Ellis') },
    ],
  },
  // ── Hindi (3) ────────────────────────────────────────────
  {
    id: 'demo-room-6', hostId: 'demo-host-raj',
    title: 'Bollywood vs Hollywood Debate',
    description: 'Kya Bollywood ab Hollywood ke level pe hai? Suniye dono taraf ke arguments',
    coverImageUrl: `${COVER_BASE}/demo-space-cover-3.jpg`,
    audioUrl: AUDIO.room6,
    hostName: 'Raj Malhotra', hostAvatar: getDemoAvatar('Raj Malhotra'),
    category: 'Entertainment', language: 'hi', baseListenerCount: 423,
    speakers: [
      { id: 'demo-host-raj', name: 'Raj Malhotra', role: 'host', avatarGradient: 'from-orange-500 to-red-500', avatarUrl: getDemoAvatar('Raj Malhotra') },
      { id: 'demo-sp-ananya', name: 'Ananya Gupta', role: 'co_host', avatarGradient: 'from-pink-500 to-fuchsia-500', avatarUrl: getDemoAvatar('Ananya Gupta') },
      { id: 'demo-sp-vikram', name: 'Vikram Singh', role: 'speaker', avatarGradient: 'from-blue-500 to-cyan-500', avatarUrl: getDemoAvatar('Vikram Singh') },
    ],
  },
  {
    id: 'demo-room-7', hostId: 'demo-host-sunil',
    title: 'IPL Season - Best Team Debate',
    description: 'Kaun jeetega IPL? Mumbai, Chennai ya RCB? Join the argument!',
    coverImageUrl: `${COVER_BASE}/demo-space-cover.jpg`,
    audioUrl: AUDIO.room6, // Reuse Hindi audio
    hostName: 'Sunil Verma', hostAvatar: getDemoAvatar('Sunil Verma'),
    category: 'Sports', language: 'hi', baseListenerCount: 567,
    speakers: [
      { id: 'demo-host-sunil', name: 'Sunil Verma', role: 'host', avatarGradient: 'from-blue-600 to-indigo-600', avatarUrl: getDemoAvatar('Sunil Verma') },
      { id: 'demo-sp-ritu', name: 'Ritu Sharma', role: 'co_host', avatarGradient: 'from-red-500 to-pink-500', avatarUrl: getDemoAvatar('Ritu Sharma') },
      { id: 'demo-sp-amit', name: 'Amit Joshi', role: 'speaker', avatarGradient: 'from-yellow-500 to-orange-500', avatarUrl: getDemoAvatar('Amit Joshi') },
    ],
  },
  {
    id: 'demo-room-9', hostId: 'demo-host-swami',
    title: 'Dhyaan Aur Shanti - Meditation Talk',
    description: 'Mann ki shaanti aur dhyaan ke baare mein ek shantipoorna charcha',
    coverImageUrl: `${COVER_BASE}/demo-space-cover-3.jpg`,
    audioUrl: AUDIO.room6, // Reuse Hindi audio
    hostName: 'Swami Ananda', hostAvatar: getDemoAvatar('Swami Ananda'),
    category: 'Spirituality', language: 'hi', baseListenerCount: 145,
    speakers: [
      { id: 'demo-host-swami', name: 'Swami Ananda', role: 'host', avatarGradient: 'from-amber-400 to-yellow-500', avatarUrl: getDemoAvatar('Swami Ananda') },
      { id: 'demo-sp-meera', name: 'Meera Devi', role: 'co_host', avatarGradient: 'from-rose-400 to-pink-500', avatarUrl: getDemoAvatar('Meera Devi') },
    ],
  },
  // ── Spanish (1) ──────────────────────────────────────────
  {
    id: 'demo-room-10', hostId: 'demo-host-carlos',
    title: 'Messi vs Ronaldo - El Gran Debate',
    description: 'El debate eterno del fútbol. ¿Quién es el mejor de todos los tiempos?',
    coverImageUrl: `${COVER_BASE}/demo-space-cover.jpg`,
    audioUrl: AUDIO.room4, // Reuse comedy audio (energetic)
    hostName: 'Carlos Mendoza', hostAvatar: getDemoAvatar('Carlos Mendoza'),
    category: 'Sports', language: 'es', baseListenerCount: 389,
    speakers: [
      { id: 'demo-host-carlos', name: 'Carlos Mendoza', role: 'host', avatarGradient: 'from-green-500 to-emerald-500', avatarUrl: getDemoAvatar('Carlos Mendoza') },
      { id: 'demo-sp-isabella', name: 'Isabella Torres', role: 'co_host', avatarGradient: 'from-red-500 to-rose-500', avatarUrl: getDemoAvatar('Isabella Torres') },
      { id: 'demo-sp-diego', name: 'Diego Ruiz', role: 'speaker', avatarGradient: 'from-blue-500 to-sky-500', avatarUrl: getDemoAvatar('Diego Ruiz') },
    ],
  },
  // ── Arabic (1) ───────────────────────────────────────────
  {
    id: 'demo-room-13', hostId: 'demo-host-omar',
    title: 'Future of Technology in MENA',
    description: 'مستقبل التكنولوجيا في منطقة الشرق الأوسط وشمال أفريقيا',
    coverImageUrl: `${COVER_BASE}/demo-space-cover-2.jpg`,
    audioUrl: AUDIO.room3, // Reuse analysis audio
    hostName: 'Omar Hassan', hostAvatar: getDemoAvatar('Omar Hassan'),
    category: 'Technology', language: 'ar', baseListenerCount: 234,
    speakers: [
      { id: 'demo-host-omar', name: 'Omar Hassan', role: 'host', avatarGradient: 'from-teal-500 to-emerald-500', avatarUrl: getDemoAvatar('Omar Hassan') },
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
    host_avatar: s.coverImageUrl,
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
  host_avatar: s.coverImageUrl,
  category: s.category,
  cover_image_url: s.coverImageUrl,
}));

export const getAllDemoLiveSessions = () => sessions.map(s => ({
  id: s.id,
  title: s.title,
  host_id: s.hostId,
  host_name: s.hostName,
  host_avatar: s.coverImageUrl,
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
