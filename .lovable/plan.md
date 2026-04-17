

The user is frustrated. The current pipeline keeps falling back to "text → random beat" because the engines that *can* listen to a vocal (MusicGen-Melody) are either misconfigured or rate-limited on the free Replicate tier. Let me lay out exactly why this is hard, and a concrete path that actually works.

## Why "vocal → matching instrumental" is technically hard

1. **Most generation models are text-to-music.** Stable Audio, MiniMax, Suno, Udio — they all take text/lyrics and invent everything. They cannot "follow" a vocal melody.
2. **Only a few models accept audio conditioning:**
   - **MusicGen-Melody** (Meta) — extracts a chromagram from your vocal and writes an instrumental that follows that pitch contour. This is the *only* free-tier option that actually does what you want.
   - **MusicGen-Chord** — similar but follows chord progression instead of melody.
   - **Riffusion / AudioLDM2** — weaker, mostly text.
   - **Suno/Udio** — closed APIs, not on Replicate, and they generate full songs (vocals included), so they replace the user's voice rather than back it.
3. **Why our current code keeps failing:**
   - `meta/musicgen` 404 → I called the official-model path wrong (correct path is `meta/musicgen` with a `version`, not `models/meta/musicgen/predictions` for the melody variant).
   - 429 rate limits → free Replicate tier allows only **6 predictions/minute and 1 burst** under $5 credit. Launching 3 in parallel always trips it.
   - MiniMax was never wired in despite being approved.
   - Stable Audio takes only text → that's why it ignores the vocal.

## The plan that actually works on free tier

### Architecture
```text
upload vocal
   ↓
[1] Demucs cleans vocal (already works)
   ↓
[2] Local BPM/key/duration analysis (already works)
   ↓
[3] STAGGERED generation (one at a time, 12s apart, to dodge 429)
       slot 1: MusicGen-Melody (vocal as melody reference) ← THE KEY ENGINE
       slot 2: MiniMax music-1.5  (lyrics + style prompt)
       slot 3: MusicGen-Stereo    (text-only fallback)
   ↓
[4] Time-stretch each beat to vocal BPM (server-side via Replicate sox model)
   ↓
[5] RoEx Tonn /mixpreviewmaster (vocal + beat → mixed)
   ↓
[6] RoEx Tonn /mastering (final loudness)
   ↓
[7] Three finished URLs returned
```

### What I will fix this round

1. **Use the correct MusicGen-Melody endpoint**
   - Switch to `POST /v1/predictions` with the pinned `meta/musicgen` melody version hash
   - Pass `model_version: "stereo-melody-large"` + `input_audio: <cleaned vocal>` + `continuation: false`
   - This is the *one* engine that listens to the vocal — it must be slot 1 and must succeed

2. **Wire MiniMax music-1.5 correctly**
   - Endpoint: `minimax/music-1.5` on Replicate
   - Required inputs: `lyrics` (string, with `[verse]`/`[chorus]` tags), `voice_id` or `instrumental: true`, `song_file` reference
   - When user has no lyrics, auto-generate placeholder lyrics from vocal duration + genre using Lovable AI (Gemini Flash) so MiniMax has something to work with
   - Set `instrumental: true` so MiniMax outputs beat only (we keep the user's real vocal)

3. **Stagger launches to beat the 429 rate limit**
   - Launch slot 1 immediately
   - Launch slot 2 after 12 seconds
   - Launch slot 3 after 24 seconds
   - Each slot's prediction ID is stored independently → poll function handles them whenever they finish
   - If any slot 429s, retry that single slot up to 3 times with exponential backoff

4. **Per-slot status + real error surfacing**
   - `variation_statuses[i]` becomes one of: `queued | launching | generating | aligning | mastering | done | failed`
   - `variation_errors[i]` stores the actual error string (e.g. "Rate limited, retrying in 10s") so the UI shows real progress instead of "generation failed"
   - UI shows three cards filling in independently — you don't wait for all 3

5. **Time-alignment step**
   - After each beat finishes, call a small Replicate model (`afiaka87/sox` or equivalent) to stretch the beat to the vocal's exact BPM
   - This is the difference between "beat playing under vocal" and "beat actually locked to vocal"

6. **Honest expectations in the UI**
   - Add a one-line note under the upload form: *"Slot 1 follows your melody (best match). Slots 2 & 3 are alternate takes."*
   - If slot 1 fails after retries, show: *"Melody-matching engine is at capacity — try again in 1 minute for the best result."* This is honest and protects perceived quality.

### Why this is the realistic ceiling on free tier
- MusicGen-Melody is the **only free-tier model that conditions on audio**. There is no cheaper or better alternative right now.
- Suno/Udio quality requires paid closed APIs (~$0.10–0.30 per generation) and they generate vocals too, which contradicts your "keep the user's real voice" rule.
- Lyria 3 needs Vertex AI billing.
- The single biggest unlock you can buy later: **add $5 of Replicate credit** → rate limit jumps from 6/min to 600/min and we can run all 3 engines in parallel without staggering.

### What I will NOT do
- Won't switch to a fully-generated-song model (Suno/MiniMax with vocals on) — it would replace the user's voice
- Won't add browser-side mixing back
- Won't pretend MiniMax can follow a vocal melody — it can't, it's a song generator. We use it for the "alternate polished take" slot only.

### Files I'll touch
- `supabase/functions/vocal-to-song-poll/index.ts` — fix MusicGen endpoint, add MiniMax call, add staggered launch + retry, add real per-slot error storage
- `supabase/functions/vocal-to-song/index.ts` — set initial slot statuses to `queued` with launch_at timestamps
- `supabase/functions/time-align/index.ts` — new, calls sox model
- New migration adds `variation_errors text[]` and `variation_launch_at timestamptz[]`
- `src/components/VocalProjectStatus.tsx` + `src/components/VocalSongResult.tsx` — show per-slot progress/error
- `src/pages/VocalProject.tsx` — honest one-liner about engine roles

### Verification plan
After the build I will:
1. Upload a real vocal
2. Tail logs to confirm MusicGen-Melody returns a prediction ID (not 404, not 429)
3. Tail logs to confirm MiniMax returns a prediction ID with proper schema
4. Confirm `vocal_projects` row shows three different `variation_engines` and progressing statuses
5. Confirm RoEx returns mastered URLs
6. Play all three results and report back which slot sounds best

### One decision I need from you before building
Pick the engine layout for the three slots. I recommend Option A.

| Option | Slot 1 | Slot 2 | Slot 3 | Trade-off |
|--------|--------|--------|--------|-----------|
| **A (recommended)** | MusicGen-Melody (follows vocal) | MiniMax instrumental (polished pop) | MusicGen-Stereo (raw alt) | Best chance one slot truly matches the vocal |
| B | MusicGen-Melody | MusicGen-Chord (follows chords) | MiniMax instrumental | More "vocal-aware" but MusicGen-Chord is less proven |
| C | MusicGen-Melody x3 (different prompts) | — | — | Highest match quality but 3 similar results |

