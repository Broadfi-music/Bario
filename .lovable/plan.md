

## Implementation Plan: Heatmap Description & Podcast Rename to "Bario Space"

This plan covers three main changes:
1. Adding a descriptive tagline under the Listeners/Tracks stats on the Heatmap page
2. Renaming "Podcast" to "Bario Space" or "Space" across the navigation
3. Verification of battle livestreaming features (double-like, gifts)

---

### Change 1: Add Heatmap Description

**Location:** `src/pages/GlobalHeatmap.tsx` - Global Stats Bar section (lines 520-534)

**Current UI:**
```
Listeners: 24.8M ▲8.2% | Tracks: 112 | ● LIVE
```

**Proposed UI:**
```
Listeners: 24.8M ▲8.2% | Tracks: 112 | ● LIVE
The world's first music attention exchange - discover what's trending before anyone else
```

**Design Details:**
- Position: Below the stats bar, centered
- Styling: Small text (8-9px), subtle white/50 opacity
- Keep it concise and impactful

---

### Change 2: Rename "Podcast" to "Space" Across All Navigation

**Files to Update:**

| File | Line | Current | New |
|------|------|---------|-----|
| `src/components/Navbar.tsx` | 28 | "Podcast" | "Space" |
| `src/pages/GlobalHeatmap.tsx` | 454 | "Podcast" | "Space" |
| `src/pages/GlobalHeatmap.tsx` | 497 | "Podcast" | "Space" |
| `src/pages/Dashboard.tsx` | 202 | "Podcast" | "Space" |
| `src/pages/Index.tsx` | 253 | "Live Podcasts" | "Live Spaces" |
| `src/components/podcast/ShareModal.tsx` | 16 | "live podcast" | "live space" |

**Recommendation:** Use "Space" (shorter, cleaner) rather than "Bario Space" to keep navigation compact, especially on mobile.

---

### Change 3: Battle Livestreaming Verification

**Current Implementation Status:**

Based on code analysis, the battle system has:

- **Double-Like (Boost):** Implemented in `BattleLive.tsx` (lines 556-644)
  - 400ms double-tap detection window
  - 25 points per boost
  - Optimistic UI update + RPC call to `increment_battle_score`
  - Heart animation on successful boost
  - Real-time sync via Supabase subscription + 2-second polling fallback

- **Gift System:** Implemented in `TikTokGiftModal.tsx` + `gift-transaction` edge function
  - 8 gift types (Rose $0.0128 to Crown $6.40)
  - Quantity selector (1-99)
  - Creator selector for battle mode
  - Real-time gift display via Supabase subscription

- **Score Synchronization:**
  - Uses REPLICA IDENTITY FULL on `podcast_battles` table
  - RPC returns authoritative scores after increment
  - 500ms conflict resolution window prevents UI flickering

**Database Check:** Found 2 active battles in database (battle IDs: `80aa06ba...` and `4cb5b60f...`) but no live podcast sessions currently active.

**Testing Recommendation:**
To properly test, we need to:
1. Start a live battle session between two accounts
2. Have both creators and a listener join
3. Test double-tap boosting from all perspectives
4. Verify score sync across devices

---

### Technical Summary

```text
Files Modified:
├── src/components/Navbar.tsx ............ (1 line change)
├── src/pages/GlobalHeatmap.tsx .......... (3 line changes + description addition)
├── src/pages/Dashboard.tsx .............. (1 line change)
├── src/pages/Index.tsx .................. (1 line change)
└── src/components/podcast/ShareModal.tsx  (1 line change)

No database changes required.
No edge function changes required.
```

---

### Verification Checklist

After implementation:
- [x] Heatmap description appears below stats on desktop and mobile
- [x] All navigation links show "Space" instead of "Podcast"
- [x] Clicking "Space" still routes to `/podcasts` page correctly
- [x] Share modal text reflects the new naming
- [x] Leaderboard tab added to Space navigation (shows "In Development")
- [x] Music playback fixed - tracks without previews are filtered out
- [x] Audius tracks now have Deezer preview fallback

