

# Bario: OAuth Reliability + Scale Hardening Plan

## Current State

- **43 users**, ~43 profiles, ~190 podcast_participants, ~187 notifications
- Google OAuth uses the managed `lovable.auth.signInWithOAuth` bridge correctly
- The heatmap data comes from external APIs (Deezer/Spotify/Audius) via edge functions, not from the DB
- Console logs show **5 duplicate heatmap fetches on every page load** and auto-refresh every 30 seconds

---

## Problem 1: Google Sign-In Bounces Back Without Signing In

**Root cause:** After completing Google OAuth, the managed bridge redirects the user to `window.location.origin` (e.g., `https://bario.icu/`). The home page renders `GlobalHeatmap`, which does not wait for the auth session to be restored. The `onAuthStateChange` listener fires `INITIAL_SESSION` before `setSession()` from the OAuth bridge has completed, creating a race condition where `user` remains `null`.

**Fix (3 changes):**

1. **Add `SIGNED_IN` event handling in `AuthContext.tsx`** -- After OAuth return, the bridge calls `setSession()` which triggers `SIGNED_IN`. Currently the code only handles `TOKEN_REFRESHED` and `SIGNED_OUT`. Add logic to detect a fresh `SIGNED_IN` event and optionally show a success toast.

2. **Add a post-OAuth session wait on the home route** -- When the URL contains OAuth callback fragments (hash with `access_token` or after `/~oauth` redirect), delay rendering until `loading` becomes `false` with a valid session. This prevents the heatmap from rendering before the session is established.

3. **Remove the aggressive 30-second `getSession` polling interval** -- This is redundant because `autoRefreshToken: true` is already set on the Supabase client. The polling creates unnecessary load and can interfere with the OAuth flow by calling `getSession()` while `setSession()` is in progress.

---

## Problem 2: Will the Database Handle 50K / 300K / 1M Users?

**Short answer:** The database schema is sound. Postgres on the current plan can handle millions of rows easily. The bottleneck is not the database -- it's the **client-side polling** and **missing indexes** that will cause problems at scale.

### What Will Break at Scale

| Issue | Impact at 50K+ users | Fix |
|-------|---------------------|-----|
| 5 duplicate heatmap fetches on every page load | 250K+ unnecessary edge function calls per page view burst | Deduplicate with `useRef` flag |
| 30-second heatmap auto-refresh (even when tab is hidden) | Millions of wasted API calls to Deezer/Audius | Only refresh when tab is visible |
| 30-second dashboard music shuffle interval | Excessive re-renders, memory pressure | Remove or extend to 5+ minutes |
| Missing DB indexes on `notifications.user_id`, `podcast_comments.session_id`, `podcast_gifts.session_id`, `podcast_gifts.recipient_id`, `battle_invites.to_user_id`, `podcast_participants.session_id` | Full table scans on every query | Add indexes via migration |
| No pagination on notifications, comments | 1000-row default limit hit, data loss | Add `.range()` pagination |
| Realtime subscriptions on `podcast_sessions` without filters | Every session change broadcasts to every connected client | Add server-side filters |

### What Will NOT Break

- **Auth/profiles table**: Already has unique index on `user_id` and `username`. Lookups are O(log n).
- **RLS policies**: These use `auth.uid()` which is a constant comparison, not a scan. They scale fine.
- **Edge functions (heatmap, dashboard-music)**: These call external APIs (Deezer, Audius), not the DB. The bottleneck is Deezer's rate limit, not your DB.
- **The Supabase free/pro plan**: Can handle millions of rows. The concern is concurrent connections and API call volume, not storage.

---

## Implementation Plan

### Task 1: Fix OAuth Session Race Condition
**File:** `src/contexts/AuthContext.tsx`
- Remove the 30-second `getSession` polling interval entirely
- Add `prompt: 'select_account'` to Google OAuth to force account selection
- Handle `SIGNED_IN` event in `onAuthStateChange` to confirm session pickup

### Task 2: Deduplicate Heatmap Fetches
**File:** `src/hooks/useHeatmapData.ts`
- Add a `useRef` fetch-in-progress flag to prevent concurrent fetches
- Remove the duplicate `useEffect` that triggers on `currentCountry`/`currentGenre` (the `fetchTracks` callback already handles this)
- Only auto-refresh when `document.visibilityState === 'visible'`
- Increase auto-refresh from 30s to 120s

### Task 3: Add Missing Database Indexes
**Migration SQL:**
```sql
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_podcast_comments_session_id ON public.podcast_comments(session_id);
CREATE INDEX IF NOT EXISTS idx_podcast_gifts_session_id ON public.podcast_gifts(session_id);
CREATE INDEX IF NOT EXISTS idx_podcast_gifts_recipient_id ON public.podcast_gifts(recipient_id);
CREATE INDEX IF NOT EXISTS idx_battle_invites_to_user ON public.battle_invites(to_user_id);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_user_id ON public.coin_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_podcast_sessions_status ON public.podcast_sessions(status);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS idx_space_join_requests_session ON public.space_join_requests(session_id);
CREATE INDEX IF NOT EXISTS idx_podcast_episodes_host ON public.podcast_episodes(host_id);
```

### Task 4: Reduce Client-Side Polling
**Files:** `src/hooks/useDashboardMusic.ts`, `src/pages/GlobalHeatmap.tsx`
- Remove or extend the 30-second dashboard music shuffle interval to 5 minutes
- Add `document.visibilitychange` listener to pause all intervals when tab is hidden
- Filter realtime subscriptions to reduce broadcast noise

### Task 5: Add Pagination Guards
**Files:** Various pages that query notifications, comments, episodes
- Add `.range(0, 49)` to notification queries
- Add `.range(0, 99)` to comment queries
- Add "load more" buttons where needed

---

## Summary

The database itself will handle 1M+ users fine -- Postgres is built for this. The real risks are:
1. **The OAuth race condition** (causes the sign-in bounce bug you're seeing now)
2. **Excessive client-side polling** (5 duplicate fetches on load + 30s intervals = will hit rate limits at scale)
3. **Missing indexes** (queries will slow down as tables grow past 10K rows)

All fixable with the changes above.

