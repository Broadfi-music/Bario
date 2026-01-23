
# Comprehensive Fix Plan: Battle Sync, Heatmap Update, Three Strike & Audio Issues

## Summary of Issues to Fix

Based on my investigation, I've identified 8 distinct issues that need to be addressed:

1. **Heatmap Top Performing Music Update** - Refresh with latest trending music from Deezer, Audius across USA, Nigeria and other countries
2. **Three Strike Page Functionality** - Make the voting/strike system functional with database persistence
3. **Hide Agora Error Messages** - Suppress all Agora-related error toasts from users
4. **Battle Score Double-Tap Sync Issue** - Both creators must see score updates in real-time (currently one-sided)
5. **Battle Session Cancellation Bug** - Sessions are ending unexpectedly during double-tapping
6. **Battle Winner Announcement Accuracy** - Winner calculation needs to be fixed
7. **Battle Navigation Issue** - Redirect to correct battle session, not podcast live session
8. **Listener Audio Playback** - Ensure listeners can hear audio in battles and podcasts

---

## Root Cause Analysis

### Issue 4 & 5: Battle Score Sync Problems

**Current Problem**:
Looking at the battle data:
- Battle `ac7f41a9...`: host_score=900, opponent_score=150 - scores ARE being recorded
- The `increment_battle_score` RPC function is correctly using `SECURITY DEFINER` for atomic updates

**Root Cause**: The optimistic update conflict resolution is working, BUT:
1. The 500ms window may be too short for high-latency connections
2. The realtime subscription updates ARE overwriting in some edge cases
3. The RPC returns the new scores but they're not being used to update local state

**Solution**: Use the RPC response data to set the definitive scores instead of relying purely on optimistic + realtime

### Issue 6: Battle Cancellation

**Root Cause**: When rapid double-taps occur, multiple RPC calls may fail and trigger error toasts + rollbacks, potentially causing state inconsistency. Also, error messages about Agora (UID_CONFLICT, WS_ABORT) are disrupting the user experience.

### Issue 8: Listener Audio

**Current Implementation**: Listeners join the Agora channel but with `canPublish: false`. They should be subscribing to remote audio tracks. This is already implemented in the `user-published` handler at line 351-361 of `useAgoraAudio.ts`.

---

## Technical Implementation Plan

### 1. Update Heatmap Top Performing Music

**File**: `src/pages/GlobalHeatmap.tsx`

**Changes**:
- The heatmap already fetches from Deezer, Spotify, and Audius via the `heatmap-tracks` edge function
- The edge function at `supabase/functions/heatmap-tracks/index.ts` already has country-specific filtering
- Need to ensure the "Top Performing" section displays fresh data with explicit country support

**Implementation**:
- Update the `topPerforming` filter to use the latest tracks from selected country
- Add a refresh button to force fetch new data
- Ensure country filtering works properly for USA (US), Nigeria (NG), etc.

### 2. Make Three Strike Page Functional

**File**: `src/pages/ThreeStrike.tsx`

**Current State**: Page exists with mock voting logic (local state only)

**Changes**:
1. Create database table `strike_votes` to persist votes
2. Implement real voting with database persistence
3. Add leaderboard showing tracks with most strikes
4. Connect to real trending music from Deezer/Audius APIs

**Database Migration Required**:
```sql
CREATE TABLE strike_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  vote_type TEXT NOT NULL CHECK (vote_type IN ('strike', 'save')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(track_id, user_id)
);

-- Enable RLS
ALTER TABLE strike_votes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to vote
CREATE POLICY "Users can create votes" ON strike_votes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Allow anyone to read votes  
CREATE POLICY "Anyone can read votes" ON strike_votes
  FOR SELECT USING (true);
```

### 3. Hide Agora Error Messages from Users

**Files**: 
- `src/hooks/useAgoraAudio.ts`
- `src/components/podcast/BattleLive.tsx`

**Changes**:
1. Replace all `toast.error('...')` calls for Agora-related errors with `console.error()`
2. Remove user-facing error messages for: UID_CONFLICT, WS_ABORT, connection errors
3. Only show success toasts (e.g., "Connected to audio room!")

**Specific Changes**:
- Line 443-449 in `useAgoraAudio.ts`: Remove UID_CONFLICT toast
- Line 416-418: Remove microphone permission error toast (replace with console.warn)
- Line 449: Remove "Failed to connect" toast

### 4. Fix Battle Score Double-Tap Sync

**File**: `src/components/podcast/BattleLive.tsx`

**Root Cause Analysis**:
The current implementation:
1. Does optimistic local update (line 480-484)
2. Calls RPC to increment score (line 494-498)
3. RPC returns the actual new scores BUT they're not used
4. Realtime subscription fires and may overwrite with stale data

**Fix Strategy**:
1. **Use RPC response as source of truth**: When the RPC returns, update both scores from the response
2. **Increase conflict window**: Change from 500ms to 800ms for better reliability
3. **Broadcast score updates**: After successful RPC, ensure both users get the same scores

**Implementation**:
```typescript
// After successful RPC (line 510-512), use the returned data
if (data) {
  // Set both scores from the atomic database response
  setHostScore(data.host_score);
  setOpponentScore(data.opponent_score);
  // Update timestamp to prevent realtime overwrite
  lastOptimisticUpdateRef.current = Date.now();
}
```

### 5. Fix Battle Session Cancellation Bug

**File**: `src/components/podcast/BattleLive.tsx`

**Root Cause**: The battle status subscription detects `status: 'ended'` and navigates away. This may be triggered by:
1. Race conditions in database updates
2. Multiple error rollbacks causing confusion

**Fix**:
1. Add a `isNavigatingAway` ref to prevent multiple navigation attempts
2. Don't navigate away on error rollbacks
3. Add confirmation before ending battle on leave

### 6. Fix Battle Winner Announcement Accuracy

**File**: `src/components/podcast/BattleLive.tsx`

**Current Logic** (line 200-266):
- Winner is determined by comparing `hostScore` vs `opponentScore`
- Issue: Local state might be stale when determining winner

**Fix**:
1. Before determining winner, fetch fresh scores from database
2. Use the database values to determine winner, not local state

### 7. Fix Battle Navigation (Battle vs Podcast Session)

**Files**: 
- `src/pages/Podcasts.tsx`
- `src/components/podcast/BattleLive.tsx`

**Current Issue**: When returning to a battle, users are taken to podcast session instead

**Fix**:
1. In `Podcasts.tsx`, the battle parameter handling is at lines 158-204
2. Ensure `showBattleSession` state is set correctly when battle URL is detected
3. In `BattleLive.tsx` line 260-265, ensure navigation goes to `/podcasts?battle=ID` not just `/podcasts`

### 8. Confirm Listener Audio Playback

**File**: `src/hooks/useAgoraAudio.ts`

**Current Implementation** (lines 351-361):
```typescript
client.on('user-published', async (user, mediaType) => {
  if (mediaType === 'audio') {
    await client.subscribe(user, mediaType);
    user.audioTrack?.play(); // This plays audio for listeners
    updateParticipants();
  }
});
```

**Status**: Already implemented correctly. Listeners automatically hear audio when hosts publish.

**Verification Needed**: Test to confirm the audio is playing. May need to add volume controls for listeners.

---

## File Changes Summary

| File | Type | Changes |
|------|------|---------|
| `src/components/podcast/BattleLive.tsx` | Edit | Fix score sync, hide errors, fix winner accuracy, fix navigation |
| `src/hooks/useAgoraAudio.ts` | Edit | Hide Agora error toasts, only console log errors |
| `src/pages/GlobalHeatmap.tsx` | Edit | Add refresh for top performing, ensure country filter works |
| `src/pages/ThreeStrike.tsx` | Edit | Add database persistence for votes, real API data |
| `src/pages/Podcasts.tsx` | Edit | Fix battle navigation when returning to session |

**Database Migration**: Create `strike_votes` table for Three Strike persistence

---

## Testing Checklist

After implementation, test the following:

1. **Heatmap Update**:
   - [ ] Select Nigeria - see Nigerian artists (Wizkid, Davido)
   - [ ] Select USA - see American artists (Drake, Taylor Swift)
   - [ ] Verify music is playing with real preview URLs

2. **Three Strike**:
   - [ ] Vote strike on a song - persists on page refresh
   - [ ] Vote save on a song - counter increases
   - [ ] 3 strikes = eliminated display

3. **Agora Errors**:
   - [ ] No error toasts visible to users
   - [ ] Check console for error logging only

4. **Battle Double-Tap Sync**:
   - [ ] Creator A taps - both see score increase
   - [ ] Creator B taps - both see score increase
   - [ ] Scores match on both devices

5. **Battle Session Stability**:
   - [ ] Rapid double-tapping doesn't cancel battle
   - [ ] Battle runs full 5 minutes x 2 rounds

6. **Winner Announcement**:
   - [ ] Correct winner displayed at round end
   - [ ] Winner name matches higher score

7. **Battle Navigation**:
   - [ ] Returning to battle shows battle view, not podcast

8. **Listener Audio**:
   - [ ] Listener joins session and hears host audio
   - [ ] Audio quality is clear
