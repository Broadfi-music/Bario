

## Two questions, one plan

### 1) Google Play closed testing — do they review first?

Yes. For closed testing on a **new app**, Google now requires a **mandatory review** of your first release before testers can install it. Timeline is usually **a few hours up to ~7 days** (first review of a brand new app is the slowest — sometimes 2–3 days). Subsequent updates to the same track are reviewed much faster (often <24h).

Why you can't "Save" right now is almost always one of:
- A required field on the **Store listing**, **App content**, or **Main store listing** is incomplete (red dot in the left sidebar)
- Missing **Data safety** form, **Content rating**, **Target audience**, **Privacy policy URL**, or **App access** instructions
- At least one **APK/AAB** must be uploaded to the closed testing track AND release notes filled in
- Testers list (email list or Google Group) must be attached to the track

You don't need code from me for this — just complete every section that shows a red exclamation in Play Console, then "Save → Review release → Start rollout to Closed testing." Review begins automatically.

---

### 2) Vocal-to-Song — full rebuild plan

You're right. The current pipeline is "text → random Stable Audio beat → browser EQ." That will never sound finished. Here is the new architecture.

### Core principle
**The vocal is the boss.** Everything (BPM, key, energy, arrangement, mix bus) is derived from the user's actual voice. We never generate a beat blind.

### New pipeline
```text
raw vocal upload
   │
   ▼
[1] Vocal cleanup     → Demucs (htdemucs) — already in place
   │
   ▼
[2] Vocal analysis    → Essentia/Librosa edge function
                        extracts: BPM, key, scale, downbeats,
                        phrase boundaries, RMS energy curve,
                        vocal style (rap/sung), language
   │
   ▼
[3] Prompt synthesis  → Lovable AI (gemini-3-flash) builds
                        a structured prompt from analysis +
                        user's text prompt ("afrobeats, dark")
   │
   ▼
[4] Conditioned beat generation (3 variations, 3 engines)
      Variation 1 → MusicGen-Melody (Replicate)
                    input: cleaned vocal as melody reference
                           + BPM + key + style prompt
                    → instrumental that FOLLOWS vocal contour
      Variation 2 → MiniMax Music API
                    input: vocal reference + lyrics + style
                    → "song-like" arrangement
      Variation 3 → Stable Audio (fallback only)
                    input: prompt + BPM/key as text
   │
   ▼
[5] Time alignment    → server-side time-stretch each beat
                        to vocal's exact BPM (sox/rubberband
                        via Replicate or a small Deno wrapper)
   │
   ▼
[6] Mix               → RoEx Tonn /mixpreviewmaster
                        upload: vocal stem + instrumental stem
                        sidechain, ducking, level balance
                        ALL handled by RoEx
   │
   ▼
[7] Master            → RoEx Tonn /mastering
                        target loudness -9 LUFS streaming
                        optional: user-supplied reference track
   │
   ▼
[8] Three finished songs stored in Supabase, shown on result page
```

### Why RoEx Tonn solves the mixing/mastering problem
- Purpose-built mixing + mastering API (not a generator) — exactly what we lack
- Free tier exists, fits your current "no money" constraint
- One API call replaces the entire fake browser EQ chain
- Can master to a reference track ("make it sound like this song") — perfect for the upload field on the result page
- Production key + dev key both available, will be added as `ROEX_API_KEY_PROD` and `ROEX_API_KEY_DEV` secrets

**Important**: You shared your API keys in chat. **Rotate them on the RoEx dashboard immediately** — anyone who saw this message can use them. I will store the new keys via Lovable Cloud secrets, not in code.

### Why MusicGen-Melody is the unlock
Stable Audio generates a beat from text, ignoring the vocal entirely — that's why it sounds disconnected. MusicGen-Melody **listens to the vocal first** and writes an instrumental that follows the melodic contour. This single change is the biggest quality jump available on Replicate today.

### Why three engines, not one
- Each variation uses a **different model**, so the three options actually sound different (current pipeline runs Stable Audio 3× → near-identical results)
- If MusicGen times out or fails, MiniMax/Stable still produce something
- User picks the winner, that one goes through final mastering

### Edge functions to add/rewrite
- `vocal-analyze` (new) — Librosa-style BPM/key/phrase detection via Replicate `riffusion/audio-analysis` or a Python-on-Replicate helper
- `vocal-to-song` (rewrite) — orchestrates analysis → 3 generators in parallel
- `vocal-to-song-poll` (extend) — track per-variation status (variation_1_status, variation_2_status, variation_3_status) so UI shows "1 of 3 ready" progressively
- `roex-mix-master` (new) — handles RoEx upload, polling, and download of finished file
- `time-align` (new, small) — calls a Replicate sox/rubberband model for BPM-locking

### Database changes
Add to `vocal_projects`:
- `vocal_bpm`, `vocal_key`, `vocal_energy`, `vocal_phrases` (analysis results)
- `variation_engines text[]` (which model produced each)
- `variation_statuses text[]` (per-variation pipeline state)
- `mastered_urls text[]` (RoEx outputs, separate from raw `mixed_urls`)
- `reference_track_url` (optional user-supplied master reference)

### Frontend changes
- `VocalProject.tsx` — show per-variation progress (V1: mixing, V2: ready, V3: generating)
- `VocalProjectStatus.tsx` — new stage labels matching the 8-step pipeline
- `MusicResult.tsx` — only play real `mastered_urls`, remove all browser FX/EQ code, add **"Master to sound like this"** reference upload field
- Retire `src/lib/audioMixer.ts` (browser mix) — replaced by RoEx server-side

### Risk + mitigation
- **MusicGen-Melody can be slow (~60–120s)**: run all 3 engines in parallel, return the first one that finishes so the user hears something fast
- **RoEx free tier rate limits**: queue mastering jobs, only master the variation the user actually selects (not all 3) — saves quota
- **Reference-track mastering quality**: optional feature; default Matchering-style preset if no reference uploaded
- **Replicate cost**: MusicGen-Melody is cheaper than running Stable Audio 3×, so net cost likely drops

### What I will NOT do
- Won't add Lyria 3 Pro — it's gated behind Google Vertex AI billing, not viable on free tier right now
- Won't add pitch correction by default — keeps the user's real voice intact (your stated requirement)
- Won't keep any browser-side audio generation — all rendering moves server-side

### Verification plan
After build I will:
1. Upload a real vocal via the app
2. Confirm `vocal-analyze` returns BPM/key in logs
3. Confirm 3 variations come from 3 different engines (check `variation_engines` column)
4. Confirm RoEx returns a mastered URL
5. Play all 3 results in the preview and report back which one sounds best
6. Share the Supabase row + edge function logs as evidence

### Files to touch
- `supabase/functions/vocal-to-song/index.ts` (rewrite)
- `supabase/functions/vocal-to-song-poll/index.ts` (extend)
- `supabase/functions/vocal-analyze/index.ts` (new)
- `supabase/functions/roex-mix-master/index.ts` (new)
- `supabase/functions/time-align/index.ts` (new)
- `src/hooks/useVocalProject.ts`
- `src/pages/VocalProject.tsx`
- `src/pages/MusicResultPage.tsx`
- `src/components/VocalProjectStatus.tsx`
- `src/components/MusicResult.tsx`
- New migration for `vocal_projects` columns
- Delete: `src/lib/audioMixer.ts`

### Action items before I start
1. **Rotate both RoEx keys now** on tonn-portal.roexaudio.com (the ones you pasted are compromised)
2. After approval, I'll request the new key via the secret tool — paste the rotated production key only
3. Confirm you want MusicGen-Melody + MiniMax + Stable Audio as the three engines (not a different combo)

