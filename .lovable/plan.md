

# Generate 10 Demo Rooms × 2 Minutes Each

## Budget
- 2 min per room ≈ 300 words ≈ 1,800 characters per room
- 10 rooms × 1,800 chars = ~18,000 characters total
- Free tier = 10,000 chars → we'll need to be efficient (~1,000-1,200 chars per room with shorter turns)
- Already have rooms 1, 4, 6 generated — so we need 7 more new rooms + can keep those 3

## Revised Plan: 10 Rooms Total

Keep the 3 already-generated rooms (1, 4, 6) and generate 7 new ones. Trim all scripts to ~1,000-1,200 chars each (shorter lines, fewer turns) to fit within 10K char budget.

| Room | Lang | Topic | Speakers | ~Chars |
|------|------|-------|----------|--------|
| 1 ✅ | EN | AI vs Creative Jobs | Marcus, Priya, Jake | Done |
| 4 ✅ | EN | Comedy Hour | DJ Smooth, Carmen, Big Mike | Done |
| 6 ✅ | HI | Bollywood vs Hollywood | Raj, Ananya, Vikram | Done |
| 2 | EN | Relationship Red Flags | Tasha, Devon, Nina | ~1,100 |
| 3 | EN | Bitcoin $200K | Alex, Sam | ~1,100 |
| 5 | EN | Healing After Heartbreak | Maya, Jordan | ~1,000 |
| 7 | HI | IPL Best Team | Sunil, Ritu, Amit | ~1,100 |
| 9 | HI | Meditation Talk | Swami, Meera | ~900 |
| 10 | ES | Messi vs Ronaldo | Carlos, Isabella, Diego | ~1,100 |
| 13 | AR | Tech in MENA | Omar, Layla | ~1,100 |

**Total new chars: ~7,400** — fits within 10K free tier.

## Implementation Steps

1. **Call `generate-demo-audio` edge function** for each of the 7 remaining rooms with compact 2-minute scripts (~10-12 turns per room)
2. **Update `demoSessions.ts`**:
   - Reduce from 15 to 10 rooms
   - Update `audioUrl` to point to Supabase storage URLs for rooms with generated audio
   - Keep existing speaker configs
3. **Remove rooms 8, 11, 12, 14, 15** (the ones we won't generate audio for)

## Voice Assignment (same as before)
- Roger, Sarah, George, Lily, Daniel, Charlie, Liam, Alice, Matilda, Jessica, Eric, Chris, Brian, Bill

## Files Modified
- `src/config/demoSessions.ts` — trim to 10 rooms, update audio URLs
- Edge function calls via `curl_edge_functions` to generate 7 new room audios

