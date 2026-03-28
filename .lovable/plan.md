

## Fix: Remove preview redirect loop causing blank screen in editor

### Root Cause

The `ensureFreshPreviewBuild` function in `src/main.tsx` forces a `window.location.replace()` redirect every time it detects a "preview context" (iframe or lovableproject.com domain). It relies on `sessionStorage` to track whether a redirect already happened, but inside the Lovable editor's iframe, `sessionStorage` is often blocked or cleared between navigations. This creates an **infinite redirect loop** → blank screen.

The app itself is fully functional — both the preview URL and published URL (bario.icu) render correctly when loaded directly.

### What I'll Do

**Simplify `src/main.tsx`** — Remove all the complex preview cache-busting logic (`ensureFreshPreviewBuild`, `clearPreviewServiceWorkersAndCaches`, `safeSessionGet/Set`, `PREVIEW_BUILD_TAG`, `PREVIEW_CACHE_RESET_KEY`). Replace with:

1. A simple guard that **only unregisters service workers** in preview/iframe contexts (no redirects, no URL manipulation)
2. Immediately mount the app in all cases
3. Keep `registerSW` only for non-preview contexts (production PWA)

```typescript
// Simplified main.tsx structure:
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./index.css";

const root = document.getElementById("root");

// Only unregister SWs in preview — never redirect
const isPreviewContext = (() => {
  try {
    return window.self !== window.top
      || window.location.hostname.includes("lovableproject.com")
      || window.location.hostname.includes("id-preview--");
  } catch { return true; }
})();

if (isPreviewContext) {
  navigator.serviceWorker?.getRegistrations().then(regs =>
    regs.forEach(r => r.unregister())
  );
} else {
  registerSW({ immediate: true });
}

if (root) {
  createRoot(root).render(
    <StrictMode><App /></StrictMode>
  );
}
```

### Files Changed

- `src/main.tsx` — Replace ~100 lines with ~25 lines (remove redirect loop)

### What This Fixes

- Eliminates the infinite redirect loop in the Lovable editor iframe
- App mounts immediately in all environments
- Service workers still properly disabled in preview contexts
- PWA still works correctly on the published site

### Backend Status

No changes needed. All data, tables, edge functions, and storage are intact.

