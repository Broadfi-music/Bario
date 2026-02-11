

# Use Real Deezer Country Chart Playlists for Country Filtering

## Problem

Currently, when a user selects a country (e.g., Nigeria), the system searches Deezer for tracks by a **hardcoded list of popular artists** from that country. This means:
- Only pre-listed artists appear -- breakout artists are missed
- Results are search-based, not chart-based, so they don't reflect what's actually trending
- The data doesn't update when real charts change

## Solution

Replace the hardcoded artist-search approach with **real Deezer country chart playlists** -- the same playlists that power Deezer's own "Top [Country]" charts. Each country has a specific playlist ID on Deezer that updates automatically with what's actually trending there.

### Changes to `supabase/functions/heatmap-tracks/index.ts`

**1. Add Deezer country chart playlist IDs**

A new mapping of country codes to Deezer playlist IDs (similar to the existing `spotifyCountryPlaylists`):

| Country | Playlist ID |
|---------|-------------|
| GLOBAL | 3155776842 |
| US | 1313621735 |
| UK | 1111141961 |
| NG | 2094756498 |
| GH | 4371498262 |
| ZA | 3430408142 |
| KE | 5765498882 |
| BR | 1111142221 |
| MX | 1116189381 |
| FR | 1109890291 |
| DE | 1111143121 |
| JP | 1116190041 |
| KR | 3843859162 |
| IN | 2489283764 |
| AU | 1362508475 |
| CA | 1652248171 |
| ES | 1116188681 |
| IT | 1116187241 |

**2. Create a new `getDeezerCountryPlaylist` function**

This function will:
- Fetch tracks from the real Deezer playlist for the given country using `https://api.deezer.com/playlist/{playlistId}/tracks?limit=50`
- Return tracks in their original chart order (which reflects actual trending position)
- Fall back to the global chart if the playlist fetch fails

**3. Update `getDeezerCountryChart` to use real playlists**

Replace the current logic (searching by artist names) with a call to the new playlist function. The hardcoded `countryArtistSearches` map will be kept as a fallback only -- if the playlist API fails, the system can still search by artist names.

**4. Keep Spotify playlists as-is**

The existing `spotifyCountryPlaylists` and `getSpotifyCountryTop50` already use real chart playlists, so no changes needed there.

### What This Means for Users

- Country filters will show **actually trending music** in each country, updated in real-time by Deezer
- New breakout artists will appear automatically when they chart
- Results will match what users see on Deezer's own country charts
- The experience stays stable (no random shuffling) while being genuinely live data

### Technical Notes

- Deezer playlist endpoint: `GET https://api.deezer.com/playlist/{id}/tracks?limit={n}`
- No authentication needed for Deezer public API
- Playlist IDs are sourced from Deezer's official chart playlists
- The `countryArtistSearches` map is retained as fallback but no longer the primary source

