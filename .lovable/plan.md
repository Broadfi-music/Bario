
# Demo Live Space Session Implementation Plan

## Overview
Create a persistent demo live Space session featuring the uploaded "As A Man Thinketh" audio content. This demo will appear in the podcast feed and heatmap to attract first-time users by showing active content even when no real live sessions are running.

## Assets to Store

| Asset | Source | Destination | Purpose |
|-------|--------|-------------|---------|
| Audio file | `user-uploads://49321944.mp3` | `public/demo/demo-space-audio.mp3` | Audio playback for demo session |
| Cover image | `user-uploads://63c031d00fbe80b28d03de0cef6dff3b.jpg` | `public/demo/demo-space-cover.jpg` | Cover image for session cards |

## Implementation Steps

### Step 1: Copy Assets to Project
- Create `public/demo/` folder
- Copy the uploaded audio and cover image to this folder

### Step 2: Create Demo Configuration File
**New file: `src/config/demoSpace.ts`**

Configuration includes:
- Session ID: `demo-live-session`
- Title: "As A Man Thinketh - Live Discussion"
- Host: "Solomon Harvey" (narrator from audio metadata)
- Two speakers: "Mind Coach" and "Wisdom Seeker"
- Cover image path
- Audio URL path
- Pool of 25+ simulated chat messages
- Listener count range (85-200 fluctuating)

### Step 3: Create Demo Live Space Component
**New file: `src/components/podcast/DemoLiveSpace.tsx`**

Features:
- Plays the audio file on loop
- Displays host and 2 speakers with animated avatars
- Shows simulated chat messages (cycling every 3-8 seconds)
- Fluctuating listener count display
- Gift button opens modal (prompts login)
- Share functionality works normally
- Follow button prompts login

### Step 4: Update Auth Utilities
**Modify: `src/lib/authUtils.ts`**

Add helper function:
- `isDemoLiveSession(id)` - checks if session ID is `demo-live-session`

### Step 5: Update Podcast Feed
**Modify: `src/components/podcast/PodcastFeed.tsx`**

Changes:
- Import demo configuration
- Inject demo session into `liveHosts` array when few/no real sessions exist
- Demo appears in hero carousel and "Live Now" grid
- Demo uses the uploaded cover image

### Step 6: Update KickStyleLive Component
**Modify: `src/components/podcast/KickStyleLive.tsx`**

Changes:
- Detect when session ID is `demo-live-session`
- Render `DemoLiveSpace` component instead of regular SpaceParticipants
- Pass audio URL and session config to demo component

### Step 7: Update GlobalHeatmap Page
**Modify: `src/pages/GlobalHeatmap.tsx`**

Changes:
- Import demo configuration
- Inject demo session into `liveSessions` state for "Currently Live" section
- Demo appears with cover image and listener count
- Clicking navigates to `/podcasts?session=demo-live-session`

### Step 8: Update SpaceParticipants and TwitchComments
**Modify: `src/components/podcast/SpaceParticipants.tsx`**
**Modify: `src/components/podcast/TwitchComments.tsx`**

Changes:
- Use `isDemoLiveSession()` to detect demo session
- Skip database calls for demo sessions
- Render demo participants/chat instead of fetching from DB
- Already partially implemented - extend for full demo experience

## Technical Details

### Demo Session Configuration
```
Session Details:
- ID: "demo-live-session"
- Title: "As A Man Thinketh - Live Discussion"
- Description: "Join our live discussion on Chapter 2: Effect of Thought on Circumstances"
- Host ID: "demo-host-solomon"
- Host Name: "Solomon Harvey"
- Cover: /demo/demo-space-cover.jpg
- Audio: /demo/demo-space-audio.mp3

Speakers:
- Host: Solomon Harvey (narrator)
- Speaker 1: "Mind Coach" (co-host)
- Speaker 2: "Wisdom Seeker" (guest)

Simulated Chat Messages (sample):
- "This chapter changed my perspective 🙏"
- "The power of thoughts is incredible!"
- "Love this discussion!"
- "So inspiring 🔥"
- "Mind = blown 🤯"
- "Thank you for sharing this wisdom"
- etc. (25+ unique messages)

Listener Simulation:
- Base: 127 listeners
- Fluctuation: ±5-15 every 8-12 seconds
- Slight upward trend
```

### Component Architecture
```
PodcastFeed / GlobalHeatmap
    │
    ├─► Detects demo session in liveHosts/liveSessions
    │
    └─► User clicks demo card
            │
            └─► Navigates to /podcasts?session=demo-live-session
                    │
                    └─► KickStyleLive detects demo ID
                            │
                            └─► Renders DemoLiveSpace
                                    │
                                    ├─► Audio player (looped)
                                    ├─► Demo host + speakers
                                    ├─► Simulated chat
                                    └─► Gift/Share/Follow buttons
```

## Edge Cases Handled

1. **Real sessions exist**: Demo shows alongside real sessions but with lower priority
2. **User tries to gift**: Opens gift modal, but submitting prompts login
3. **User tries to comment**: Prompts login modal
4. **User shares**: Share modal works with real shareable URL
5. **User follows**: Prompts login modal
6. **Audio fails**: Shows error message with retry option

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `public/demo/demo-space-audio.mp3` | Create | Copy uploaded audio |
| `public/demo/demo-space-cover.jpg` | Create | Copy uploaded cover image |
| `src/config/demoSpace.ts` | Create | Demo session configuration |
| `src/components/podcast/DemoLiveSpace.tsx` | Create | Demo live experience component |
| `src/lib/authUtils.ts` | Modify | Add `isDemoLiveSession` helper |
| `src/components/podcast/PodcastFeed.tsx` | Modify | Inject demo into feed |
| `src/components/podcast/KickStyleLive.tsx` | Modify | Handle demo session rendering |
| `src/pages/GlobalHeatmap.tsx` | Modify | Show demo in "Currently Live" |
| `src/components/podcast/SpaceParticipants.tsx` | Modify | Handle demo participants |
| `src/components/podcast/TwitchComments.tsx` | Modify | Handle demo chat |

## User Experience

When users visit the platform:
1. They see "As A Man Thinketh" session in the heatmap "Currently Live" section
2. They see it in the podcast feed with the purple meditation cover image
3. Clicking opens the live space with audio playing
4. Chat messages appear naturally every few seconds
5. Listener count fluctuates to feel authentic
6. Actions like gifting/commenting prompt users to sign up
