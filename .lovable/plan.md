

# Fix Stale Cache / Old Site Showing After Updates

## The Problem
The PWA service worker is serving cached (old) versions of the site. Even after code updates, the browser loads the previous cached build. This is why you keep seeing the old feed page and "three strike" content instead of the new Twitch-style feed.

## Root Cause
The Workbox configuration caches all JS/CSS/HTML files aggressively. While `skipWaiting` and `clientsClaim` are set, the `navigateFallback` and glob caching can still serve stale assets until the new service worker fully activates and clears old caches.

## Fix (3 changes)

### 1. Add cache-busting to the service worker config
Update `vite.config.ts` to add `cleanupOutdatedCaches: true` in the Workbox config, which automatically removes old cached assets when a new service worker activates.

### 2. Add a version check + force reload in `App.tsx`
Add a small hook that listens for service worker update events and forces a page reload when a new version is detected, so users never get stuck on an old build.

### 3. Clean up stale references
Remove "Three Strike" from `index.html` keywords meta tag and the JSON-LD schema `featureList`, since that feature no longer exists and contributes to the impression of stale content.

## Result
After this fix, when you deploy a new version, the service worker will automatically clean up old caches and force-reload the latest build. No more stale pages.

