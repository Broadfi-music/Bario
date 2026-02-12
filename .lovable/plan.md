

# Fix: Isolate Audio, Gifts, and Chat Per Session When Scrolling

## Problem
When scrolling between live sessions, three things leak across sessions:
1. **Audio** continues playing from the previous session
2. **Gifts** from one session appear in another
3. **Chat messages** from one session show in another

## Root Cause
- `DemoLiveSpace` creates its audio player in a `useEffect` with an empty `[]` dependency array, so it never re-initializes when the session changes.
- None of the session-specific child components (`DemoLiveSpace`, `GiftAnimation`, `TikTokGiftDisplay`, `TwitchComments`) have a React `key` prop tied to the session ID. Without a `key`, React reuses the same component instance and its internal state/subscriptions persist across session switches.

## Fix (2 files)

### 1. `src/components/podcast/KickStyleLive.tsx`
Add `key={currentSession.id}` to every session-specific component so React fully unmounts and remounts them when the session changes:

- `DemoLiveSpace` (line 535): add `key={currentSession.id}`
- `SpaceParticipants` (line 537): add `key={currentSession.id}`
- `TwitchComments` mobile (line 642): add `key={currentSession.id}`
- `TwitchComments` desktop (line 661): add `key={currentSession.id}`
- `GiftAnimation` (line 703): add `key={currentSession.id}`
- `TikTokGiftDisplay` (line 706): add `key={currentSession.id}`

### 2. `src/components/podcast/DemoLiveSpace.tsx`
Change the audio initialization `useEffect` dependency from `[]` to `[activeDemo.audioUrl]` so it properly cleans up and re-creates the audio element when switching between demo sessions. This ensures:
- The old audio is paused and destroyed on unmount or session change
- The new session's audio starts fresh

## Why This Works
- React's `key` mechanism forces a complete unmount/remount cycle when the key value changes
- Each remount triggers fresh `useEffect` calls, creating new audio players, new realtime subscriptions, and resetting all state
- The cleanup functions in each component's `useEffect` will properly pause audio and unsubscribe from channels

