
### Root cause confirmed
- `preview--...` URL is passing through the platform auth bridge (not a normal app route), so direct browser checks can appear blank if auth/cookies are blocked.
- Published domains (`era-remix-studio.lovable.app`, `bario.icu`) are returning a black shell behavior consistent with stale/invalid cached app shell on clients.
- Creator DM entry is still a placeholder in `HostProfile`.
- Feed back button is hardcoded to `/podcasts?tab=live`, which causes the wrong return route.

### Implementation plan
1) **Stabilize web/published rendering**
- Update `src/main.tsx` with a one-time cache reset key for non-preview domains:
  - unregister existing service workers
  - clear Cache Storage entries
  - force a single hard reload
- Keep service workers disabled in editor/preview contexts.
- Trigger a fresh deployment with this cache-bust change.

2) **Fix feed back navigation**
- Update `src/pages/Feed.tsx` back action from `/podcasts?tab=live` to `/podcasts?tab=feed`.
- Preserve origin route via `location.state.from`, with fallback to `/podcasts?tab=feed`.

3) **Make creator messaging functional**
- Replace “DM feature coming soon” in `src/pages/HostProfile.tsx` with:
  - if logged in: `navigate('/messages?to=<creator_user_id>')`
  - if logged out: route to auth and return to intended DM target after login.
- Add/confirm message entry from creator feed cards to the same DM route.

4) **Verify end-to-end**
- Test and capture verification screenshots for:
  - `https://era-remix-studio.lovable.app/podcasts`
  - `https://bario.icu/podcasts`
  - `https://preview--era-remix-studio.lovable.app/podcasts` (expect auth/app view, not black)
- Validate:
  - Feed back returns to Podcasts feed tab
  - Host profile Message opens DM thread
  - DM send/receive works between creators

### Technical details
- Target files: `src/main.tsx`, `src/pages/Feed.tsx`, `src/pages/HostProfile.tsx`, `src/pages/Podcasts.tsx` (plus `src/pages/Messages.tsx` only for auth-return refinement).
- Existing backend tables/policies for DMs, likes, and comments are already in place; no new migration planned unless verification exposes an access policy gap.
