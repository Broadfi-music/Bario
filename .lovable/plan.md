

## Plan: Remove Non-Functional Features

### What gets removed

| Feature | Location | Reason |
|---------|----------|--------|
| **Three Strike** | Entire page + route + nav links | No functional purpose in the product |
| **Pass the Plug** button | HeatmapDetail header | Links to non-existent route |
| **Top Listeners** sidebar | HeatmapDetail right column | Dummy data, no real tracking |
| **Smart Feed** section | HeatmapDetail main content | No real user comments/activity |

### Changes by file

**1. `src/pages/ThreeStrike.tsx`** — Delete entire file

**2. `src/App.tsx`**
- Remove ThreeStrike import (line 42)
- Remove `/three-strike` route (line 100)

**3. `src/pages/GlobalHeatmap.tsx`**
- Remove "Three Strike" navigation links (around lines 491 and 552)

**4. `src/pages/HeatmapDetail.tsx`**
- Remove "Pass the Plug" button (lines 186-194) and the `Zap` icon import
- Remove "Smart Feed" card section (lines 435-456)
- Remove "Top Listeners" sidebar card (lines 492-519), the `showAllListeners` state, and the top listener avatars in the track header (around line 285)
- Remove related dummy data references (`topListeners`, `smartFeed`) from the track data object if generated in this file

**5. Cleanup**
- Remove `showAllListeners` state variable from HeatmapDetail
- Verify no other files reference these removed features

### What stays untouched
- Related Tracks sidebar (real data, useful)
- Artist Profile section (real data)
- All other heatmap functionality

