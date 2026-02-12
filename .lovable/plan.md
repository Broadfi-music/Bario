
# Add "Innovative Ways to Make Money" as a 3rd Demo Live Session

## Overview
Create a new demo live session identical in behavior to the existing "As A Man Thinketh" and "Reconciling the CEOs Capacity Dilemma" sessions -- with looped audio, simulated chat, gift animations, and presence on both the Heatmap "Live Now" section and the Space/Podcast Feed.

## Assets to Copy
1. **Audio file**: Copy `user-uploads://116-innovative-ways-to-develop-e.mp3` to `public/demo/demo-space-audio-3.mp3`
2. **Cover image**: Copy `user-uploads://Digital_collage_modern_art_hand_giving_and_receiving_money_on_a_background_Premium_Photo.jpeg` to `public/demo/demo-space-cover-3.jpg`

## File Changes

### 1. `src/config/demoSpace.ts`
- Add `DEMO_SESSION_ID_3 = 'demo-live-session-3'` and `DEMO_HOST_ID_3`
- Add `demoSession3` object with title "Innovative Ways to Make Money", the new cover image, audio URL, a host name, category "Finance", speakers list, and base listener count
- Add `demoChatMessages3` with money/finance-themed simulated chat messages
- Add helper functions: `getDemoLiveHost3()`, `getDemoLiveSession3()`, `getDemoPodcastSession3()`
- Update `isDemoSessionId()` and `getDemoSessionById()` to include the new session

### 2. `src/lib/authUtils.ts`
- Update `isDemoLiveSession()` to also match `'demo-live-session-3'`

### 3. `src/components/podcast/PodcastFeed.tsx`
- Import the new session helpers (`getDemoLiveHost3`, `DEMO_SESSION_ID_3`)
- Inject the 3rd demo session into the live hosts list alongside the existing two

### 4. `src/pages/GlobalHeatmap.tsx`
- Import `getDemoLiveSession3`
- Add it to the "Live Now" section so it appears on the heatmap

### 5. `src/pages/Podcasts.tsx`
- Import `DEMO_SESSION_ID_3` and `getDemoPodcastSession3`
- Handle the new session ID in the session selection logic so clicking it opens the live view

### 6. `src/components/podcast/KickStyleLive.tsx`
- Already handles demo sessions via `isDemoLiveSession()` -- no changes needed beyond the authUtils update

### 7. `src/components/podcast/DemoLiveSpace.tsx`
- Import `demoSession3` and `DEMO_SESSION_ID_3`
- Add a condition so when `sessionId === DEMO_SESSION_ID_3`, it uses `demoSession3` for the audio, cover, and speakers

### 8. `src/components/podcast/TikTokGiftDisplay.tsx` and `src/components/podcast/GiftAnimation.tsx`
- Already use `isDemoLiveSession()` -- will automatically work once authUtils is updated

## Result
The new "Innovative Ways to Make Money" session will appear as a persistent live session on both the Heatmap and Space Feed, with looped audio playback, simulated chat messages, and gift animations -- identical in behavior to the existing demo sessions.
