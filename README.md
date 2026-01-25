# Bario Music Platform

A social music platform for creators with live streaming, battles, and community features.


---

## API Endpoints

### Edge Functions

All API endpoints are deployed as serverless edge functions. Base URL: `https://sufbohhsxlrefkoubmed.supabase.co/functions/v1/`

| Function | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/bario-api?endpoint=tracks` | GET | Get trending tracks with search/filter | No |
| `/bario-api?endpoint=track&id=xxx` | GET | Get single track details | No |
| `/bario-api?endpoint=uploads` | GET | Get Bario Music user uploads | No |
| `/bario-api?endpoint=upload&id=xxx` | GET | Get single upload details | No |
| `/bario-api?endpoint=live` | GET | Get live podcast sessions | No |
| `/bario-api?endpoint=creators` | GET | Get top creators | No |
| `/bario-api?endpoint=coin-packages` | GET | Get available coin packages | No |
| `/bario-api?endpoint=health` | GET | API health check | No |
| `/agora-token` | POST | Generate Agora RTC token for audio rooms | Yes |
| `/remix` | POST | AI-powered music remix processing | Yes |
| `/music-search` | POST | Search music across multiple platforms | No |
| `/user-upload` | POST | Upload user music files | Yes |
| `/podcast-episodes` | POST | Manage podcast episodes | Yes |
| `/podcast-recording` | POST | Handle podcast recording sessions | Yes |
| `/heatmap-tracks` | GET | Fetch trending tracks for heatmap | No |
| `/heatmap-track-detail` | GET | Get detailed track information | No |
| `/heatmap-sync` | POST | Sync heatmap data from external sources | No |
| `/dashboard-music` | GET | Get personalized dashboard music feed | Yes |
| `/spotify-auth` | POST | Spotify OAuth authentication flow | No |
| `/spotify-search` | POST | Search Spotify catalog | No |
| `/get-track` | GET | Get single track details | No |
| `/gift-transaction` | POST | Process virtual gifts and credit creator earnings | Yes |
| `/paystack-payment` | POST | Handle coin purchases via Paystack | Yes |
| `/process-withdrawal` | POST | Process creator withdrawal requests | Yes |

### Authentication

All authenticated endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## API Usage Examples

### 1. Agora Token (Audio Streaming)

Generate a token for real-time audio communication.

```bash
curl -X POST 'https://sufbohhsxlrefkoubmed.supabase.co/functions/v1/agora-token' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "sessionId": "session-uuid",
    "userId": "user-uuid",
    "userName": "John",
    "isHost": true
  }'
```

**Response:**
```json
{
  "appId": "xxx...",
  "channelName": "podcast-session-uuid",
  "token": "007xxx...",
  "uid": 12345,
  "canPublish": true,
  "speakerSlotsFull": false,
  "maxSpeakers": 100
}
```

### 2. Music Search

Search for tracks across multiple platforms.

```bash
curl -X POST 'https://sufbohhsxlrefkoubmed.supabase.co/functions/v1/music-search' \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "drake",
    "limit": 10
  }'
```

**Response:**
```json
{
  "tracks": [
    {
      "id": "track-id",
      "title": "Track Name",
      "artist": "Artist Name",
      "coverUrl": "https://...",
      "previewUrl": "https://...",
      "source": "spotify"
    }
  ]
}
```

### 3. User Upload

Upload a music track to the platform.

```bash
curl -X POST 'https://sufbohhsxlrefkoubmed.supabase.co/functions/v1/user-upload' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "My Track",
    "genre": "hip-hop",
    "audioUrl": "https://storage.url/audio.mp3",
    "coverUrl": "https://storage.url/cover.jpg"
  }'
```

### 4. Heatmap Tracks

Get trending tracks for the global heatmap.

```bash
curl 'https://sufbohhsxlrefkoubmed.supabase.co/functions/v1/heatmap-tracks?limit=20&country=US'
```

**Response:**
```json
{
  "tracks": [
    {
      "id": "track-id",
      "title": "Track Name",
      "artist_name": "Artist",
      "attention_score": 95,
      "mindshare": 12.5,
      "cover_image_url": "https://..."
    }
  ]
}
```

### 5. Remix

Create an AI-powered remix of a track.

```bash
curl -X POST 'https://sufbohhsxlrefkoubmed.supabase.co/functions/v1/remix' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "trackId": "original-track-id",
    "style": "lo-fi",
    "prompt": "Make it more chill and atmospheric"
  }'
```

### 6. Podcast Episodes

Manage podcast episodes.

```bash
# Create episode
curl -X POST 'https://sufbohhsxlrefkoubmed.supabase.co/functions/v1/podcast-episodes' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "create",
    "title": "Episode Title",
    "description": "Episode description",
    "audioUrl": "https://storage.url/episode.mp3"
  }'
```

### 7. Gift Transaction

Process virtual gifts during streams.

```bash
curl -X POST 'https://sufbohhsxlrefkoubmed.supabase.co/functions/v1/gift-transaction' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
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
| Gift Type | Cost (Coins) | Creator Earning (USD) |
|-----------|--------------|----------------------|
| Rose | 10 | $0.0128 |
| Heart | 50 | $0.064 |
| Star | 100 | $0.128 |
| Fire | 200 | $0.256 |
| Diamond | 500 | $0.64 |
| Crown | 5000 | $6.40 |

---

## Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| `profiles` | User profiles with avatar, bio, social links |
| `podcast_sessions` | Live streaming sessions |
| `podcast_battles` | Battle streaming between creators |
| `podcast_comments` | Real-time chat messages |
| `podcast_gifts` | Virtual gifts sent during streams |
| `podcast_episodes` | Recorded podcast episodes |
| `battle_invites` | Battle challenge invitations |
| `user_uploads` | User-uploaded music tracks |
| `heatmap_tracks` | Global trending music data |
| `follows` | User follow relationships |
| `user_coins` | User coin balances |
| `coin_transactions` | Coin purchase/spend history |
| `creator_earnings` | Creator earnings from gifts |
| `withdrawal_requests` | Creator withdrawal requests |
| `strike_votes` | Three Strike voting data |

---

## Real-time Features

The platform uses Supabase Realtime for:

- **Live Chat**: Messages broadcast to all viewers instantly
- **Battle Scores**: Real-time score updates during battles (with 500ms conflict resolution)
- **Session Updates**: Live/ended status changes
- **Gift Animations**: Instant gift notifications

### Battle Score Sync

Battle scores use a combination of:
1. **Realtime Subscriptions**: Immediate updates via WebSocket
2. **Polling Fallback**: 2-second interval sync to ensure all devices stay in sync
3. **Optimistic Updates**: Tapper sees score immediately with 500ms protection window
4. **Winner Threshold**: Automatic win celebration at 650 points

### Subscribing to Real-time Updates

```typescript
import { supabase } from '@/integrations/supabase/client';

// Subscribe to chat messages
const channel = supabase
  .channel('chat-session-id')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'podcast_comments',
      filter: 'session_id=eq.session-uuid'
    },
    (payload) => console.log('New message:', payload)
  )
  .subscribe();

// Subscribe to battle score updates
const battleChannel = supabase
  .channel('battle-scores')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'podcast_battles',
      filter: 'id=eq.battle-uuid'
    },
    (payload) => {
      console.log('Score update:', payload.new.host_score, payload.new.opponent_score);
    }
  )
  .subscribe();
```

---

## Three Strike Voting

A music discovery game where users vote to "strike" or "save" tracks:

- **Strike**: Mark a track you don't like
- **Save**: Mark a track you love
- **3 Strikes = Eliminated**: Tracks with 3+ strikes are eliminated
- **Country Filter**: View trending music by country (Nigeria, USA, UK, etc.)

### Country-Specific Music

Each country filter shows music from regional artists:
- **Nigeria**: Wizkid, Burna Boy, Davido, Rema, Asake
- **USA**: Drake, Taylor Swift, Kendrick Lamar, The Weeknd
- **UK**: Central Cee, Ed Sheeran, Dave, Stormzy
- **South Korea**: BTS, BLACKPINK, NewJeans, Stray Kids
- And more...

---

## Development Setup

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## Technologies

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (Database, Auth, Edge Functions, Realtime)
- Agora (Real-time audio)

## Environment Variables

The following environment variables are required:

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key |
| `AGORA_APP_ID` | Agora App ID (edge function secret) |
| `AGORA_APP_CERTIFICATE` | Agora App Certificate (edge function secret) |
| `PAYSTACK_SECRET_KEY` | Paystack secret key for payments (edge function secret) |
