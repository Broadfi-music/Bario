
# Fix Country Filter: Mix of Real Charts + Local Artists

## Problem
The country filter currently searches ONLY for hardcoded artist names (Tyla, Kabza De Small, etc.) and returns their catalog tracks sorted by Deezer's internal popularity score. This does NOT reflect what's actually trending. The real Deezer South Africa chart shows Taylor Swift, Alex Warren, Benson Boone -- international hits that South Africans stream.

## Solution
Show BOTH: the real Deezer country chart (what people there are streaming) AND local artist tracks, blended together.

### How it will work
1. Fetch the real Deezer global chart filtered by country editorial playlist (or search "top South Africa 2025" as fallback)
2. Fetch top tracks from hardcoded local artists (Tyla, Kabza De Small, Oscar Mbo, etc.)
3. Interleave them: real chart tracks get positions 1-30, local artist tracks fill positions 31-60
4. Both sections preserve their internal ordering (chart position for real chart, Deezer rank for local artists)

## Technical Details

### File: `supabase/functions/heatmap-tracks/index.ts`

**Update `getCountryChart` function (lines 80-123)**:
- Split into two parallel fetches:
  - `getCountryChartPlaylist(countryCode)` -- fetches real trending chart using `https://api.deezer.com/search?q=top+hits+{country}+2025&order=RANKING`
  - `getLocalArtistTracks(countryCode)` -- keeps the existing artist search logic for local artists
- Merge results: chart tracks first (with high chartBonus), local artist tracks second (with moderate chartBonus)
- Deduplicate: if a local artist already appears in the chart, skip the duplicate

**Update `countryArtists` list for South Africa (line 30)**:
- Add missing current trending artists: Oscar Mbo, Musa Keys, Tyler ICU, Daliwonga, Kelvin Momo
- These are the artists actually charting on SA streaming platforms right now

**No changes needed to**:
- `formatDeezerTrack` -- already handles chartBonus correctly
- Frontend code -- the response format stays the same
- Global chart logic -- already uses the real Deezer global chart endpoint

### Result
When you select "South Africa":
- Top slots: whatever is actually trending there (could be Taylor Swift, Benson Boone, or local hits)
- Lower slots: guaranteed South African artists (Tyla, Kabza De Small, Oscar Mbo, etc.)
- Both sections clearly ranked by real popularity data
