

# Dynamic Ranking System -- Songs Competing in Real-Time

## The Problem

Right now, the heatmap ranking is static. When you select Nigeria, the same songs appear in the same order every time. The "change" percentages are generated from a daily seed, not from actual user engagement. Songs never overtake each other.

## The Solution

Make songs compete for rank based on **real user activity on Bario** -- plays, saves, strikes, and gifts. Every time a user plays a track, saves it, or votes on it, that track's score increases and it can climb the rankings, pushing other songs down.

## How It Works

```text
User plays "Jogodo" by Wizkid
       |
       v
+------------------+
| play_events table |  <-- Records: user_id, track_id, country, timestamp
+------------------+
       |
       v
+------------------------+
| heatmap_engagement     |  <-- Aggregated: track_id, country, plays_24h, saves_24h, votes_24h
+------------------------+
       |
       v
+----------------------------+
| attentionScore calculation |
|                            |
| Base API score (Deezer)    |
| + plays_24h * 100          |
| + saves_24h * 500          |
| + votes_24h * 200          |
| = FINAL RANK               |
+----------------------------+
```

## What Changes

### 1. New Database Table: `heatmap_engagement`

Tracks real user engagement per track per country:

| Column | Type | Purpose |
|--------|------|---------|
| track_id | text | Deezer/Audius track ID |
| country_code | text | Country filter context |
| plays_count | integer | Total plays from Bario users |
| saves_count | integer | Total saves/favorites |
| votes_count | integer | Three Strike votes |
| score_boost | float | Calculated engagement boost |
| last_played_at | timestamp | Recency signal |
| updated_at | timestamp | Last activity |

### 2. Update Edge Function: `heatmap-tracks`

After fetching tracks from Deezer/Audius APIs:
- Query `heatmap_engagement` for each track
- Add engagement boost to `attentionScore`
- Replace fake `stableRandom` change metrics with real deltas (compare current score vs 24h-ago score)
- Re-sort tracks by new combined score -- this is where songs overtake each other

### 3. Track User Activity (Frontend)

When a user interacts with a heatmap track:
- **Plays a preview**: Increment play count via a lightweight edge function call
- **Saves/favorites a track**: Already saved to `user_favorites` -- add a trigger to update engagement
- **Three Strike vote (save)**: Already in `strike_votes` -- add a trigger to update engagement

### 4. New Edge Function: `track-engagement`

A small function called when users play/interact with tracks:

```text
POST /track-engagement
Body: { track_id, country_code, action: "play" | "save" | "vote" }
```

Updates `heatmap_engagement` table and recalculates `score_boost`.

### 5. Real Change Metrics

Instead of `stableRandom()`, the edge function will:
- Store a snapshot of each track's score every hour (or use the engagement timestamps)
- Calculate real `change24h` = current_score - score_24h_ago
- Songs that get more plays in the last 24h will show positive change and climb ranks
- Songs losing momentum will show negative change and drop

## What Users Will See

- When they play a song, it gets a small rank boost
- Popular songs on Bario will climb higher than songs nobody plays
- The "change" arrows and percentages will reflect real movement
- Different countries will have different engagement patterns, making each chart feel unique and alive
- Ranks will shift throughout the day as users interact

## Technical Details

### Database Migration

```sql
CREATE TABLE heatmap_engagement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id text NOT NULL,
  country_code text NOT NULL DEFAULT 'GLOBAL',
  plays_count integer NOT NULL DEFAULT 0,
  saves_count integer NOT NULL DEFAULT 0,
  votes_count integer NOT NULL DEFAULT 0,
  score_boost double precision NOT NULL DEFAULT 0,
  last_played_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(track_id, country_code)
);

-- RLS: anyone can read, authenticated users can upsert
ALTER TABLE heatmap_engagement ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Anyone can view engagement" ON heatmap_engagement FOR SELECT USING (true);

-- Allow edge function (service role) to update -- no user-facing insert needed

-- Add realtime for live ranking updates
ALTER PUBLICATION supabase_realtime ADD TABLE heatmap_engagement;
```

### Edge Function Changes (heatmap-tracks)

- After building the track list, query `heatmap_engagement` for all track IDs in the current country
- Add `score_boost` to each track's `attentionScore`
- Replace `stableRandom` change values with real engagement deltas
- Re-sort by final score

### New Edge Function: `track-engagement`

- Accepts `{ track_id, country_code, action }`
- Upserts into `heatmap_engagement`: increments the relevant counter and recalculates `score_boost`
- Formula: `score_boost = plays_count * 100 + saves_count * 500 + votes_count * 200`

### Frontend Changes

- In the audio player (when a heatmap track plays): fire a background POST to `/track-engagement` with action "play"
- In Three Strike (on "save" vote): fire POST with action "vote"
- In favorites (on save): fire POST with action "save"
- These are fire-and-forget calls -- no UI blocking

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| Database migration | Create | `heatmap_engagement` table |
| `supabase/functions/track-engagement/index.ts` | Create | Record user engagement |
| `supabase/functions/heatmap-tracks/index.ts` | Modify | Use real engagement data for ranking |
| `src/contexts/AudioPlayerContext.tsx` | Modify | Fire engagement event on play |
| `src/pages/ThreeStrike.tsx` | Modify | Fire engagement event on save vote |
| `src/hooks/useHeatmapData.ts` | Minor | Subscribe to realtime engagement updates |

## No Breaking Changes

- The existing API data (Deezer charts, Audius trending) remains the base
- Engagement just adds a boost on top -- so charts still look correct even with zero Bario activity
- As users grow, their activity increasingly shapes the rankings

