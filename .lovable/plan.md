

# Fix Nigeria (and All Countries) to Show Currently Trending Music

## Problem
The current implementation searches for each artist's name on Deezer and sorts by `RANKING`, which returns their **all-time most popular** tracks (e.g., CKay's "love nwantiti" from 2021). This does NOT reflect what is trending right now in Nigeria or on streaming platforms.

## Root Cause
The Deezer free API does not provide country-specific real-time charts. The `order=RANKING` parameter returns lifetime popularity, not current trends.

## Solution
Modify the search strategy to bias toward **recent and currently active** tracks rather than all-time hits:

### 1. Search for recent releases instead of just artist names
Instead of searching `artist:"Wizkid"`, search for `artist:"Wizkid" 2025` or `artist:"Wizkid" 2026` to bias results toward newer tracks. If no results come back for the latest year, fall back to the previous year.

### 2. Use multiple search passes per artist
- First pass: Search `artist:"ArtistName"` with `order=RANKING` (current approach)
- Filter results to prefer tracks released in the last 12 months by checking the `release_date` field from the Deezer album data
- If an artist has no recent tracks, keep their top 1 all-time hit as a fallback

### 3. Supplement with Deezer editorial/genre playlists
- Search for genre-specific trending content like `"afrobeats 2026"` or `"amapiano new"` to capture currently hot tracks that may not be from the hardcoded artist list
- This catches rising artists not yet in the curated list

## Technical Changes

### File: `supabase/functions/heatmap-tracks/index.ts`

**Update `getLocalArtistTracks` function:**
- For each artist, fetch their top tracks AND check album release dates
- Prioritize tracks from albums released in the last 12 months
- Keep max 1 older "classic" hit per artist as fallback
- Add a supplementary search for `"afrobeats 2026 new"` (for NG), `"amapiano 2026"` (for ZA), etc.

**Add genre-based trending searches per country:**
```
Country genre map:
- NG: ["afrobeats 2026", "naija new music"]
- ZA: ["amapiano 2026", "south african music new"]  
- GH: ["ghana music 2026", "highlife new"]
- KE: ["kenyan music 2026", "gengetone new"]
- BR: ["funk brasileiro 2026", "sertanejo new"]
- KR: ["kpop 2026", "korean pop new"]
- JP: ["jpop 2026", "japanese music new"]
- etc.
```

**Update deduplication and ranking:**
- Tracks with recent release dates get a `recencyBonus` added to their `attentionScore`
- Formula: if released within last 6 months, add 50000 to attentionScore; within 12 months, add 25000
- This ensures new releases rank above old classics even if the old ones have higher lifetime Deezer rank

### Result
When selecting Nigeria, the chart will show:
- Top positions: Currently active/new releases from Nigerian artists (e.g., Asake's 2026 singles, Rema's latest, Ayra Starr's newest drops)
- Middle positions: Genre-trending tracks from the Afrobeats/Naija scene
- Lower positions: Global chart hits (international trending)
- Sprinkled in: 1-2 all-time classics per artist as recognizable anchors

This same logic applies to ALL country filters automatically.
