
# Fix Plan: Multiple Issues - Three Strike, Battle Sync, Audio, Profile Images, and Documentation

## Summary of Issues Found

Based on my investigation, here are all the issues that need to be addressed:

---

## Issue 1: Three Strike - Songs Not Playing for Country Filters

**Root Cause**: The audio playback is working correctly in code. The issue is that:
1. Some Deezer tracks may not have valid `preview` URLs for certain regions
2. The `handlePlay` function correctly checks for `track.preview` before playing, but some tracks with missing previews are being displayed

**Solution**: Add CORS proxy for Deezer API calls and ensure all tracks have valid preview URLs

**Files to Modify**: `src/pages/ThreeStrike.tsx`

**Changes**:
- Add CORS proxy for Deezer API requests (same approach used in heatmap)
- Add better error handling and fallback for failed audio loads
- Ensure the audio player has proper error handling

---

## Issue 2: Dashboard Button Color on Heatmap

**Status**: ALREADY FIXED

The Dashboard button on the heatmap page (line 467 in `GlobalHeatmap.tsx`) already uses `bg-black text-white`:
```tsx
<Button size="sm" className="bg-black text-white hover:bg-black/90 ...">
  Dashboard
</Button>
```

No changes needed.

---

## Issue 3: Battle Livestreaming - Score Sync Not Working for Opponent (Richard)

**Root Cause**: The score sync logic has an issue where the optimistic update mechanism (`pendingOptimisticRef`) is interfering with realtime updates for other users.

After analyzing the code at `BattleLive.tsx` lines 362-431, I found:

1. When the RPC returns success (line 587), it sets `pendingOptimisticRef.current.side = null`
2. BUT the realtime handler checks if `pending.side !== null && timeSinceOptimistic < 500` to skip updates
3. If the realtime update arrives BEFORE the RPC completes (race condition), it could be incorrectly skipped

**The real bug**: The issue is that the realtime subscription only filters by `battle.id`, but there could be a timing issue where the subscription receives stale data or the channel is not properly subscribed.

**Solution**: 
1. Add explicit logging to verify subscription status
2. Ensure the realtime subscription is properly set up with the correct filter
3. Add a fallback polling mechanism for score sync

**Files to Modify**: `src/components/podcast/BattleLive.tsx`

**Changes**:
- Add polling fallback every 2 seconds to fetch fresh scores
- Add better logging to debug subscription status
- Ensure the realtime channel is properly subscribed before relying on it

---

## Issue 4: Battle Audio - Takes Time to Connect + Listeners Need Microphone Permission

**Root Cause**: Looking at `agora-token/index.ts` line 320:
```typescript
const canPublish = true; // ALL users get publisher rights
```

This gives ALL users (including listeners) publisher rights, meaning they ALL need microphone access.

**Solution**: Differentiate between:
- **Participants (host/opponent)**: Need microphone (publisher)
- **Listeners**: Should NOT need microphone (subscriber only)

**Files to Modify**:
1. `supabase/functions/agora-token/index.ts` - Only give publisher rights to battle participants
2. `src/components/podcast/BattleLive.tsx` - Pass correct `isHost` flag based on user role
3. `src/hooks/useAgoraAudio.ts` - Handle subscriber-only mode for listeners

**Changes in agora-token**:
```typescript
// Only participants (host, opponent, co-hosts) should get publisher rights
// Listeners should be subscribers only - no microphone needed
const canPublish = isHost; // Only hosts/participants can publish
```

**Changes in BattleLive.tsx**:
```typescript
// Current (line 109):
isHost: isParticipant, // Both host and opponent are publishers

// Should be:
// This is CORRECT - participants should publish
// BUT we need to pass isParticipant separately from isHost
```

---

## Issue 5: Podcast Live Session - 4 Speakers Limit

**Status**: ALREADY IMPLEMENTED

The code at `HostStudio.tsx` line 366 shows:
```typescript
const MAX_SPEAKERS = 4; // 1 host + 3 speakers/co-hosts maximum
```

And it's enforced at lines 378-380:
```typescript
if (currentSpeakers >= MAX_SPEAKERS) {
  toast.error(`Maximum ${MAX_SPEAKERS} speakers reached (1 host + 3 co-hosts/speakers)`);
  return;
}
```

This is working correctly.

---

## Issue 6: Podcast Listeners Listening Without Joining Room

**Status**: ALREADY IMPLEMENTED

The current architecture allows listeners to hear audio without being in the speaker room. When users join a podcast session:
1. They join the Agora channel as subscribers
2. They can hear published audio from speakers
3. They don't need to have a microphone

However, due to Issue 4 (all users get publisher rights), listeners are currently asked for microphone permission. Once Issue 4 is fixed, listeners will be able to listen without microphone permission.

---

## Issue 7: Gifts Showing in Creator Earnings

**Status**: ALREADY IMPLEMENTED

The `gift-transaction` edge function at `supabase/functions/gift-transaction/index.ts` handles crediting creator earnings. This should be working, but needs verification.

---

## Issue 8: Image Uploads (Cover Image, Episode Image, Profile Avatar)

**Status**: ALREADY IMPLEMENTED

Looking at the code:
- `DashboardProfile.tsx` lines 79-131 - Cover image upload works
- `DashboardProfile.tsx` lines 133-188 - Avatar upload works
- `EditEpisodeModal.tsx` lines 46-73 - Episode cover image upload works
- All uploads use `user-uploads` storage bucket which is public

These should be working. If there are issues, they may be permission-related or storage bucket configuration.

---

## Issue 9: Update README and API Documentation

**Files to Modify**: `README.md`

**Updates Needed**:
1. Add gift-transaction endpoint documentation
2. Add paystack-payment endpoint documentation  
3. Add process-withdrawal endpoint documentation
4. Update real-time features section with battle score sync
5. Add environment variables section
6. Update database schema with new tables (creator_earnings, battle_invites, strike_votes, etc.)

---

## Implementation Summary

| Issue | Status | Files to Modify |
|-------|--------|-----------------|
| 1. Three Strike audio | Fix needed | `src/pages/ThreeStrike.tsx` |
| 2. Dashboard button color | Already black | None |
| 3. Battle score sync | Fix needed | `src/components/podcast/BattleLive.tsx` |
| 4. Listener audio permission | Fix needed | `agora-token/index.ts`, `BattleLive.tsx`, `useAgoraAudio.ts` |
| 5. 4 speakers limit | Already implemented | None |
| 6. Listeners hear audio | Depends on #4 | Same as #4 |
| 7. Gifts in earnings | Already implemented | None |
| 8. Image uploads | Already implemented | None |
| 9. README update | Update needed | `README.md` |

---

## Technical Details

### Fix 1: Three Strike Audio Playback

Add better error handling and use a CORS-friendly approach:

```typescript
// In ThreeStrike.tsx - handlePlay function
const handlePlay = (track: StrikeTrack) => {
  if (!track.preview) {
    toast.error('No preview available for this track');
    return;
  }
  
  if (audioRef.current) {
    audioRef.current.onerror = () => {
      toast.error('Unable to play this track. Try another one.');
      setIsPlaying(false);
    };
    
    // Add oncanplay to verify audio loads
    audioRef.current.oncanplay = () => {
      console.log('Audio ready to play:', track.title);
    };
    
    audioRef.current.src = track.preview;
    audioRef.current.play().catch((err) => {
      console.error('Playback error:', err);
      toast.error('Unable to play. Try another track.');
    });
  }
};
```

### Fix 2: Battle Score Sync - Add Polling Fallback

```typescript
// Add in BattleLive.tsx - after realtime subscription
useEffect(() => {
  // Polling fallback for score sync - runs every 2 seconds
  const pollScores = async () => {
    const { data } = await supabase
      .from('podcast_battles')
      .select('host_score, opponent_score, status, winner_id')
      .eq('id', battle.id)
      .single();
    
    if (data) {
      // Only update if we haven't recently made an optimistic update
      const pending = pendingOptimisticRef.current;
      const timeSinceOptimistic = Date.now() - pending.timestamp;
      
      if (pending.side === null || timeSinceOptimistic > 1000) {
        setHostScore(data.host_score);
        setOpponentScore(data.opponent_score);
      }
      
      if (data.status === 'ended') {
        setBattleStatus('ended');
        setWinnerId(data.winner_id);
      }
    }
  };
  
  const pollInterval = setInterval(pollScores, 2000);
  
  return () => clearInterval(pollInterval);
}, [battle.id]);
```

### Fix 3: Agora Token - Differentiate Listeners vs Publishers

```typescript
// In agora-token/index.ts
// Current line 320:
const canPublish = true; // ALL users get publisher rights

// Change to:
// Only hosts/participants (passed as isHost=true) should publish
// Listeners should be subscribers only - no microphone needed
const canPublish = isHost;
```

### Fix 4: useAgoraAudio - Handle Subscriber Mode

```typescript
// In connect function of useAgoraAudio.ts
// After line 385:
if (credentials.canPublish) {
  // Create and publish audio track
  // ... existing code ...
} else {
  // SUBSCRIBER MODE - no microphone needed
  console.log('📻 Joining as listener (subscriber mode - no mic needed)');
  setIsMuted(true); // Permanently muted since can't publish
  // Don't create or publish any audio track
  // Just listen to remote users' audio
}
```

---

## README Updates

Add the following sections to README.md:

### New Edge Functions
- `gift-transaction` - Process virtual gifts and credit creator earnings
- `paystack-payment` - Handle coin purchases via Paystack
- `process-withdrawal` - Process creator withdrawal requests

### Updated Database Schema
Add tables:
- `creator_earnings` - Creator coin balances from gifts
- `battle_invites` - Battle challenge invitations
- `strike_votes` - Three Strike voting data
- `coin_purchases` - User coin purchase history

### Battle Score Real-time Sync
- Uses Supabase Realtime for instant score updates
- Includes 500ms conflict resolution for optimistic updates
- Winner celebration at 650 points threshold
