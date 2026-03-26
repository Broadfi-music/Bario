

# Extend Demo Room Audio to 3 Minutes Each

## Feasibility Check
- 3 minutes per room × 15 rooms = ~45 minutes total audio
- At ~150 words/min, each room needs ~450 words of script (~2,700 characters)
- Total: ~40,000 characters across all 15 rooms
- **3 minutes is the sweet spot** — long enough that users won't notice the loop quickly, short enough to stay within reasonable API usage

## Approach

### 1. Create Edge Function: `generate-demo-audio`
A backend function that:
- Takes a room config (script, speakers with voice IDs, language)
- Generates each speaker's lines via ElevenLabs TTS (`eleven_multilingual_v2`)
- Concatenates all clips into one MP3 using audio stitching (ArrayBuffer concat)
- Stores the result in Supabase Storage (`demo-audio` bucket)

### 2. Script Design (15 rooms, varied energy)
Each room gets a ~450-word multi-speaker script with natural conversation flow:

| Room | Language | Topic | Energy | Speakers |
|------|----------|-------|--------|----------|
| 1 | EN | AI vs Creative Jobs | Hot argument (5 speakers) | Marcus, Priya, Jake + 2 more |
| 2 | EN | Relationship Red Flags | Discussion (6 speakers) | Tasha, Devon, Nina + 3 more |
| 3 | EN | Bitcoin $200K | Analysis (5 speakers) | Alex, Sam + 3 more |
| 4 | EN | Comedy Hour | Lively banter (8 speakers) | DJ Smooth, Carmen, Big Mike + 5 more |
| 5 | EN | Healing After Heartbreak | Calm discussion (5 speakers) | Maya, Jordan + 3 more |
| 6 | HI | Bollywood vs Hollywood | Argument (6 speakers) | Raj, Ananya, Vikram + 3 more |
| 7 | HI | IPL Best Team | Hot argument (8 speakers) | Sunil, Ritu, Amit + 5 more |
| 8 | HI | Startup Stories | Discussion (5 speakers) | Kavita, Rohan + 3 more |
| 9 | HI | Meditation Talk | Calm (5 speakers) | Swami, Meera + 3 more |
| 10 | ES | Messi vs Ronaldo | Hot argument (7 speakers) | Carlos, Isabella, Diego + 4 more |
| 11 | ES | Reggaeton vs Salsa | Lively debate (6 speakers) | Luna, Pablo + 4 more |
| 12 | ES | Latin Entrepreneurship | Discussion (5 speakers) | Sofia, Miguel + 3 more |
| 13 | AR | Tech in MENA | Analysis (5 speakers) | Omar, Layla + 3 more |
| 14 | AR | Arabic Poetry | Calm discussion (6 speakers) | Fatima, Youssef, Hana + 3 more |
| 15 | AR | Arab Entrepreneurship | Discussion (5 speakers) | Tariq, Nour + 3 more |

### 3. Voice Assignment
Use distinct ElevenLabs voices per speaker role:
- Hosts: Roger, Sarah, George, Lily, Daniel, etc.
- Co-hosts/speakers: Different voices from the available 23 voices
- Map voices to gender/energy of each character

### 4. Generation Pipeline
- Use Lovable AI (Gemini) to generate all 15 conversation scripts in their respective languages
- Create an edge function that calls ElevenLabs for each speaker turn and concatenates
- Run generation for all 15 rooms
- Save MP3s to Supabase Storage, update `audioUrl` in `demoSessions.ts`

### 5. Update `demoSessions.ts`
- Add new speakers (5-8 per room) to the speakers arrays
- Update `audioUrl` to point to storage URLs instead of `/demo/` static files

## Files to Create/Modify
- `supabase/functions/generate-demo-audio/index.ts` — new edge function
- `src/config/demoSessions.ts` — expanded speaker lists, updated audio URLs

## Result
15 rooms with 3-minute realistic multi-voice conversations in 4 languages, with varied energies from calm meditation to heated 8-person arguments.

