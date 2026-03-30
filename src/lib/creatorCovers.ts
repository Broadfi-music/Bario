import cover1 from '@/assets/creator-covers/cover-1.jpg';
import cover2 from '@/assets/creator-covers/cover-2.jpg';
import cover3 from '@/assets/creator-covers/cover-3.jpg';
import cover4 from '@/assets/creator-covers/cover-4.jpg';
import cover5 from '@/assets/creator-covers/cover-5.jpg';
import cover6 from '@/assets/creator-covers/cover-6.jpg';

const COVERS = [cover1, cover2, cover3, cover4, cover5, cover6];

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

/** Get a deterministic unique cover image for a user/creator by their ID or name */
export const getCreatorCover = (seed: string): string => {
  return COVERS[Math.abs(hashCode(seed)) % COVERS.length];
};
