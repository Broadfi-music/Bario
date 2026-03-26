

# Generate Remaining Demo Room Audio with New API Key

## Step 1: Update ElevenLabs Connection
Use the ElevenLabs connector reconnect flow so the new API key replaces the current one in the project secrets.

## Step 2: Generate Audio for 7 Remaining Rooms
Call the `generate-demo-audio` edge function for each room with compact ~1,100 character scripts (2 minutes each).

Already done: Rooms 1, 4, 6
Need to generate: Rooms 2, 3, 5, 7, 9, 10, 13

| # | Room | Lang | Topic | ~Chars |
|---|------|------|-------|--------|
| 1 | 2 | EN | Relationship Red Flags | 1,100 |
| 2 | 3 | EN | Bitcoin $200K | 1,100 |
| 3 | 5 | EN | Healing After Heartbreak | 1,000 |
| 4 | 7 | HI | IPL Best Team | 1,100 |
| 5 | 9 | HI | Meditation Talk | 900 |
| 6 | 10 | ES | Messi vs Ronaldo | 1,100 |
| 7 | 13 | AR | Tech in MENA | 1,100 |

**Total new characters: ~7,400** — fits within 10K free tier.

Generate one room at a time with 2-second delays between rooms to avoid rate limiting.

## Step 3: Update `demoSessions.ts`
- Set all `audioUrl` fields to point to Supabase storage bucket URLs
- Trim config to exactly 10 rooms (remove rooms 8, 11, 12, 14, 15)

## Files Modified
- `src/config/demoSessions.ts` — update audio URLs, trim to 10 rooms

## Security Note
After generation is complete, rotate the API key you shared in chat since it's now visible in conversation history.

