# Bario PWA Mobile App - Splash Screen + Mobile Interface

## Overview

Build a native-feeling PWA experience with a splash screen on launch and a TikTok-inspired mobile interface where the Live Session is the main screen, with a bottom navigation bar.

---

## Part 1: Splash Screen

**What it does:** When users open the PWA (or visit on mobile), they see a full-screen splash for ~3 seconds before the main app loads.

**Design:**

- Full black background with the uploaded video playing as a looping background (subtle, darkened overlay)
- Bario logo centered in the middle (using existing `/bario-logo.png`)
- Caption text **"Connect. Create. Elevate."** below the logo in clean white text
- Fades out after 3 seconds and transitions to the main app

**New file:** `src/components/SplashScreen.tsx`

- Plays the uploaded MP4 video as background
- Shows logo + tagline centered
- Auto-dismisses after 3 seconds with a fade-out animation
- Stores a session flag so it only shows once per visit

**Video asset:** Copy the uploaded video to `public/splash-video.mp4`

---

## Part 2: PWA Mobile Layout

**What changes:** Create a new mobile-specific layout wrapper that replaces the current desktop-style navigation with a TikTok-inspired interface on mobile devices.

### Bottom Navigation Bar

Five tabs at the bottom (only visible on mobile, using `useIsMobile` hook):


| Tab      | Icon                              | Destination                               |
| -------- | --------------------------------- | ----------------------------------------- |
| Live     | Radio icon                        | `/podcasts` (Live sessions - main screen) |
| Feed     | Home icon                         | `/podcasts?tab=feed` (Podcast feed)       |
| Go Live  | Plus icon (highlighted, centered) | Opens Host Studio (requires auth)         |
| Heatmap  | Globe icon                        | `/` (Global Heatmap)                      |
| AI Remix | Sparkles icon                     | `/ai-remix`                               |


- The "Go Live" button will be styled like TikTok's center "+" button (larger, with accent color)
- If user is not logged in and taps "Go Live", redirect to `/auth`

**New file:** `src/components/MobileBottomNav.tsx`

### Main Screen = Live Session

- When opening the PWA on mobile, the default landing is the Live sessions view (currently at `/podcasts` with the `live` tab)
- The existing `KickStyleLive` / `DemoLiveSpace` components serve as the main content
- Hide the current top header/tabs on mobile since the bottom nav replaces them

### Auth Gate

- If user is not logged in and tries to "Go Live", they get redirected to `/auth`
- The auth page already exists at `src/pages/Auth.tsx` with sign in / sign up

---

## Part 3: App Entry Flow

The flow when a user opens the PWA:

```text
Open App --> Splash Screen (3s) --> Live Sessions (main screen)
                                      |
                                 Bottom Nav visible
                                      |
                    [Live] [Feed] [+ Go Live] [Heatmap] [AI Remix]
```

---

## Technical Details

### Files to Create

1. `**src/components/SplashScreen.tsx**` - Full-screen splash with video background, logo, and tagline
2. `**src/components/MobileBottomNav.tsx**` - Bottom tab navigation bar (5 tabs)
3. `**public/splash-video.mp4**` - Copy of uploaded video

### Files to Modify

1. `**src/App.tsx**`
  - Wrap the app with the SplashScreen component
  - Add MobileBottomNav inside the BrowserRouter (rendered on all routes on mobile)
  - Change the default `/` route to point to the Podcasts/Live page on mobile
2. `**src/pages/Podcasts.tsx**`
  - Hide the existing top header bar on mobile (since bottom nav replaces it)
  - Default to `live` tab instead of `feed` when accessed as PWA home
  - Add bottom padding to avoid content being hidden behind bottom nav
3. `**src/pages/GlobalHeatmap.tsx**` - Add bottom padding for mobile nav
4. `**src/pages/AIRemix.tsx**` - Add bottom padding for mobile nav

### No sidebar changes

As requested, the sidebar icon will be left as-is for now.  
  
dont make any change on the webapp, just the pwa app that all