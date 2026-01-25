
# Fix Plan: Remaining Issues - Battle Score Sync, Three Strike Audio, and Button Color

## Summary of Verification Results

After thorough code verification, I found that most changes were implemented correctly. However, there are **3 critical issues** that need to be fixed:

---

## Issue 1: Battle Score Realtime Not Broadcasting All Columns (CRITICAL)

**Root Cause Found**: The `podcast_battles` table has `REPLICA IDENTITY DEFAULT`, which means Supabase Realtime only broadcasts the primary key on updates - NOT the `host_score` and `opponent_score` columns!

This is **THE main reason** why opponents can't see score updates in realtime. The 2-second polling fallback helps, but true realtime requires REPLICA IDENTITY FULL.

**Database Fix Required**:
```sql
ALTER TABLE public.podcast_battles REPLICA IDENTITY FULL;
```

This single change will enable Supabase Realtime to broadcast ALL column changes, including `host_score` and `opponent_score`, to all connected clients.

---

## Issue 2: Three Strike - Deezer API CORS Issue

**Root Cause**: The frontend is calling Deezer API directly from the browser:
```typescript
fetch(`https://api.deezer.com/search?q=${encodeURIComponent(artist)}&limit=5`)
```

Deezer's API may block cross-origin requests depending on the browser, causing tracks to fail to load for some users.

**Solution**: Route Deezer API calls through an existing edge function (like `heatmap-tracks`) that already handles CORS properly, OR use a CORS proxy pattern.

**Files to Modify**: `src/pages/ThreeStrike.tsx`

**Changes**:
1. Update the `fetchTracks` function to use the existing `heatmap-tracks` edge function with a country filter parameter
2. This edge function already handles Deezer API calls server-side, bypassing CORS

```typescript
// Instead of direct Deezer calls, use the edge function
const response = await supabase.functions.invoke('heatmap-tracks', {
  body: { country: selectedCountry, limit: 30 }
});
```

---

## Issue 3: Three Strike Dashboard Button Color

**Current State**: The Dashboard button on the Three Strike page (line 400-401) uses `bg-orange-500`, but the user wants it black like the Heatmap page.

**File to Modify**: `src/pages/ThreeStrike.tsx`

**Change**:
```typescript
// Line 400-401 - Change from:
<Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white text-xs">
  Dashboard
</Button>

// To:
<Button size="sm" className="bg-black text-white hover:bg-black/90 text-xs">
  Dashboard
</Button>
```

---

## Implementation Summary

| Issue | Type | Fix |
|-------|------|-----|
| Battle score realtime | Database | `ALTER TABLE podcast_battles REPLICA IDENTITY FULL` |
| Three Strike CORS | Code | Use `heatmap-tracks` edge function instead of direct API calls |
| Dashboard button | Code | Change `bg-orange-500` to `bg-black` in ThreeStrike.tsx |

---

## Technical Details

### Database Migration for Battle Score Realtime

This is the most critical fix. Once executed, ALL viewers (host, opponent, listeners) will see score updates instantly via WebSocket:

```sql
-- Enable full replica identity for real-time score broadcasting
ALTER TABLE public.podcast_battles REPLICA IDENTITY FULL;
```

**Why this matters**:
- DEFAULT replica identity only sends primary key on UPDATE
- FULL replica identity sends ALL columns on UPDATE
- Supabase Realtime needs to see the new `host_score` and `opponent_score` values to broadcast them

### Three Strike Audio Fix - Use Edge Function

The `heatmap-tracks` edge function already:
1. Calls Deezer and Audius APIs server-side
2. Handles CORS properly
3. Filters by country
4. Returns tracks with preview URLs

We can reuse this for Three Strike:

```typescript
const fetchTracks = async () => {
  setLoading(true);
  try {
    // Use edge function to bypass CORS and get country-specific tracks
    const { data, error } = await supabase.functions.invoke('heatmap-tracks', {
      body: JSON.stringify({ 
        country: selectedCountry === 'GLOBAL' ? '' : selectedCountry,
        limit: 40,
        includeAudius: selectedCountry === 'GLOBAL'
      })
    });
    
    if (error || !data?.tracks) {
      throw new Error('Failed to fetch tracks');
    }
    
    // Map to StrikeTrack format
    const strikeTracks = data.tracks
      .filter((track: any) => track.preview_url)
      .map((track: any, index: number) => ({
        id: track.id,
        title: track.title,
        artist: track.artist_name,
        artwork: track.cover_image_url || '/src/assets/card-1.png',
        preview: track.preview_url,
        strikes: 0,
        saves: 0,
        position: index + 1,
        isHot: index < 5,
        momentum: 'stable',
        genre: track.genre || 'Pop',
        country: selectedCountry,
      }));
    
    // Fetch vote counts and merge...
    // ... rest of existing logic
  } catch (error) {
    console.error('Error:', error);
    toast.error('Failed to load tracks');
  }
};
```

---

## Testing Checklist After Implementation

### Battle Score Sync:
1. Open battle on Device A (host) and Device B (opponent)
2. Host double-taps - opponent should see score update INSTANTLY (not after 2 seconds)
3. Opponent double-taps - host should see score update INSTANTLY
4. Listener device should also see both scores update in realtime

### Three Strike Audio:
1. Select Nigeria - should see Wizkid, Burna Boy tracks
2. Click play on any track - should play without errors
3. Select USA - should see Drake, Taylor Swift tracks
4. Select UK - should see Central Cee, Ed Sheeran tracks

### Button Color:
1. Navigate to Three Strike page
2. Dashboard button should be black (not orange)
