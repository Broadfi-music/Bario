
# Fix Country Filter: Replace Invalid Playlist IDs with Verified Deezer Chart IDs

## Problem Found

I tested every single Deezer playlist ID in the code by calling the Deezer API directly. The results are bad -- most IDs are **wrong, empty, or returning errors**:

- **Nigeria (NG)**: ID `2094756498` returns a "no data" error -- completely broken
- **UK and Brazil are swapped**: UK points to Brazil's playlist and vice versa
- **Ghana (GH)**: ID `4371498262` returns empty (0 tracks)
- **Kenya (KE)**: ID `5765498882` returns empty (0 tracks)
- **South Korea (KR)**: ID `3843859162` returns empty (0 tracks)
- **India (IN)**: ID `2489283764` returns empty (0 tracks)
- **Japan (JP)**: ID `1116190041` is actually Spain's chart
- **South Africa (ZA)**: ID `3430408142` is a random old playlist with Coldplay/Imagine Dragons, not a chart

This means when users filter by country, they're seeing either foreign music, old random playlists, or the system falls back to hardcoded artist searches -- which is exactly the problem you're seeing.

## Solution

Replace all broken playlist IDs with the **verified official Deezer Charts playlist IDs** that I confirmed are working and returning real trending data right now.

### Verified Correct Playlist IDs

| Country | Wrong ID (current) | Correct ID (verified) |
|---------|-------------------|----------------------|
| GLOBAL | 3155776842 | 3155776842 (no change) |
| US | 1313621735 | 1313621735 (no change) |
| UK | 1111141961 | **1111142221** |
| NG | 2094756498 | **1362516565** |
| GH | 4371498262 | **removed** (no official Deezer chart -- will use artist fallback) |
| ZA | 3430408142 | **1362528775** |
| KE | 5765498882 | **1362509215** |
| BR | 1111142221 | **1111141961** |
| MX | 1116189381 | **1111142361** |
| JP | 1116190041 | **1362508955** |
| KR | 3843859162 | **1362510315** |
| IN | 2489283764 | **removed** (no official Deezer chart -- will use artist fallback) |
| AU | 1362508475 | **1313616925** |
| CA | 1652248171 | 1652248171 (no change, verified working) |
| ES | 1116188681 | **1116190041** |
| IT | 1116187241 | 1116187241 (no change, verified working) |
| FR | 1109890291 | 1109890291 (no change, verified working) |

### File to Change

**`supabase/functions/heatmap-tracks/index.ts`** -- Update the `deezerCountryPlaylists` mapping with the corrected IDs. Remove Ghana and India from the playlist map (they don't have official Deezer Charts playlists, so they'll correctly fall back to the artist search approach).

### What This Fixes

- Nigeria will show actual Nigerian trending music (Ayra Starr, Wizkid, etc.)
- UK will show UK charts, not Brazilian music
- Brazil will show Brazilian charts, not UK music
- Japan will show Japanese charts, not Spanish music
- South Africa will show current SA trending, not a 2017 Coldplay playlist
- Kenya and South Korea will show real chart data instead of empty results
- Ghana and India will use the existing artist fallback (Sarkodie, Arijit Singh, etc.) since Deezer doesn't maintain official charts for these countries
