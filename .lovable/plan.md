

## Fix: Force fresh preview load

The app code and backend are fully intact and working. The blank preview is caused by stale cached content from the previous broken state.

### What I'll do

1. **Add a unique rebuild comment** to `src/main.tsx` (different from the previous App.tsx comment) to force Vite to do a full HMR refresh and clear the module cache
2. **Bump the preview cache reset key** from `v3` to `v4` in `src/main.tsx` — this forces the preview's `ensureFreshPreviewBuild` function to do a one-time hard reload, clearing any cached broken state

### Why this works

The `main.tsx` file has a built-in mechanism (`PREVIEW_CACHE_RESET_KEY`) that detects when it needs to force a hard reload in preview mode. Changing the key from `v3` to `v4` triggers this mechanism, ensuring the preview iframe gets a completely fresh build.

### Backend status

All data is safe and intact:
- 53 user profiles
- 128 podcast sessions (7 live)
- 49 battles (3 active)  
- All tables, RLS policies, storage buckets, and edge functions are unchanged

No backend changes needed.

