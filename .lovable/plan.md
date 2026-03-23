

## Plan: Remove Mystery Music Drop & Simplify

### What gets removed
1. **Component**: `src/components/podcast/MysteryMusicDrop.tsx` -- delete entirely
2. **Edge function**: `supabase/functions/mystery-music/index.ts` -- delete entirely
3. **All imports/references** to MysteryMusicDrop in:
   - `src/components/podcast/KickStyleLive.tsx` (the live room view)
   - `src/components/podcast/DemoLiveSpace.tsx` (demo room)
   - `src/components/podcast/HostStudio.tsx` (host controls for mystery music toggle/skip)
   - Any other files that import or reference it

### Steps
1. Search codebase for all `MysteryMusic` and `mystery-music` references
2. Remove the MysteryMusicDrop component file
3. Remove the mystery-music edge function
4. Clean up all imports and JSX references in live room components
5. Remove any host toggle/skip UI related to mystery drops

### What stays unchanged
- All other live room features (gifts, comments, battles, reactions)
- Audio room core functionality
- No database changes needed (mystery music has no tables)

