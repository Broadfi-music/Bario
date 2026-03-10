

## PWABuilder and Standalone PWA

**Short answer:** Yes, PWABuilder uses your custom domain (`https://bario.icu`) and it **will** produce the standalone PWA experience, not the webapp design.

Here's why: PWABuilder reads your `manifest.json`, which has `"display": "standalone"`. When it wraps your site in a TWA (Trusted Web Activity) for the Play Store, the Android system launches your app in **standalone mode** — meaning `window.matchMedia('(display-mode: standalone)')` returns `true`. This triggers all your PWA-specific code:

- Bottom nav bar (Live, Feed, Go Live, Heatmap)
- Splash screen video
- TikTok-style header with Battle/Start Battle/Bario Music tabs
- Profile icon navigation
- No browser chrome

So the `.aab` from PWABuilder will behave exactly like your installed PWA, not the browser webapp.

**Steps:**
1. Go to [pwabuilder.com](https://pwabuilder.com)
2. Enter `https://bario.icu`
3. It audits your manifest and service worker
4. Generate the Android package — the TWA runs in standalone mode automatically

---

## Build Error Fix

The `send-push-notification` edge function has two TypeScript errors that need fixing:

1. **Line 44** — `Uint8Array` buffer type incompatibility with `crypto.subtle.importKey`. Fix: cast `keyData.buffer` to `ArrayBuffer`.
2. **Line 172** — `error` is `unknown`. Fix: cast to `Error` or use string fallback.

Both are simple type-safety fixes with no logic changes.

