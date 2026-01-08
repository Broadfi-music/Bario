# Bario Music Platform

A social music platform for creators with live streaming, battles, and community features.

## Project info

**URL**: https://lovable.dev/projects/1ff696be-2053-4114-9595-c26ec1f36f30

---

## API Endpoints

### Edge Functions

All API endpoints are deployed as serverless edge functions. Base URL: `https://sufbohhsxlrefkoubmed.supabase.co/functions/v1/`

| Function | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
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
    "channelName": "battle-session-123",
    "userId": "user-uuid",
    "role": "publisher"
  }'
```

**Response:**
```json
{
  "token": "006xxxx...",
  "uid": 12345,
  "channel": "battle-session-123"
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

---

## Real-time Features

The platform uses Supabase Realtime for:

- **Live Chat**: Messages broadcast to all viewers instantly
- **Battle Scores**: Real-time score updates during battles
- **Session Updates**: Live/ended status changes
- **Gift Animations**: Instant gift notifications

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
```

---

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/1ff696be-2053-4114-9595-c26ec1f36f30) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

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

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (Database, Auth, Edge Functions, Realtime)
- Agora (Real-time audio)

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/1ff696be-2053-4114-9595-c26ec1f36f30) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
