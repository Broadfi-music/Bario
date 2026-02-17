

# Fix All Genres on Bario Using Deezer's Official Genre Categories

## Problem
The current genre list across Bario is limited and inconsistent:
- **Heatmap edge function**: `['All', 'Pop', 'Hip-Hop', 'R&B', 'Rock', 'Electronic', 'Reggaeton', 'Latin', 'Afrobeats', 'K-Pop']` (only 9 genres)
- **Upload page**: `['Pop', 'Hip-Hop', 'R&B', 'Rock', 'Electronic', 'Afrobeats', 'Amapiano', 'Reggae', 'Jazz', 'Classical', 'Country', 'Latin', 'K-Pop', 'Other']`
- **BarioMusic page**: `['Pop', 'Hip-Hop', 'R&B', 'Afrobeats', 'Amapiano', 'Electronic', 'Rock', 'Jazz']`
- **Create/NewRemix pages**: `['amapiano', 'trap', 'funk', 'hiphop', 'country', '80s', 'R&B', 'soul', 'pop', 'genz', 'jazz', 'reggae', 'gospel', 'instrumental']`

These are incomplete compared to Deezer's official genre catalog and inconsistent with each other.

## Deezer's Official Genre Categories (from Explore page)
From the Deezer Explore page, the full "Explore all" genre list is:
Pop, Rap, Rock, R&B, Classical, Jazz, Soul & Funk, Afro, Indie & Alternative, Latin Music, Dance & EDM, Reggaeton, Electronic, Country, Metal, K-Pop, Reggae, Blues, Folk, Lofi, Acoustic, Caribbean, Japanese Music, AnimeVerse

## Solution

### 1. Create a shared genre constants file
Create `src/constants/genres.ts` to define a single source of truth for all genre lists used across the app.

**Heatmap/Filter genres** (most relevant for charts -- 18 genres):
```
All, Pop, Rap, Rock, R&B, Afro, Dance & EDM, Electronic, Latin, Reggaeton, K-Pop, Jazz, Soul & Funk, Classical, Country, Indie & Alternative, Reggae, Metal, Blues, Lofi, Folk, Caribbean, Acoustic, Japanese Music
```

**Upload genres** (for user uploads -- same list plus "Other" and "Amapiano"):
Same as above plus Amapiano and Other

**Remix/Create genres** (for AI remix -- keeps current style but aligned):
Same core genres mapped to lowercase slugs

### 2. Update the edge function genre list
In `supabase/functions/heatmap-tracks/index.ts`, update:
- The `genres` array (line 547) to match the full Deezer genre set
- The genre search logic (line 773-776) to properly search Deezer using the correct genre names

### 3. Update all frontend genre lists
Update genre arrays in:
- `src/pages/GlobalHeatmap.tsx` -- uses genres from the hook (auto-updated from API)
- `src/pages/Upload.tsx` -- line 217
- `src/pages/BarioMusic.tsx` -- line 44
- `src/pages/Create.tsx` -- line 61
- `src/pages/NewRemix.tsx` -- line 41

### 4. Fix genre assignment on tracks
Currently tracks default to `'Pop'` or `'Electronic'` as fallback genre. Update `formatDeezerTrack` to use Deezer's genre_id field to assign proper genres using a mapping from Deezer genre IDs to genre names.

## Technical Details

### New file: `src/constants/genres.ts`
Exports:
- `HEATMAP_GENRES` -- full list for chart filtering
- `UPLOAD_GENRES` -- for upload form
- `REMIX_GENRES` -- for remix/create forms
- `DEEZER_GENRE_ID_MAP` -- maps Deezer numeric genre IDs to genre names

### Edge function changes (`supabase/functions/heatmap-tracks/index.ts`)
- Update `genres` constant to full Deezer-aligned list
- Add `deezerGenreIdMap` to map `track.genre_id` from Deezer API responses to correct genre names
- Update `formatDeezerTrack` to use `track.album?.genre_id` for genre assignment instead of hardcoded fallbacks
- Update genre search (line 773-776) to use proper Deezer genre terms

### Frontend page changes
- Import from shared constants file
- Replace hardcoded genre arrays with imported constants

