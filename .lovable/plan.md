

# Fix Heatmap Country Filter to Show Real Trending Music

## Problem

The country filter is NOT showing actual trending music for each country. Instead, it searches for hardcoded artist names (e.g., "Tyla", "Kabza De Small" for South Africa) and prioritizes those search results over the real Deezer country chart playlist. This means users see artist catalog tracks ranked by Deezer's internal popularity score, not by what's actually trending in that country right now.

The same issue affects GLOBAL -- Spotify returns 404 for all playlists, so only the Deezer global chart is used, which is correct. But the Deezer chart endpoint (`/chart/0/tracks`) returns the actual real-time global chart, so that part is fine.

## Root Cause

In the `getDeezerCountryChart` function, artist search results are placed FIRST and playlist tracks fill the remaining slots. The merge logic (lines 207-227) does:
1. Add all artist search results first (sorted by Deezer's `rank` field -- which is a track's overall popularity, NOT chart position)
2. Then fill remaining with actual chart playlist tracks

This completely defeats the purpose of having country chart playlists.

## Solution

### Change 1: Use ONLY chart playlists for country data

Modify `getDeezerCountryChart` to use ONLY the Deezer country playlist. Remove the artist search merging entirely. Artist searches should only be used as a last-resort fallback if the playlist returns zero tracks.

This means:
- South Africa will show whatever is actually trending on Deezer's ZA chart
- Nigeria will show Deezer's NG chart
- etc.

### Change 2: Use Deezer's editorial chart playlists

The current playlist IDs may be user-created playlists rather than official Deezer editorial charts. Replace them with Deezer's official chart endpoint where available:
- Use `https://api.deezer.com/chart/{country_id}/tracks` for countries where Deezer has official charts
- Fall back to editorial playlists only where the chart endpoint is unavailable

Deezer provides country-specific charts at `https://api.deezer.com/chart/0/tracks` (global) but for country-specific, we should try using the editorial playlists endpoint or verified chart playlist IDs.

### Change 3: Keep playlist order as chart position

Currently, tracks are re-sorted by `attentionScore` (line 693), which destroys the original chart ordering. For country charts, the playlist order IS the chart position, so we should preserve it by using the original index as a significant factor in the attention score calculation.

## Technical Details

### File: `supabase/functions/heatmap-tracks/index.ts`

**Modify `getDeezerCountryChart` (lines 189-238)**:
- Remove the parallel artist search
- Use only `getDeezerCountryPlaylist` to get the actual chart
- Fall back to artist search ONLY if the playlist returns 0 tracks

**Modify `formatDeezerTrack` (lines 444-493)**:
- Factor in the chart position (index) more heavily into `attentionScore` so tracks maintain their chart order after the global sort

**Modify the country branch (lines 625-651)**:
- Since Spotify returns 404 for all country playlists, remove the Spotify call for country-specific queries to avoid wasted API calls and latency
- Rely solely on Deezer chart playlists for country data

**Modify the GLOBAL branch (lines 664-681)**:
- Remove the Spotify global call (also 404) to avoid latency
- Keep Deezer global chart + Audius trending as sources

### Summary of changes:
- 1 file modified: `supabase/functions/heatmap-tracks/index.ts`
- Artist search lists kept in code but only used as fallback when playlist returns nothing
- Chart position preserved in ranking
- Spotify calls removed (all returning 404) to improve response speed
- No database changes needed

