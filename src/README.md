# Frontend Architecture — `src/`

## Overview

The frontend is a React 18 SPA bundled with Vite. It uses React Router for navigation, React Query for server state, and React Context for global client state (auth + audio player).

## Directory Guide

### `pages/` — Route Components (26 pages)

Each file maps to a route in `App.tsx`. Pages compose smaller components and handle data fetching via React Query hooks.

**Key pages:**
- `GlobalHeatmap.tsx` — Homepage, trending music visualization
- `Podcasts.tsx` — Browse live spaces, episodes, and battles
- `Dashboard.tsx` — Authenticated user dashboard
- `ThreeStrike.tsx` — Music voting game
- `Auth.tsx` — Sign up / sign in forms

### `components/` — Reusable Components

#### `components/ui/` — shadcn/ui Primitives
Pre-built, accessible UI components. **Don't modify** unless adding new variants. Install new ones via shadcn CLI.

#### `components/podcast/` — Live Streaming (36 files)
Grouped by feature area:

| Area | Components |
|------|-----------|
| **Live Session** | `KickStyleLive`, `DemoLiveSpace`, `HostStudio`, `SpaceParticipants` |
| **Battles** | `BattleLive`, `BattleInviteModal`, `BattleNotification`, `BattleReelScroller` |
| **Gifts** | `GiftModal`, `GiftAnimation`, `TikTokGiftModal`, `TikTokGiftDisplay`, `ComboGiftTracker` |
| **Chat** | `TwitchComments`, `AudioReactions`, `LivePoll` |
| **Engagement** | `VibeCheck`, `SpotlightRoulette`, `MiniGame`, `MysteryMusicDrop`, `LoyaltyStreak` |
| **Moderation** | `AddParticipantModal`, `AuthPromptModal`, `TopEngagementModal` |
| **Profile/Settings** | `EditProfileModal`, `EditEpisodeModal`, `EditScheduleModal`, `ShareModal` |
| **Rewards** | `DailyRankingModal`, `AchievementToast`, `WithdrawalModal` |
| **Content** | `PodcastEpisodes`, `PodcastFeed`, `ScheduleManager` |

#### Shared Components
- `Navbar.tsx` — Main navigation bar
- `GlobalAudioPlayer.tsx` — Persistent bottom audio player
- `FullscreenAudioPlayer.tsx` — Expanded player view
- `NotificationBell.tsx` / `NotificationCenter.tsx` — Notification UI
- `Hero.tsx` / `Features.tsx` — Landing page sections
- `AnimatedCD.tsx` / `AnimatedDice.tsx` / `AnimatedSaturn.tsx` — Decorative animations
- `ThreeTextAnimation.tsx` — Three.js 3D text

### `contexts/` — Global State

| Context | Purpose |
|---------|---------|
| `AuthContext` | User session, sign up/in/out, Google OAuth, token refresh |
| `AudioPlayerContext` | Global audio playback state, queue, controls |

### `hooks/` — Custom Hooks

| Hook | Purpose |
|------|---------|
| `useAgoraAudio` | Agora RTC audio room connection and management |
| `useNotifications` | In-app notification fetching + realtime subscription |
| `useSpotify` | Spotify OAuth and search integration |
| `useFollowSystem` | Follow/unfollow users |
| `useAchievements` | Achievement tracking and toasts |
| `useAudioRemix` | AI remix processing |
| `useDashboardMusic` | Dashboard music feed data |
| `useHeatmapData` | Heatmap track data fetching |
| `useHostPlaylists` | Host playlist management |
| `use-mobile` | Mobile viewport detection |

### `lib/` — Utilities

| File | Purpose |
|------|---------|
| `utils.ts` | `cn()` class merge utility (Tailwind) |
| `audioProcessor.ts` | Client-side audio processing helpers |
| `authUtils.ts` | Auth helper functions |
| `randomAvatars.ts` | Generate random avatar/cover URLs for new users |

### `integrations/` — ⚠️ Auto-Generated

**DO NOT EDIT** these files. They are regenerated from the database schema:
- `client.ts` — Backend client instance
- `types.ts` — TypeScript types matching all database tables

### `config/` & `constants/`

- `config/demoSpace.ts` — Demo space configuration for unauthenticated users
- `constants/genres.ts` — Music genre list used across the app

## Design System

Colors and tokens are defined in `index.css` using CSS custom properties. Always use semantic Tailwind classes (`bg-primary`, `text-muted-foreground`) — never hardcode hex/HSL values in components.
