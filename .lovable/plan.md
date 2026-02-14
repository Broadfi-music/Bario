

# Add Invite Slots and Top Engagement to Live Sessions

## Overview
Based on the TikTok Live reference image, two features will be added to the live session UI:

1. **Invite Slots (Plus Circles)**: 4 circular "+" buttons displayed below the current speakers in both `DemoLiveSpace` and `SpaceParticipants`. Listeners can tap a slot to request to join as a speaker. For real sessions, the host sees an invitation request popup in their `HostStudio`. For demo sessions, tapping shows a simulated "Request sent!" toast.

2. **Top Engagement Indicator**: Below the session description in the action bar of `KickStyleLive`, show two overlapping user avatar circles with a count number (e.g., "13") representing the top engaged listeners/gifters -- similar to the reference image.

---

## File Changes

### 1. `src/components/podcast/DemoLiveSpace.tsx`
- After the speakers row, add a new row of **4 invite slot circles** (empty slots = MAX_SPEAKERS minus current speakers)
- Each slot is a dashed-border circle with a "+" icon inside
- Clicking a slot shows a toast: "Request sent to host!" (simulated for demo)
- Slots are styled with `w-14 h-14` circles with `border-2 border-dashed border-white/20` and a `Plus` icon

### 2. `src/components/podcast/SpaceParticipants.tsx`
- After the participants grid, add an **Invite Slots row** showing empty "+" circles
- Number of visible slots = `MAX_SPEAKERS - currentSpeakers` (up to 4 slots, showing only available ones)
- When a listener clicks a slot:
  - If not logged in, show the auth modal
  - If not yet joined, join the session first
  - If already joined, raise their hand (uses existing `toggleHandRaise` logic) and show toast "Request to speak sent!"
- If the user already has hand raised, the slot they clicked shows "Requested" state (yellow border)

### 3. `src/components/podcast/HostStudio.tsx`
- The host already sees raised hands and can promote speakers -- no structural changes needed
- Add a more prominent **"Speaker Request" notification badge** on the raised hands section header showing the count of pending requests
- When a hand-raise comes in, show a toast notification: "[UserName] wants to join as a speaker" with Accept/Decline buttons (inline toast action)

### 4. `src/components/podcast/KickStyleLive.tsx`
- In the Action Bar section (below host info, above action buttons), add a **Top Engagement** row
- Shows 2-3 overlapping avatar circles (from `topGifters` data already fetched) with a total engagement count
- Layout: two small overlapping circles (offset with negative margin) followed by a count number, e.g., "13"
- If no gifters exist, show simulated engagement count for demo sessions (random 8-20)

---

## Technical Details

### Invite Slots Component (shared logic)
```text
+--------+  +--------+  +--------+  +--------+
|   +    |  |   +    |  |   +    |  |   +    |
+--------+  +--------+  +--------+  +--------+
  Slot 1      Slot 2      Slot 3      Slot 4
```
- Visible slots = `Math.max(0, 4 - currentSpeakerCount)`
- Each slot: `w-14 h-14 rounded-full border-2 border-dashed border-white/20` with `Plus` icon centered
- On click: triggers hand-raise for real sessions, toast for demo sessions

### Top Engagement Indicator
```text
[avatar1][avatar2 overlapping]  13
```
- Uses existing `topGifters` state from KickStyleLive
- Avatars: `w-6 h-6 rounded-full` with `-ml-2` for overlap effect
- Count: total unique engagers (gifters + commenters count, or fallback to listener count)

### Host Notification for Speaker Requests
- Uses `sonner` toast with action button when a new hand-raise is detected
- Toast: "UserName wants to speak" with "Accept" button that calls `promoteSpeaker()`
