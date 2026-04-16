

# AI Vocal-to-Song Pipeline — Full Implementation Plan

## What this builds

A complete backend pipeline that takes a user's raw vocal recording (singing with no beat) and produces a professional, release-ready song — preserving the user's real voice. The pipeline runs across 7 Replicate model stages, generates 3 song variations (1x full 3-min + 2x 30-sec previews for free users; all 3 full for paid), and returns downloadable stems.

## Architecture

```text
User uploads raw vocal (WAV/MP3) via AI Remix page
        │
        ▼
┌──────────────────────────────────────┐
│  Edge Function: vocal-to-song        │
│  (orchestrator — async polling)      │
├──────────────────────────────────────┤
│ 1. Upload vocal to Supabase Storage  │
│ 2. Vocal Cleaning (Demucs)           │ → Replicate: cjwbw/demucs
│ 3. Audio Analysis + Prompt Build     │ → Replicate: whisper + CLAP + LLM
│ 4. Beat Generation (3 variations)    │ → Replicate: google/lyria-3-pro
│ 5. Mixing (vocal + beat)             │ → FFmpeg in edge fn + AI
│ 6. Mastering                         │ → Replicate: stability-ai/stable-audio-2.5
│ 7. Harmony/Backup Vocals             │ → Replicate: zsxkib/realistic-voice-cloning
│ 8. Stem Generation                   │ → Replicate: cjwbw/demucs on final
│ 9. Trim 2 of 3 to 30s (free users)  │
└──────────────────────────────────────┘
        │
        ▼
  Store all outputs in Supabase Storage (vocal-projects bucket)
  Frontend polls vocal_projects table for status updates
  User picks best of 3 variations
```

## Implementation steps

### 1. Store Replicate API token as a secret
Add `REPLICATE_API_TOKEN` with the provided default token value.

### 2. Database: Create `vocal_projects` table

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid PK | |
| user_id | uuid | Owner |
| status | text | pending → cleaning → analyzing → generating → mixing → mastering → harmonizing → stems → done / error |
| original_vocal_url | text | Raw upload |
| clean_vocal_url | text | After demucs |
| analysis_data | jsonb | Whisper + CLAP output (tempo, key, mood, lyrics) |
| generated_prompt | text | LLM-built prompt for Lyria |
| beat_urls | jsonb | Array of 3 instrumental URLs |
| mixed_urls | jsonb | Array of 3 mixed track URLs |
| mastered_urls | jsonb | Array of 3 mastered URLs |
| harmony_urls | jsonb | Backup vocal/harmony URLs |
| stem_urls | jsonb | Final stems per variation |
| final_urls | jsonb | 3 final songs (full or trimmed) |
| selected_variation | int | User's pick (0-2) |
| is_paid | boolean | Whether user gets full 3-min for all 3 |
| genre | text | Target genre |
| error_message | text | |
| created_at / updated_at | timestamptz | |

RLS: Users can CRUD their own rows.

### 3. Create storage bucket `vocal-projects` (public)

### 4. Edge Function: `vocal-to-song` (main orchestrator)

Since the full pipeline takes 5-10 minutes and exceeds edge function timeouts, the architecture uses a **step-based approach**:

- **Initial call**: Uploads vocal, creates DB row, kicks off Step 1 (Demucs) via Replicate async prediction, saves prediction ID to DB, returns project ID immediately.
- **Polling edge function** (`vocal-to-song-poll`): Called by frontend every 10s. Checks current step's Replicate prediction status. If complete, starts next step. Updates DB status at each transition.

Each Replicate call follows:
```typescript
// Start prediction
const prediction = await fetch('https://api.replicate.com/v1/predictions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
  body: JSON.stringify({ model: 'cjwbw/demucs', input: { audio: vocalUrl } })
});
// Returns prediction ID — store it, poll later
```

### 5. Pipeline step details

**Step 1 — Vocal Cleaning** (`cjwbw/demucs`): Isolate pure vocal, remove noise/reverb/background.

**Step 2 — Analysis** (3 sequential Replicate calls):
- `openai/whisper-large-v3`: Transcribe lyrics, detect language
- `laion/clap`: Tag genre, mood, BPM, key
- `meta/llama-3.1-8b-instruct`: Combine analysis into a rich Lyria prompt (e.g. "upbeat Afrobeats, 128 BPM, G minor, emotional male vocal with soaring chorus, 3-minute structure with intro-verse-chorus-verse-chorus-bridge-chorus-outro")

**Step 3 — Beat Generation** (`google/lyria-3-pro`): Run 3 times with slight prompt variations to produce 3 instrumental options.

**Step 4 — Mixing**: Download clean vocal + each beat. Use FFmpeg (available in Deno) to align and blend. Apply gain staging, panning, basic EQ via FFmpeg filters.

**Step 5 — Mastering** (`stability-ai/stable-audio-2.5`): Post-process each mix for loudness, EQ, compression, streaming-ready output.

**Step 6 — Harmonies** (`zsxkib/realistic-voice-cloning`): Clone singer's voice from clean vocal, generate harmony/backup layers, mix into final.

**Step 7 — Stems** (`cjwbw/demucs`): Run on each final track to produce vocals, drums, bass, other stems.

**Step 8 — Trim logic**: For free users, only variation 1 is full 3-min. Variations 2 and 3 are trimmed to 30 seconds via FFmpeg.

### 6. Frontend changes

**AI Remix page (`AIRemix.tsx`)**: Add a "Create from Vocal" starter card alongside existing remix starters. When clicked, navigates to NewRemix with a `mode: 'vocal'` flag.

**NewRemix page**: When `mode === 'vocal'`, show simplified UI — just vocal upload + genre selection + optional description. No era/URL fields. Submit calls `vocal-to-song` edge function.

**New component: `VocalProjectStatus.tsx`**: Full-screen progress view showing pipeline stages with animated progress indicators. Polls `vocal-to-song-poll` every 10 seconds. When done, shows 3 playable variations with "Select" buttons.

**Result page**: After user picks a variation, navigate to MusicResultPage with the final audio URL and stems download links.

### 7. Files to create/modify

| File | Action |
|------|--------|
| `supabase/functions/vocal-to-song/index.ts` | **Create** — orchestrator edge function |
| `supabase/functions/vocal-to-song-poll/index.ts` | **Create** — polling/step-advancement function |
| `src/pages/NewRemix.tsx` | **Modify** — add vocal mode |
| `src/pages/AIRemix.tsx` | **Modify** — add vocal starter card |
| `src/components/VocalProjectStatus.tsx` | **Create** — progress + result picker UI |
| `src/hooks/useVocalProject.ts` | **Create** — polling hook |
| `supabase/config.toml` | **Modify** — add function configs |
| Database migration | **Create** — `vocal_projects` table + storage bucket |

### 8. Security

- Both edge functions validate JWT in code
- RLS on `vocal_projects`: users can only access their own rows
- Replicate token stored as secret, never exposed to client

## Cost estimate
~$0.30–0.60 per song (7 model calls across pipeline). Processing time: 5–10 minutes total.

