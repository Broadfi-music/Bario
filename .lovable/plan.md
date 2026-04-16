
## Vocal-to-Song Fix Plan

### What I found
The app currently has two different flows, and they are being confused:

1. `/ai-remix` is not true song generation  
   - It calls the `remix` backend function.
   - That function only generates an `fx_config`.
   - It does not create a new audio file.
   - Database evidence: recent `tracks` rows have `status = done` but `remix_audio_url = null`.
   - The result screen then reprocesses the original upload in the browser, so it still sounds like the same song.

2. `/vocal-project` is the real vocal-to-song pipeline  
   - It calls `vocal-to-song` + `vocal-to-song-poll`.
   - But the current implementation only produces instrumental beat URLs and a “Voice + Beat” synced playback.
   - The UI literally says “Your Beats Are Ready”, so it is not delivering a final mixed/mastered song yet.

3. The core missing piece  
   - There is no actual backend stage that creates final rendered songs from:
     - cleaned vocal
     - generated instrumental
     - mix/master output
   - So right now there is no true “generated studio song” file being returned to the frontend.

### Root cause
The current implementation stopped halfway:
- AI Remix = prompt-to-FX config only
- Vocal Project = prompt-to-instrumental only
- Final render/mix/master output = not implemented

Also, the latest `vocal_projects` record is still stuck at `status = generating` with no `beat_urls` yet, so the live pipeline still needs real end-to-end verification and hardening.

## What I will build

### 1) Separate the two product modes clearly
I will make the product behavior unambiguous:

- **AI Remix**
  - stays a remix/effects feature only, or is visually marked as “Remix / not full song generation”
- **Create from Vocal**
  - becomes the real “raw vocal to finished song” flow
  - no fake result page
  - only shows a result when a real generated output exists

If needed, I’ll also route the upload/prompt experience so users don’t get sent into the wrong flow.

### 2) Turn vocal-to-song into a real final-audio pipeline
I will upgrade the vocal pipeline from:
```text
clean vocal + beat preview
```
to:
```text
raw vocal
→ vocal cleanup
→ transcription / prompt build
→ 3 instrumental generations
→ vocal/instrument alignment + mix
→ mastering
→ store 3 final song URLs
→ frontend result page
```

### 3) Replace the fake result logic
I will remove the current “generated result” behavior that just transforms the original audio locally.

Instead:
- result page will display:
  - original upload
  - generated final song option 1
  - generated final song option 2
  - generated final song option 3
- only real backend-generated URLs will be playable/downloadable
- no FX settings section
- no fallback that silently reuses the original upload

### 4) Add proper backend job states
I will make the backend state machine explicit so polling is reliable:

```text
pending
cleaning
transcribing
prompting
generating_variation_1
generating_variation_2
generating_variation_3
mixing
mastering
done
error
```

This will make the UI truthful and easier to debug.

### 5) Implement real final render storage
I will ensure the backend stores actual output URLs for:
- cleaned vocal
- generated beat variations
- final mixed song variations
- mastered output variations

And the frontend will only render results from those stored final URLs.

## Mixing / mastering / voice-preserving approach

### Recommended approach
To keep the creator’s real voice and avoid the “obvious AI vocal” feel:

- keep the uploaded vocal as the lead voice
- generate instrumental only
- do backend mixing/mastering around that lead vocal
- avoid replacing the lead vocal with a synthetic singer

### About voice clone / chorus / backups
Possible Replicate options exist, but I would treat them as **optional layered enhancements**, not the main vocal:
- chorus doubles / background stacks
- backing vocal texture
- optional harmony layer

That way:
- the lead remains the creator’s actual voice
- AI only supports, not replaces

### Important constraint
A real final mix requires actual audio rendering, not just metadata.  
So I will verify which model/service is best for:
- instrumental generation
- optional backing/harmony generation
- final mastering/render output

If a model is not reliable enough for production quality, I will keep it out of the default path rather than shipping fake results.

## Performance plan
You asked to keep it fast.

Since you chose **3 song options**, I’ll optimize around that goal:
- keep polling async
- avoid blocking request execution
- generate/store each variation as a tracked job stage
- prioritize getting variation 1 ready first, then 2 and 3
- show partial completion in UI when available

Best realistic UX:
- first playable result appears as early as possible
- remaining variations continue processing
- user doesn’t wait for all 3 before hearing something

## Verification I will do after implementation
I will verify all of this end to end:

1. Upload raw vocal file
2. Enter prompt
3. Submit from frontend
4. Confirm correct backend function is called
5. Confirm project row updates through each stage
6. Confirm model outputs are returned
7. Confirm final generated audio URLs are stored
8. Confirm frontend result page shows:
   - original upload
   - 3 real generated song outputs
9. Confirm it no longer replays the same original audio as the “generated” result
10. Confirm error handling and progress states are truthful

## Files I expect to update
- `src/pages/AIRemix.tsx`
- `src/pages/VocalProject.tsx`
- `src/components/VocalProjectStatus.tsx`
- `src/components/MusicResult.tsx`
- `src/pages/MusicResultPage.tsx`
- `src/hooks/useVocalProject.ts`
- `src/hooks/useAudioRemix.ts` or retire its fake-generation path
- `supabase/functions/vocal-to-song/index.ts`
- `supabase/functions/vocal-to-song-poll/index.ts`
- possibly database migration(s) for clearer status/output columns if needed

## Expected outcome
After this fix:
- uploading a vocal and entering a prompt will produce actual generated song results
- the frontend will show real outputs, not the same audio again
- the creator’s original voice remains the lead vocal
- the UI will accurately reflect what is really happening in the backend
- you’ll be able to upload again and judge real generated results from the app itself
