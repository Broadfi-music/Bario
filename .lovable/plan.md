

# Fix: Stable Heatmap Data (Stop Random Track Switching)

## Problem

The `heatmap-tracks` edge function is designed to return **completely different tracks on every request**. It uses heavy randomization throughout:

- Randomly selects which artists to search for (line 140)
- Randomly picks between 4 different data-fetching strategies (line 180)
- Triple-shuffles all results (lines 217-220)
- Randomly selects Audius time ranges (line 244)
- Shuffles search results (line 233, 251)
- Double-shuffles final global results (line 688)
- Generates random `change24h`, `change7d`, `change30d` metrics on every call (lines 389, 436, 472-475, 488, 551-552)
- Searches random genres each time (line 671, 676)

This means every 2-minute auto-refresh, every page navigation, and every manual refresh shows a totally different set of music.

## Solution

Rewrite the `heatmap-tracks` edge function to return **deterministic, stable data**:

### 1. Edge Function Changes (`supabase/functions/heatmap-tracks/index.ts`)

**Remove all randomization from data fetching:**
- `getDeezerGlobalChart`: Use a single consistent strategy (chart endpoint only), remove triple shuffle, sort by Deezer rank instead
- `getDeezerCountryChart`: Use all artists instead of randomly selecting 10, remove shuffle, sort by Deezer rank
- `getAudiusTrending`: Use fixed time range (`week`), remove shuffle, keep original trending order
- `searchDeezer`: Remove shuffle from search results
- Global fetch (line 668-691): Remove random genre selection, use fixed sources, remove double shuffle

**Make metrics deterministic:**
- Replace `Math.random()` in `change24h`, `change7d`, `change30d` with seed-based values derived from track ID and current date (so they stay stable within the same day but change day-to-day)
- Replace `Math.random()` in `mindshare` calculations with deterministic values based on track popularity

**Keep stable sorting:**
- Sort all results by `attentionScore` descending (already done at line 703)
- Remove all `.sort(() => Math.random() - 0.5)` calls

### 2. Deterministic Metric Generation

Create a simple hash function that takes a track ID + today's date and produces a stable pseudo-random number. This ensures:
- Same tracks show the same metrics within a day
- Metrics naturally shift day to day
- No visual jumping or flickering

```text
function stableRandom(seed: string): number {
  // Simple hash -> stable number between 0 and 1
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 1000) / 1000;
}

// Usage: stableRandom(trackId + "2026-02-11") -> always same value today
```

### 3. Frontend Hook (No Changes Needed)

The `useHeatmapData.ts` hook already handles data correctly with 120-second refresh intervals. No frontend changes required -- the fix is entirely in the edge function.

## Technical Details

### Lines to modify in `heatmap-tracks/index.ts`:

| Area | Lines | Change |
|------|-------|--------|
| `getDeezerCountryChart` | 134-172 | Remove artist shuffle, use all artists, sort by rank |
| `getDeezerGlobalChart` | 177-226 | Single strategy (chart), remove triple shuffle |
| `searchDeezer` | 228-238 | Remove `.sort(() => Math.random() - 0.5)` |
| `getAudiusTrending` | 241-256 | Fixed `week` time range, remove shuffle |
| `formatSpotifyTrack` | 389 | Use `stableRandom` for `change24h` |
| `formatDeezerTrack` | 436, 472-475 | Use `stableRandom` for metrics |
| `formatAudiusTrackWithPreview` | 488, 551-552 | Use `stableRandom` for metrics |
| Global fetch block | 668-691 | Remove random genre, remove double shuffle |

### Expected Result

- Heatmap shows the **same tracks** on refresh and page navigation
- Tracks are sorted consistently by attention score
- Metrics (change24h, mindshare) remain stable within the same day
- Data still refreshes every 2 minutes but returns the same ranked list
- Country filtering still works correctly with stable results

