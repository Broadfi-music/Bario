

# Interactive Animated Room Banners + 2 New Hindi Audio

## Part 1: Generate 2 New Hindi Audio Files
Use the ElevenLabs edge function to generate 2 unique Hindi audio files for rooms 7 (IPL debate) and 9 (Meditation), replacing the reused room-6 audio. Each ~1,100 characters to stay within API limits.

- **Room 7** — IPL heated argument with 5+ speakers, high energy
- **Room 9** — Calm meditation/spiritual discussion, 2-3 speakers

## Part 2: Replace Static Images with Animated Canvas Components

Remove all static `cover_image_url` references and replace them with a new React component `RoomVisualization` that renders unique animated visuals per room based on the room's energy/category.

### Component: `src/components/podcast/RoomVisualization.tsx`
A canvas-based animated component that renders different visual patterns based on room metadata:

| Room | Category | Animation Style |
|------|----------|----------------|
| AI Debate | Technology | Pulsing neural network nodes with connecting lines, blue/cyan palette |
| Red Flags | Lifestyle | Floating hearts that crack/shatter, pink/red gradient waves |
| Bitcoin | Finance | Rising/falling chart lines with particle trails, gold/green |
| Comedy | Entertainment | Bouncing emoji-like shapes, confetti bursts, warm yellows |
| Heartbreak | Wellness | Gentle ripple waves, calming blue/purple aurora |
| Bollywood | Entertainment | Rotating film reel shapes, orange/gold sparkles |
| IPL | Sports | Cricket stumps/ball trajectories, blue/orange energy |
| Meditation | Spirituality | Slow breathing circle, mandala pattern, warm amber |
| Messi vs Ronaldo | Sports | Two opposing energy orbs colliding, green/white |
| MENA Tech | Technology | Geometric Islamic patterns morphing, teal/gold |

Each animation:
- Uses `requestAnimationFrame` for smooth 60fps rendering
- Responds to room energy level (calm rooms = slow, debate rooms = fast)
- Has unique color palette matching room theme
- Works as both card thumbnail and hero banner (responsive)

### Changes to existing files:

1. **`src/config/demoSessions.ts`**
   - Remove `coverImageUrl` field from sessions (or set to empty)
   - Add `energy: 'calm' | 'moderate' | 'heated' | 'intense'` and `visualTheme` fields
   - Update rooms 7 and 9 `audioUrl` to new storage URLs

2. **`src/components/podcast/PodcastFeed.tsx`**
   - Replace `<img src={cover_image_url}>` with `<RoomVisualization>` component for demo sessions
   - Both in hero carousel and live grid cards

3. **`src/components/podcast/KickStyleLive.tsx`**
   - Replace cover image rendering with `<RoomVisualization>` for demo sessions

## Files Created
- `src/components/podcast/RoomVisualization.tsx` — animated canvas component

## Files Modified
- `src/config/demoSessions.ts` — add energy/theme fields, update audio URLs
- `src/components/podcast/PodcastFeed.tsx` — use RoomVisualization for demo rooms
- `src/components/podcast/KickStyleLive.tsx` — use RoomVisualization for demo rooms

## Result
Every demo room gets a unique, eye-catching animated banner that matches its topic energy. No more repeated static images. 2 Hindi rooms get their own unique audio.

