# Bario Architecture

## System Overview

Bario is a **single-page application (SPA)** with a serverless backend. The frontend is a React app bundled by Vite, and the backend consists of 21 edge functions + a Postgres database with real-time subscriptions.

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                      │
│                                                              │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │  React   │  │  React Query │  │   Agora RTC SDK        │ │
│  │  Router  │  │  (caching)   │  │   (voice audio rooms)  │ │
│  └──────────┘  └──────────────┘  └────────────────────────┘ │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Contexts │  │  Custom      │  │   Service Worker       │ │
│  │ Auth +   │  │  Hooks       │  │   (push notifications) │ │
│  │ Audio    │  │              │  │                        │ │
│  └──────────┘  └──────────────┘  └────────────────────────┘ │
└───────────┬───────────────┬──────────────────┬──────────────┘
            │               │                  │
       REST API        WebSocket           Agora Cloud
            │          (Realtime)              │
┌───────────▼───────────────▼──────────────────┘
│                    BACKEND                    │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │          21 Edge Functions              │  │
│  │  (Deno runtime, serverless)             │  │
│  │                                         │  │
│  │  bario-api        ← consolidated API    │  │
│  │  agora-token      ← audio room tokens   │  │
│  │  gift-transaction ← gifting economy     │  │
│  │  paystack-payment ← coin purchases      │  │
│  │  heatmap-sync     ← external data sync  │  │
│  │  music-search     ← multi-platform      │  │
│  │  ...and 15 more                         │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │          Postgres Database              │  │
│  │  35+ tables with RLS policies           │  │
│  │  + database functions & triggers        │  │
│  │  + realtime publication                 │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ┌──────────────┐  ┌───────────────────────┐  │
│  │  Auth (JWT)  │  │  File Storage         │  │
│  │  Email +     │  │  Audio files,         │  │
│  │  Google OAuth│  │  cover images         │  │
│  └──────────────┘  └───────────────────────┘  │
└───────────────────────────────────────────────┘
```

## Data Flow

### Authentication
1. User signs up via email/password or Google OAuth
2. Backend issues JWT token, stored in `localStorage`
3. Token auto-refreshes every 30 seconds (checked in `AuthContext`)
4. Profile auto-created on signup with random avatar

### Live Audio Streaming
1. Host creates a `podcast_session` (status: `live`)
2. Frontend requests Agora token from `/agora-token` edge function
3. Agora SDK connects to audio channel
4. Participants tracked in `podcast_participants` table
5. Chat messages flow via `podcast_comments` + Realtime subscriptions
6. Gifts processed via `/gift-transaction` → updates `podcast_gifts`, `user_coins`, `creator_earnings`

### Battle Flow
1. Host sends invite → `battle_invites` table
2. Opponent accepts → `podcast_battles` row created (status: `active`)
3. Audience taps → `increment_battle_score` database function (atomic increment)
4. Scores sync via Realtime + 2s polling fallback
5. Winner detected at 650 points → `winner_id` set

### Gifting Economy
```
User buys coins (Paystack) → coin_transactions + user_coins.balance
User sends gift → gift-transaction edge function:
  1. Deduct coins from sender
  2. Create podcast_gifts record
  3. Credit creator_earnings (coins × $0.00128/coin)
Creator withdraws → process-withdrawal edge function
```

### Heatmap Data Pipeline
```
heatmap-sync edge function runs periodically:
  1. Fetches from Spotify, Deezer, Last.fm, Audius, iTunes APIs
  2. Upserts into heatmap_tracks, heatmap_artists
  3. Calculates attention_score and mindshare metrics
  4. Stores in heatmap_track_metrics
```

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| SPA (not SSR) | Simpler deployment, real-time interactions don't benefit from SSR |
| Agora for audio | Industry-standard WebRTC, handles NAT traversal and quality |
| Edge functions | Serverless = zero ops, auto-scaling, cold starts acceptable |
| React Query | Caching, deduplication, background refetching for data-heavy app |
| Realtime + Polling | Belt-and-suspenders: WebSocket for speed, polling for reliability |
| Optimistic battle scores | 500ms protection window prevents race conditions |
| Service Worker push | Notifications work when app is closed — critical for engagement |

## Security Model

- **Row Level Security (RLS)** on all tables — users can only access their own data
- **JWT authentication** — tokens validated by backend on every request
- **Edge function auth** — functions check `Authorization` header and extract user ID
- **CORS** — edge functions include proper CORS headers
- **No direct DB access** — all writes go through edge functions or RLS-protected client queries
