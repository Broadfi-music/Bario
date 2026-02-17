# Backend Functions Reference — `supabase/functions/`

## Overview

All backend logic runs as serverless edge functions (Deno runtime). Each function is a single `index.ts` file in its own directory. Functions deploy automatically on push.

## Function Reference

### `bario-api` — Consolidated Public API
**Method:** GET | **Auth:** No

Serves multiple endpoints via `?endpoint=` query parameter:

| Endpoint | Description | Example |
|----------|-------------|---------|
| `tracks` | Trending tracks with search/filter | `?endpoint=tracks&search=drake&limit=10` |
| `track` | Single track details | `?endpoint=track&id=uuid` |
| `uploads` | User-uploaded music | `?endpoint=uploads` |
| `upload` | Single upload | `?endpoint=upload&id=uuid` |
| `live` | Active live sessions | `?endpoint=live` |
| `creators` | Top creators | `?endpoint=creators` |
| `coin-packages` | Coin packages for purchase | `?endpoint=coin-packages` |
| `health` | API health check | `?endpoint=health` |

---

### `agora-token` — Audio Room Tokens
**Method:** POST | **Auth:** Yes

Generates Agora RTC tokens for real-time audio rooms.

**Request:**
```json
{
  "sessionId": "session-uuid",
  "userId": "user-uuid",
  "userName": "John",
  "isHost": true
}
```

**Response:**
```json
{
  "appId": "xxx",
  "channelName": "podcast-session-uuid",
  "token": "007xxx",
  "uid": 12345,
  "canPublish": true,
  "speakerSlotsFull": false,
  "maxSpeakers": 100
}
```

**Secrets:** `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE`

---

### `gift-transaction` — Virtual Gift Processing
**Method:** POST | **Auth:** Yes

Deducts coins from sender, records gift, credits creator earnings.

**Request:**
```json
{
  "sessionId": "session-uuid",
  "recipientId": "creator-uuid",
  "giftType": "rose",
  "giftCount": 10,
  "battleId": "battle-uuid"
}
```

**Side effects:**
1. Deducts coins from `user_coins`
2. Inserts into `podcast_gifts`
3. Updates `creator_earnings`
4. Creates notification for recipient

---

### `paystack-payment` — Coin Purchases
**Method:** POST | **Auth:** Yes

Initializes Paystack payment for coin purchases.

**Secrets:** `PAYSTACK_SECRET_KEY`

---

### `process-withdrawal` — Creator Withdrawals
**Method:** POST | **Auth:** Yes

Processes creator withdrawal requests from earned revenue.

---

### `music-search` — Multi-Platform Search
**Method:** POST | **Auth:** No

Searches music across Spotify, Deezer, and other platforms.

**Request:**
```json
{ "query": "drake", "limit": 10 }
```

---

### `remix` — AI Music Remix
**Method:** POST | **Auth:** Yes

Processes AI-powered music remixes.

**Request:**
```json
{
  "trackId": "original-track-id",
  "style": "lo-fi",
  "prompt": "Make it more chill"
}
```

---

### `heatmap-tracks` — Trending Heatmap Data
**Method:** GET | **Auth:** No

Returns trending tracks with attention scores for the global heatmap.

**Query params:** `?limit=20&country=US`

---

### `heatmap-track-detail` — Track Detail
**Method:** GET | **Auth:** No

Returns detailed track information with metrics history.

---

### `heatmap-sync` — External Data Sync
**Method:** POST | **Auth:** No

Syncs heatmap data from external music APIs (Spotify, Deezer, Last.fm, Audius, iTunes).

---

### `dashboard-music` — Personalized Feed
**Method:** GET | **Auth:** Yes

Returns personalized music feed for the user's dashboard.

---

### `spotify-auth` — Spotify OAuth
**Method:** POST | **Auth:** No

Handles Spotify OAuth authentication flow.

---

### `spotify-search` — Spotify Search
**Method:** POST | **Auth:** No

Searches the Spotify catalog.

---

### `get-track` — Single Track
**Method:** GET | **Auth:** No

Returns a single track by ID.

---

### `user-upload` — Upload Music
**Method:** POST | **Auth:** Yes

Handles user music file uploads.

---

### `podcast-episodes` — Episode Management
**Method:** POST | **Auth:** Yes

CRUD operations for podcast episodes via `action` field:
- `create` — Create new episode
- `update` — Update episode details
- `delete` — Delete episode

---

### `podcast-recording` — Recording Sessions
**Method:** POST | **Auth:** Yes

Manages podcast recording sessions.

---

### `mystery-music` — Mystery Music Drop
**Method:** POST | **Auth:** No

Handles mystery music drop feature in live spaces.

---

### `create-notification` — In-App Notifications
**Method:** POST | **Auth:** Yes

Creates an in-app notification for a user.

**Request:**
```json
{
  "userId": "user-uuid",
  "title": "New follower!",
  "message": "John started following you",
  "type": "follow",
  "actionUrl": "/host/user-uuid"
}
```

---

### `send-push-notification` — Push Notifications
**Method:** POST | **Auth:** Yes

Sends a browser push notification to a specific user.

**Request:**
```json
{
  "user_id": "user-uuid",
  "title": "🎙️ Live Now!",
  "message": "Your favorite creator just went live",
  "action_url": "/podcasts"
}
```

---

### `send-bulk-notifications` — Broadcast
**Method:** POST | **Auth:** Yes

Sends push notifications to all users with active push subscriptions.

---

## Common Patterns

### CORS Headers
Every function includes CORS handling:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle preflight
if (req.method === 'OPTIONS') {
  return new Response(null, { headers: corsHeaders });
}
```

### Auth Check
```typescript
const authHeader = req.headers.get('Authorization');
const token = authHeader?.replace('Bearer ', '');
const { data: { user }, error } = await supabaseClient.auth.getUser(token);
if (!user) return new Response('Unauthorized', { status: 401 });
```

### Environment Secrets
Access via `Deno.env.get('SECRET_NAME')`. Required secrets:
- `AGORA_APP_ID` / `AGORA_APP_CERTIFICATE` — Audio rooms
- `PAYSTACK_SECRET_KEY` — Payment processing
