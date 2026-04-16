

# Vocal-to-Song Pipeline — Voice-Preserving Redesign

## Problem
Current pipeline uses Lyria 3 Pro to generate complete songs (including AI vocals), replacing the user's real voice. Users want their actual singing voice preserved with professional instrumentals behind it.

## Corrected Architecture

```text
User's raw vocal upload
        │
  1. Demucs ──────────── Clean vocal (remove noise/reverb)
        │
  2. Whisper ─────────── Transcribe lyrics + detect language
        │
  3. LLM (Gemini) ────── Build instrumental-only prompt
        │                 (explicitly: "no vocals, instrumental only")
  4. Lyria 3 Pro ×3 ──── Generate 3 INSTRUMENTAL-ONLY beats
        │
  5. Voice Clone ─────── zsxkib/realistic-voice-cloning
        │                 Clone user's voice → generate harmonies/backups
        │
  6. FFmpeg Mix ──────── Overlay clean vocal + harmonies onto each beat
        │                 (gain staging, panning, EQ filters)
        │
  7. Mastering ───────── stability-ai/stable-audio-open
        │                 Final polish (loudness, compression, streaming-ready)
        │
  8. Stem Split ──────── Demucs on final → downloadable stems
        │
  9. Trim Logic ──────── Free: 1×full + 2×30s | Paid: 3×full
```

## Key Difference from Current Code
- Lyria prompt explicitly says **"instrumental only, no vocals"**
- User's **real clean vocal** is mixed on top via FFmpeg
- Voice cloning creates **harmonies/backups in the user's own voice**
- Mastering uses Stable Audio for studio-quality polish

## Pipeline Statuses
`cleaning` → `analyzing` → `generating` (beat_1/2/3) → `cloning` → `mixing` (mix_1/2/3) → `mastering` (master_1/2/3) → `stems` → `done`

## Implementation

### Edge Function: `vocal-to-song-poll/index.ts` — Full rewrite of pipeline logic

**Steps 1-3** (cleaning → analyzing): Keep existing Demucs + Whisper + LLM logic but change the LLM prompt to generate **instrumental-only** Lyria prompts (e.g. "Create a professional instrumental backing track. NO vocals. Genre: Afrobeats. 120 BPM. Instruments: afro guitar, shaker, 808 bass...")

**Step 4** (generating): Keep Lyria 3 Pro ×3 but with instrumental-only prompts. After all 3 beats done, transition to `cloning` instead of `done`.

**Step 5** (cloning): New stage — call `zsxkib/realistic-voice-cloning` with the clean vocal as reference voice. Generate harmony/backup vocal lines. Store as `harmony_urls`.

**Step 6** (mixing): New stage — for each of the 3 beats, use FFmpeg (available in Deno via shell) to:
- Overlay clean vocal (centered, -1dB)
- Add harmonies (panned L/R, -6dB)
- Apply basic EQ and compression filters
- Output mixed WAV files → store as `mixed_urls`

**Step 7** (mastering): New stage — send each mixed track to `stability-ai/stable-audio-open` for final mastering polish. Store as `mastered_urls`.

**Step 8** (stems): Run Demucs on each mastered track → store individual stems.

**Step 9** (trim + done): Free users get variation 1 full, variations 2-3 trimmed to 30s. Set `final_urls` and status `done`.

### Edge Function: `vocal-to-song/index.ts` — Minor update
Remove genre requirement (already done). No other changes needed.

### Frontend: `VocalProjectStatus.tsx` — Update pipeline steps display
Add the new stages (cloning, mixing, mastering, stems) to the progress UI so users see accurate status.

### Frontend: `useVocalProject.ts` — Update status labels
Add labels for new pipeline statuses.

## Models Used
| Step | Model | Purpose |
|------|-------|---------|
| Vocal Clean | cjwbw/demucs | Isolate pure vocal |
| Transcribe | openai/whisper | Get lyrics + language |
| Prompt Build | Gemini 2.5 Flash | Create instrumental prompt |
| Beat Gen | google/lyria-3-pro | 3 instrumental variations |
| Voice Clone | zsxkib/realistic-voice-cloning | Harmonies in user's voice |
| Mixing | FFmpeg (in-edge-function) | Blend vocal + beat + harmonies |
| Mastering | stability-ai/stable-audio-open | Studio-quality polish |
| Stems | cjwbw/demucs | Downloadable stems |

## Estimated Time
~12-18 minutes total (7 Replicate calls + FFmpeg processing). Each Lyria call ~2-3min, voice cloning ~1-2min, mastering ~1-2min.

## Files Changed
| File | Action |
|------|--------|
| `supabase/functions/vocal-to-song-poll/index.ts` | Major rewrite — add cloning, mixing, mastering, stems stages |
| `src/components/VocalProjectStatus.tsx` | Update pipeline steps display |
| `src/hooks/useVocalProject.ts` | Add new status labels |

