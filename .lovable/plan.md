

# Fix Plan: Battle Score Real-time Sync + Three Strike Country Filter

## Summary

Two critical issues need to be fixed:

1. **Battle Score Sync Not Working for All Viewers**: When someone double-taps, only they see the score change - opponents and listeners don't see it
2. **Three Strike Country Filter Not Working**: All countries show the same global tracks instead of country-specific trending music

---

## Issue 1: Battle Score Real-time Sync

### Root Cause Analysis

After deep investigation, I found the bug is in the realtime update logic in `BattleLive.tsx`. The current approach has a fundamental flaw:

**Current Problem:**
The code compares incoming realtime scores with local ref values to determine if a change occurred:

```javascript
const hostChanged = newHostScore !== hostScoreRef.current;
```

This fails because:
1. When User A double-taps, they update their local state and refs optimistically
2. The effect that syncs refs runs BEFORE the realtime handler
3. So when realtime arrives, User A's refs already match - no "change" is detected
4. For User B, the comparison should work, but there's still a subtle issue with how the state is managed

**The Real Fix:**
The realtime handler should NOT rely on comparing with local refs at all. Instead:
1. The user who tapped should skip the update (tracked via `pendingOptimisticRef`)
2. Everyone else should ALWAYS apply the database values unconditionally

### Technical Solution

**File: `src/components/podcast/BattleLive.tsx`**

Replace the realtime handler logic (lines 363-438) with a simpler, more robust approach:

```typescript
useEffect(() => {
  const channel = supabase
    .channel(`battle-status-${battle.id}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'podcast_battles',
        filter: `id=eq.${battle.id}`
      },
      (payload: any) => {
        const newHostScore = payload.new.host_score;
        const newOpponentScore = payload.new.opponent_score;
        
        console.log('🔴 Battle realtime update - DB:', newHostScore, newOpponentScore);
        
        // Check if we recently made an optimistic update
        const pending = pendingOptimisticRef.current;
        const timeSinceOptimistic = Date.now() - pending.timestamp;
        
        // Only skip if WE just tapped within the last 500ms
        // Use the RPC response as the final source of truth instead
        if (pending.side !== null && timeSinceOptimistic < 500) {
          console.log('⏳ Skipping realtime - we just tapped:', pending.side);
          // Still check for winner threshold
          checkWinnerThreshold(newHostScore, newOpponentScore);
          return;
        }
        
        // ALWAYS apply database values for everyone else
        console.log('✅ Applying realtime scores:', newHostScore, newOpponentScore);
        setHostScore(newHostScore);
        setOpponentScore(newOpponentScore);
        
        // Check for 650 threshold winner
        checkWinnerThreshold(newHostScore, newOpponentScore);
        
        // Handle status changes
        if (payload.new.status === 'ended') {
          setBattleStatus('ended');
          setWinnerId(payload.new.winner_id);
          disconnectAudio();
          
          if (!payload.new.winner_id) {
            toast.info('Battle ended');
            setTimeout(() => {
              onClose();
              navigate('/podcasts');
            }, 1000);
          }
        } else if (payload.new.status) {
          setBattleStatus(payload.new.status);
        }
        
        if (payload.new.winner_id) {
          setWinnerId(payload.new.winner_id);
        }
      }
    )
    .subscribe((status) => {
      console.log('📡 Battle realtime subscription status:', status);
    });

  return () => {
    supabase.removeChannel(channel);
  };
}, [battle.id, disconnectAudio, navigate, onClose, checkWinnerThreshold]);
```

**Key Changes:**
1. Remove the complex `hostChanged`/`opponentChanged` comparison logic
2. Simply check if WE tapped recently - if yes, skip; if no, ALWAYS apply
3. Add subscription status logging for debugging
4. Remove dependency on hostScoreRef/opponentScoreRef in the comparison (they can still be kept for other purposes)

**Also fix the pendingOptimisticRef clearing (line 594):**
Don't clear `side` immediately after RPC - let it naturally expire via the 500ms window:

```typescript
// After RPC success:
// Do NOT reset side to null - let the 500ms window expire naturally
// This ensures we skip the realtime update that follows
```

---

## Issue 2: Three Strike Country Filter

### Root Cause

Lines 112-114 in `ThreeStrike.tsx` show the bug:

```javascript
const chartUrl = selectedCountry === 'GLOBAL' 
  ? 'https://api.deezer.com/chart/0/tracks?limit=20'
  : `https://api.deezer.com/chart/0/tracks?limit=20`;  // SAME URL!
```

The Deezer API URL is IDENTICAL for all countries - it always fetches global charts!

### Technical Solution

**File: `src/pages/ThreeStrike.tsx`**

Use the same country-specific artist search approach that's already working in the heatmap:

```typescript
// Add country artist mapping (same as heatmap-tracks edge function)
const countryArtists: Record<string, string[]> = {
  'GLOBAL': ['Drake', 'Taylor Swift', 'The Weeknd', 'Bad Bunny', 'BTS'],
  'US': ['Drake', 'Kendrick Lamar', 'Taylor Swift', 'The Weeknd', 'SZA', 'Post Malone', 'Travis Scott', 'Morgan Wallen', 'Billie Eilish', 'Doja Cat'],
  'UK': ['Central Cee', 'Ed Sheeran', 'Dua Lipa', 'Dave', 'Stormzy', 'Little Simz', 'Tion Wayne', 'Headie One'],
  'NG': ['Wizkid', 'Burna Boy', 'Davido', 'Rema', 'Asake', 'Ayra Starr', 'Tems', 'Omah Lay', 'Ckay', 'Fireboy DML', 'Shallipopi', 'Seyi Vibez'],
  'GH': ['Sarkodie', 'Shatta Wale', 'Stonebwoy', 'Black Sherif', 'King Promise', 'Gyakie', 'Camidoh'],
  'ZA': ['Tyla', 'Kabza De Small', 'DJ Maphorisa', 'Nasty C', 'Cassper Nyovest', 'Master KG', 'Focalistic'],
  'KE': ['Sauti Sol', 'Nyashinski', 'Khaligraph Jones', 'Otile Brown'],
  'BR': ['Anitta', 'Ludmilla', 'MC Livinho', 'Luisa Sonza', 'Pedro Sampaio'],
  'JP': ['YOASOBI', 'Ado', 'King Gnu', 'Fujii Kaze', 'Mrs. GREEN APPLE', 'Kenshi Yonezu'],
  'KR': ['BTS', 'BLACKPINK', 'Stray Kids', 'NewJeans', 'aespa', 'IVE', 'LE SSERAFIM', 'SEVENTEEN'],
  'FR': ['Aya Nakamura', 'Jul', 'Ninho', 'Damso', 'Gazo', 'Tiakola'],
  'DE': ['Apache 207', 'Luciano', 'RAF Camora', 'Capital Bra', 'Bonez MC'],
};

// Updated fetchTracks function:
const fetchTracks = async () => {
  setLoading(true);
  try {
    let allTracks: any[] = [];
    
    // Get country-specific artists
    const artists = countryArtists[selectedCountry] || countryArtists['GLOBAL'];
    
    // Fetch from Deezer using artist search for country-specific content
    try {
      const searchPromises = artists.slice(0, 6).map(artist =>
        fetch(`https://api.deezer.com/search?q=${encodeURIComponent(artist)}&limit=5`)
          .then(r => r.json())
          .then(d => d.data || [])
          .catch(() => [])
      );
      
      const results = await Promise.all(searchPromises);
      const deezerTracks = results.flat();
      
      if (deezerTracks.length > 0) {
        allTracks = deezerTracks
          .filter((track: any) => track.preview) // Only tracks with playable preview
          .map((track: any) => ({
            id: `deezer-${track.id}`,
            title: track.title,
            artist: track.artist.name,
            artwork: track.album?.cover_medium || track.album?.cover || '/src/assets/card-1.png',
            preview: track.preview,
            source: 'deezer'
          }));
      }
    } catch (deezerError) {
      console.warn('Deezer API error:', deezerError);
    }
    
    // Add Audius tracks (global indie music - only for GLOBAL filter)
    if (selectedCountry === 'GLOBAL') {
      try {
        const audiusResponse = await fetch('https://discoveryprovider.audius.co/v1/tracks/trending?limit=10&app_name=Bario');
        const audiusData = await audiusResponse.json();
        
        if (audiusData.data) {
          const audiusTracks = audiusData.data
            .filter((track: any) => track.artwork?.['480x480'])
            .map((track: any) => ({
              id: `audius-${track.id}`,
              title: track.title,
              artist: track.user?.name || 'Unknown Artist',
              artwork: track.artwork?.['480x480'] || '/src/assets/card-1.png',
              preview: `https://discoveryprovider.audius.co/v1/tracks/${track.id}/stream?app_name=Bario`,
              source: 'audius'
            }));
          
          allTracks = [...allTracks, ...audiusTracks];
        }
      } catch (audiusError) {
        console.warn('Audius API error:', audiusError);
      }
    }
    
    // Rest of the function remains the same...
  }
};
```

---

## Summary of Changes

| File | Change | Purpose |
|------|--------|---------|
| `src/components/podcast/BattleLive.tsx` | Simplify realtime handler - remove ref comparison | Ensure ALL viewers see score updates |
| `src/components/podcast/BattleLive.tsx` | Don't clear pendingOptimisticRef.side after RPC | Prevent flickering for the tapper |
| `src/pages/ThreeStrike.tsx` | Add country-specific artist mapping | Show Nigeria music for Nigeria, USA music for USA, etc. |
| `src/pages/ThreeStrike.tsx` | Use Deezer artist search instead of global chart | Accurate country filtering |

---

## Testing Checklist

### Battle Score Sync:
1. Open battle on Device A and Device B (different users)
2. User A double-taps host side
3. Verify User B sees score change to 25 immediately
4. User B double-taps opponent side
5. Verify User A sees opponent score change to 25

### Three Strike Country Filter:
1. Open Three Strike page
2. Select Nigeria - verify you see Wizkid, Burna Boy, Davido tracks
3. Select USA - verify you see Drake, Taylor Swift, The Weeknd tracks
4. Select UK - verify you see Central Cee, Ed Sheeran, Dave tracks
5. Click play on any track - verify audio plays

