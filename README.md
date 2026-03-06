# 🎵 Bario Music Platform

A social music platform for creators featuring live audio streaming, real-time battles, virtual gifting, a global music heatmap, and community-driven music discovery — built with React, TypeScript, and serverless backend functions.

**Live:** [bario](https://bario.icu)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS, shadcn/ui, Framer Motion |
| **State** | React Query (TanStack), React Context |
| **Routing** | React Router v6 |
| **Backend** | Lovable Cloud (Supabase) — Postgres, Auth, Edge Functions, Realtime |
| **Audio** | Agora RTC SDK (real-time voice) |
| **3D** | Three.js (text animations) |
| **Mobile** | Capacitor (wrap as native iOS/Android app) |
| **Payments** | Paystack (coin purchases) |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│                   Client                     │
│  React SPA (Vite) + Agora RTC Audio SDK     │
└──────────┬──────────────┬───────────────────┘
           │              │
     REST API        WebSocket (Realtime)
           │              │
┌──────────▼──────────────▼───────────────────┐
│              Lovable Cloud                   │
│  ┌────────────┐  ┌───────────┐  ┌────────┐  │
│  │  21 Edge   │  │ Postgres  │  │ Auth   │  │
│  │ Functions  │  │ Database  │  │ (JWT)  │  │
│  └────────────┘  └───────────┘  └────────┘  │
│  ┌────────────┐  ┌───────────┐              │
│  │  Storage   │  │ Realtime  │              │
│  │  (files)   │  │ (pub/sub) │              │
│  └────────────┘  └───────────┘              │
└─────────────────────────────────────────────┘
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system design.

---

## Folder Structure

```text
bario/
├── public/                          # Static assets
│   ├── demo/                        # Demo space audio & cover images
│   ├── gifts/                       # Gift animation videos & images
│   ├── sw.js                        # Service Worker for push notifications
│   └── bario-logo.png
├── src/
│   ├── assets/                      # App images (album art, backgrounds, cards)
│   ├── components/
│   │   ├── ui/                      # Reusable UI primitives (shadcn/ui)
│   │   ├── podcast/                 # Live streaming & battle components (36 files)
│   │   └── *.tsx                    # Shared components (Navbar, AudioPlayer, Hero)
│   ├── config/                      # App configuration (demo space settings)
│   ├── constants/                   # Static data (genre lists)
│   ├── contexts/                    # React contexts (AuthContext, AudioPlayerContext)
│   ├── hooks/                       # Custom hooks (Agora, notifications, Spotify, etc.)
│   ├── integrations/                # ⚠️ Auto-generated backend client — DO NOT EDIT
│   ├── lib/                         # Utility functions (audio processing, auth helpers)
│   └── pages/                       # Route page components (26 pages)
├── supabase/
│   ├── functions/                   # 21 serverless edge functions (API layer)
│   └── migrations/                  # Database migration SQL files
├── ARCHITECTURE.md                  # System architecture documentation
├── CONTRIBUTING.md                  # Developer contribution guidelines
└── README.md                        # This file
```

See [src/README.md](./src/README.md) for frontend details. See [supabase/functions/README.md](./supabase/functions/README.md) for backend API reference.

---

## Getting Started

### Prerequisites

- Node.js 18+ ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- npm or bun

### Local Development

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start dev server (http://localhost:8080)
npm run dev
```

### Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | `.env` (auto) | Backend project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env` (auto) | Backend anon key |
| `AGORA_APP_ID` | Edge function secret | Agora App ID for audio rooms |
| `AGORA_APP_CERTIFICATE` | Edge function secret | Agora App Certificate |
| `PAYSTACK_SECRET_KEY` | Edge function secret | Paystack payment processing |

---

## Mobile App Build (Capacitor)

The app can be wrapped as a native iOS/Android app using Capacitor — **no rewrite needed**.

```bash
# Install Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android

# Initialize
npx cap init

# Add platforms
npx cap add ios        # Requires macOS + Xcode
npx cap add android    # Requires Android Studio

# Build and sync
npm run build
npx cap sync

# Run on device/emulator
npx cap run ios
npx cap run android
```

---

## Pages & Routes

| Route | Page Component | Description |
|-------|---------------|-------------|
| `/` | `GlobalHeatmap` | Homepage — global music heatmap |
| `/heatmap` | `GlobalHeatmap` | Music heatmap (alias) |
| `/heatmap/:id` | `HeatmapDetail` | Track detail with metrics |
| `/auth` | `Auth` | Sign up / Sign in |
| `/dashboard` | `Dashboard` | User dashboard with music feed |
| `/dashboard/profile` | `DashboardProfile` | User profile management |
| `/dashboard/settings` | `DashboardSettings` | Account settings |
| `/dashboard/new-remix` | `NewRemix` | Create a new AI remix |
| `/dashboard/create` | `Create` | Create content |
| `/dashboard/library` | `Library` | User's music library |
| `/dashboard/analytics` | `Analytics` | Creator analytics |
| `/dashboard/upload` | `Upload` | Upload music tracks |
| `/dashboard/rewards` | `Rewards` | Coin balance & earnings |
| `/dashboard/creator/:id` | `CreatorProfile` | View creator profile |
| `/dashboard/artist/:id` | `ArtistProfile` | View artist profile |
| `/dashboard/music-result` | `MusicResultPage` | Music search results |
| `/ai-remix` | `AIRemix` | AI remix studio |
| `/advanced` | `Advanced` | Advanced remix settings |
| `/podcasts` | `Podcasts` | Browse live spaces & episodes |
| `/podcast-host/:hostId` | `PodcastHost` | Host's live studio |
| `/host/:hostId` | `HostProfile` | Host public profile |
| `/bario-music` | `BarioMusic` | Bario Music catalog |
| `/bario-music/:id` | `BarioMusicDetail` | Track detail page |
| `/three-strike` | `ThreeStrike` | Three Strike voting game |
| `/pricing` | `Pricing` | Coin purchase packages |

---

## API Reference

All endpoints are serverless edge functions. Base URL pattern: `<BACKEND_URL>/functions/v1/`

### Consolidated API (`/bario-api`)

| Endpoint Parameter | Method | Auth | Description |
|--------------------|--------|------|-------------|
| `?endpoint=tracks` | GET | No | Trending tracks with search/filter |
| `?endpoint=track&id=xxx` | GET | No | Single track details |
| `?endpoint=uploads` | GET | No | User-uploaded music |
| `?endpoint=upload&id=xxx` | GET | No | Single upload details |
| `?endpoint=live` | GET | No | Active live sessions |
| `?endpoint=creators` | GET | No | Top creators list |
| `?endpoint=coin-packages` | GET | No | Available coin packages |
| `?endpoint=health` | GET | No | API health check |

### Individual Functions

| Function | Method | Auth | Description |
|----------|--------|------|-------------|
| `/agora-token` | POST | Yes | Generate Agora RTC token for audio rooms |
| `/remix` | POST | Yes | AI-powered music remix |
| `/music-search` | POST | No | Search music across platforms |
| `/user-upload` | POST | Yes | Upload user music files |
| `/podcast-episodes` | POST | Yes | Manage podcast episodes (CRUD) |
| `/podcast-recording` | POST | Yes | Handle recording sessions |
| `/heatmap-tracks` | GET | No | Trending tracks for heatmap |
| `/heatmap-track-detail` | GET | No | Detailed track info + metrics |
| `/heatmap-sync` | POST | No | Sync heatmap data from external sources |
| `/dashboard-music` | GET | Yes | Personalized dashboard feed |
| `/spotify-auth` | POST | No | Spotify OAuth flow |
| `/spotify-search` | POST | No | Search Spotify catalog |
| `/get-track` | GET | No | Get single track |
| `/gift-transaction` | POST | Yes | Process virtual gifts & credit earnings |
| `/paystack-payment` | POST | Yes | Coin purchases via Paystack |
| `/process-withdrawal` | POST | Yes | Creator withdrawal requests |
| `/mystery-music` | POST | No | Mystery music drop |
| `/create-notification` | POST | Yes | Create in-app notification |
| `/send-push-notification` | POST | Yes | Send push notification to user |
| `/send-bulk-notifications` | POST | Yes | Broadcast notifications |

### Authentication

Authenticated endpoints require a JWT token:
```
Authorization: Bearer <jwt_token>
```

### Example: Gift Transaction

```bash
curl -X POST '<BACKEND_URL>/functions/v1/gift-transaction' \
  -H 'Authorization: Bearer YOUR_JWT' \
  -H 'Content-Type: application/json' \
  -d '{
    "sessionId": "session-uuid",
    "recipientId": "creator-uuid",
    "giftType": "rose",
    "giftCount": 10,
    "battleId": "battle-uuid"
  }'
```

**Gift Types & Values:**

| Gift | Cost (Coins) | Creator Earning (USD) |
|------|-------------|----------------------|
| Rose | 10 | $0.0128 |
| Heart | 50 | $0.064 |
| Star | 100 | $0.128 |
| Fire | 200 | $0.256 |
| Diamond | 500 | $0.64 |
| Crown | 5000 | $6.40 |

---

## Database Schema

### Core Tables (30+)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `profiles` | User profiles | `user_id`, `full_name`, `username`, `avatar_url`, `bio`, social links |
| `podcast_sessions` | Live streaming sessions | `host_id`, `title`, `status`, `listener_count`, `is_recording` |
| `podcast_battles` | Battle streams | `host_id`, `opponent_id`, `host_score`, `opponent_score`, `winner_id` |
| `podcast_comments` | Real-time chat | `session_id`, `user_id`, `content`, `is_emoji` |
| `podcast_gifts` | Gifts sent during streams | `sender_id`, `recipient_id`, `gift_type`, `points_value` |
| `podcast_episodes` | Recorded episodes | `host_id`, `title`, `audio_url`, `play_count` |
| `podcast_participants` | Session participants | `session_id`, `user_id`, `role`, `is_muted`, `hand_raised` |
| `podcast_banned_users` | Banned users per session | `session_id`, `user_id`, `banned_by`, `reason` |
| `podcast_schedules` | Scheduled sessions | `user_id`, `title`, `scheduled_at`, `reminder_enabled` |
| `battle_invites` | Battle invitations | `from_user_id`, `to_user_id`, `status`, `battle_id` |
| `user_uploads` | User-uploaded tracks | `user_id`, `title`, `audio_url`, `genre`, `play_count` |
| `user_albums` | User albums | `user_id`, `title`, `cover_image_url`, `track_count` |
| `user_favorites` | Saved/favorited tracks | `user_id`, `track_id`, `track_title`, `artist_name` |
| `user_predictions` | User predictions | `user_id`, `title`, `yes_votes`, `no_votes`, `status` |
| `prediction_votes` | Prediction votes | `user_id`, `prediction_id`, `vote` |
| `heatmap_tracks` | Global trending tracks | `title`, `artist_name`, `spotify_id`, `deezer_id`, `preview_url` |
| `heatmap_artists` | Artist data | `name`, `country`, `spotify_id`, `followers` |
| `heatmap_track_metrics` | Track attention scores | `track_id`, `attention_score`, `mindshare`, `spotify_popularity` |
| `heatmap_track_comments` | Track comments | `track_id`, `user_name`, `content`, `sentiment` |
| `heatmap_top_voices` | Top voices/influencers | `name`, `score`, `delta`, `type` |
| `heatmap_smart_feed_events` | Smart feed events | `event_type`, `title`, `track_id` |
| `follows` | User follow relationships | `follower_id`, `following_id` |
| `user_coins` | Coin balances | `user_id`, `balance`, `total_purchased`, `total_spent` |
| `coin_transactions` | Purchase/spend history | `user_id`, `type`, `coins`, `amount`, `status` |
| `coin_packages` | Purchasable coin packages | `name`, `coins`, `price_usd`, `bonus_coins` |
| `creator_earnings` | Creator earnings | `user_id`, `pending_earnings_usd`, `total_earnings_usd` |
| `withdrawal_requests` | Withdrawal requests | `user_id`, `amount_usd`, `bank_name`, `status` |
| `strike_votes` | Three Strike votes | `user_id`, `track_id`, `vote_type` |
| `tracks` | Remix tracks | `user_id`, `genre`, `status`, `original_audio_url` |
| `remixes` | Published remixes | `user_id`, `title`, `remix_file_url`, `play_count` |
| `likes` | Remix likes | `user_id`, `remix_id` |
| `notifications` | In-app notifications | `user_id`, `title`, `message`, `type`, `is_read` |
| `push_subscriptions` | Push notification endpoints | `user_id`, `endpoint`, `p256dh`, `auth_key` |
| `space_join_requests` | Join requests for spaces | `session_id`, `user_id`, `status` |
| `host_playlists` | Host playlists | `user_id`, `name` |
| `host_playlist_tracks` | Playlist tracks | `playlist_id`, `title`, `audio_url`, `position` |

---

## Realtime Features

The platform uses WebSocket subscriptions for instant updates:

| Feature | Table | Event | Description |
|---------|-------|-------|-------------|
| Live Chat | `podcast_comments` | INSERT | Messages appear instantly for all viewers |
| Battle Scores | `podcast_battles` | UPDATE | Score taps sync across all devices |
| Session Status | `podcast_sessions` | UPDATE | Live/ended status changes |
| Gift Animations | `podcast_gifts` | INSERT | Gift notifications trigger animations |
| Join Requests | `space_join_requests` | INSERT/UPDATE | Host sees requests in real-time |
| Notifications | `notifications` | INSERT | Bell icon updates instantly |

### Battle Score Sync Strategy

1. **Realtime subscriptions** — instant WebSocket updates
2. **Polling fallback** — 2-second interval sync for reliability
3. **Optimistic updates** — tapper sees score immediately (500ms protection window)
4. **Winner threshold** — automatic celebration at 650 points

---

## Key Features

### 🗺️ Global Music Heatmap
Real-time trending music visualization aggregating data from Spotify, Deezer, Last.fm, Audius, and iTunes. Tracks are scored by "attention score" and "mindshare" metrics.

### ⚡ Three Strike Voting
Music discovery game — users vote to "strike" or "save" tracks. 3 strikes = eliminated. Filtered by country (Nigeria, USA, UK, South Korea, etc.).

### 🎙️ Live Audio Spaces
Real-time audio rooms powered by Agora RTC. Hosts can manage speakers, record sessions, and receive gifts. Listeners can request to join, chat, and send reactions.

### ⚔️ Creator Battles
1v1 score battles between creators. Audience taps to vote. Real-time score sync with optimistic updates and automatic winner detection.

### 🎁 Virtual Gifting Economy
TikTok-style virtual gifts (Rose → Crown). Coins purchased via Paystack. Creators earn USD from gifts and can withdraw to bank accounts.

### 🔔 Push Notifications
Browser push notifications via Service Worker. Triggers: new followers, gifts received, battle invites, join requests. Works even when the app is closed.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on code style, PR process, and development workflow.

---

## License

Private — All rights reserved.
