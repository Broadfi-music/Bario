import cover1 from '@/assets/podcast-cover-1.jpg';
import cover2 from '@/assets/podcast-cover-2.jpg';
import cover3 from '@/assets/podcast-cover-3.jpg';
import cover4 from '@/assets/podcast-cover-4.jpg';
import cover5 from '@/assets/podcast-cover-5.jpg';
import cover6 from '@/assets/podcast-cover-6.jpg';

const COVERS = [cover1, cover2, cover3, cover4, cover5, cover6];

const TITLE_MATCHES = [
  { test: /about ai/i, cover: cover1 },
  { test: /me and sai/i, cover: cover2 },
  { test: /^sesa$/i, cover: cover3 },
  { test: /me and drayze 2/i, cover: cover4 },
  { test: /me and drayze/i, cover: cover5 },
  { test: /technology|demo|goals|friendship/i, cover: cover6 },
];

const hashCode = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const getPodcastEpisodeCover = (title: string, hostId = '') => {
  const matched = TITLE_MATCHES.find((entry) => entry.test.test(title));
  if (matched) return matched.cover;
  return COVERS[hashCode(`${hostId}:${title}`) % COVERS.length];
};

export const getPodcastEpisodeDisplayCover = (episode: {
  cover_image_url?: string | null;
  host_id?: string | null;
  title: string;
}) => {
  return episode.cover_image_url || getPodcastEpisodeCover(episode.title, episode.host_id || '');
};