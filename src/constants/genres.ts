// Deezer's official genre categories - single source of truth for all genre lists
// Source: https://www.deezer.com/en/channels/explore/explore-tab

export const DEEZER_GENRES = [
  'Pop', 'Rap', 'Rock', 'R&B', 'Classical', 'Jazz', 'Soul & Funk',
  'Afro', 'Indie & Alternative', 'Latin Music', 'Dance & EDM',
  'Reggaeton', 'Electronic', 'Country', 'Metal', 'K-Pop',
  'Reggae', 'Blues', 'Folk', 'Lofi', 'Acoustic',
  'Caribbean', 'Japanese Music', 'AnimeVerse'
] as const;

// Heatmap/filter genres - includes "All" prefix
export const HEATMAP_GENRES = ['All', ...DEEZER_GENRES] as const;

// Upload genres - includes Amapiano + Other
export const UPLOAD_GENRES = [
  ...DEEZER_GENRES, 'Amapiano', 'Gospel', 'Instrumental', 'Other'
] as const;

// Remix/Create genres - lowercase slugs for AI remix engine
export const REMIX_GENRES = [
  'pop', 'rap', 'rock', 'r&b', 'classical', 'jazz', 'soul & funk',
  'afro', 'indie & alternative', 'latin music', 'dance & edm',
  'reggaeton', 'electronic', 'country', 'metal', 'k-pop',
  'reggae', 'blues', 'folk', 'lofi', 'acoustic',
  'caribbean', 'japanese music', 'amapiano', 'gospel', 'instrumental',
  'trap', 'funk', 'hiphop'
] as const;

// Deezer genre ID to genre name mapping
// From Deezer API: https://api.deezer.com/genre
export const DEEZER_GENRE_ID_MAP: Record<number, string> = {
  0: 'All',
  132: 'Pop',
  116: 'Rap',
  152: 'Rock',
  165: 'R&B',
  98: 'Classical',
  129: 'Jazz',
  169: 'Soul & Funk',
  2: 'Afro',             // Deezer uses genre_id 2 for African music
  85: 'Indie & Alternative',
  197: 'Latin Music',
  113: 'Dance & EDM',
  122: 'Reggaeton',
  106: 'Electronic',
  84: 'Country',
  464: 'Metal',
  173: 'K-Pop',
  144: 'Reggae',
  153: 'Blues',
  466: 'Folk',
  95: 'Acoustic',         // Closest Deezer mapping
  65: 'Caribbean',
  75: 'Japanese Music',
  // Additional common Deezer genre IDs
  168: 'R&B',
  174: 'Gospel',
  93: 'Amapiano',
  456: 'AnimeVerse',
};

// Helper to get genre name from Deezer genre_id
export function getGenreFromDeezerIdNum(genreId: number | undefined | null): string | null {
  if (genreId == null) return null;
  return DEEZER_GENRE_ID_MAP[genreId] || null;
}
