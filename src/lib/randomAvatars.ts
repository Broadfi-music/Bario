// Random avatar and cover image generation for users and demo profiles
// Uses DiceBear API for consistent, unique avatars based on seed strings

const AVATAR_STYLES = [
  'adventurer',
  'adventurer-neutral', 
  'avataaars',
  'big-ears',
  'big-smile',
  'bottts',
  'fun-emoji',
  'lorelei',
  'micah',
  'miniavs',
  'personas',
  'pixel-art',
];

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
  'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
  'linear-gradient(135deg, #f5576c 0%, #ff9a9e 100%)',
  'linear-gradient(135deg, #667eea 0%, #43e97b 100%)',
];

/**
 * Generate a random DiceBear avatar URL for a given seed (username, id, etc.)
 */
export const getRandomAvatarUrl = (seed: string): string => {
  const style = AVATAR_STYLES[Math.abs(hashCode(seed)) % AVATAR_STYLES.length];
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
};

/**
 * Generate a random cover image URL using a gradient-based SVG via DiceBear shapes
 */
export const getRandomCoverUrl = (seed: string): string => {
  return `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(seed)}&size=800&backgroundColor=0a0a0a,1a1a2e,16213e,1b1b2f,2d132c`;
};

/**
 * Get a random cover gradient CSS string (for inline styles)
 */
export const getRandomCoverGradient = (seed: string): string => {
  const index = Math.abs(hashCode(seed)) % COVER_GRADIENTS.length;
  return COVER_GRADIENTS[index];
};

/**
 * Simple hash function for deterministic randomness from a string
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

/**
 * Pre-defined demo avatars for the demo session speakers and chatters
 */
export const DEMO_AVATARS: Record<string, string> = {};

// Pre-generate avatars for demo users
const DEMO_NAMES = [
  'Solomon Harvey', 'Mind Coach', 'Wisdom Seeker',
  'ThoughtLeader', 'MindfulMike', 'WisdomSeeker', 'GrowthMaster', 'DeepThinker',
  'SoulfulSara', 'ConsciousCris', 'PositivePete', 'BookWorm', 'LearnDaily',
  'AudioLover', 'ZenMaster', 'ShareTheWisdom', 'TransformNow', 'BookReviewer',
  'PhilosophyFan', 'ValueSeeker', 'MorningRitual', 'ClassicReader', 'MasterMind',
  'EarlyRiser', 'WorkLifeBalance', 'PeacefulListener', 'InnerPeace', 'SaveForLater',
];

DEMO_NAMES.forEach(name => {
  DEMO_AVATARS[name] = getRandomAvatarUrl(name);
});

/**
 * Get avatar for a demo user by name
 */
export const getDemoAvatar = (name: string): string => {
  if (DEMO_AVATARS[name]) return DEMO_AVATARS[name];
  // Generate on the fly for unknown names
  return getRandomAvatarUrl(name);
};
