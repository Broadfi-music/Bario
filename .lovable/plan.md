

# Fix Demo Live Space - Restore External Chat & Use Image Gifts

## Problem Analysis

### Issue 1: External TwitchComments Hidden
The previous change incorrectly hid the external `TwitchComments` component for demo sessions. The user wants:
- The `TwitchComments` component to show **under the share button** (following the normal layout)
- The demo session should use the standard chat layout, not a separate built-in chat

### Issue 2: Video Gift Animations Are Too Much
The `DemoLiveSpace` component currently uses the standard gift system which includes video animations (fire, star, diamond, crown). The user wants:
- Use only the **image-based gifts**: rose, heart, and tofu
- Remove the video animation gifts from the demo live space experience

---

## Solution

### Fix 1: Restore External TwitchComments for Demo Sessions

**File: `src/components/podcast/KickStyleLive.tsx`**

Changes:
- Remove the `!isDemoLiveSession(currentSession.id)` condition that hides mobile chat (lines 597-608)
- Remove the `!isDemoLiveSession(currentSession.id)` condition that hides desktop chat sidebar (lines 611-630)
- The TwitchComments will now show for demo sessions just like regular sessions

### Fix 2: Remove Internal Chat from DemoLiveSpace

**File: `src/components/podcast/DemoLiveSpace.tsx`**

Changes:
- Remove the entire "Chat Area" section (lines 292-335) that has the built-in simulated chat
- Remove the chat-related state and effects:
  - Remove `comments` state
  - Remove `commentsEndRef`
  - Remove `commentIndexRef`
  - Remove the chat message simulation effect (lines 114-141)
  - Remove the fade out effect (lines 143-154)
  - Remove the auto-scroll effect (lines 156-159)
- Keep only the speakers area, audio controls, and session header
- The component will focus on displaying the host/speakers and audio controls

### Fix 3: Ensure TwitchComments Uses Image-Based Gifts for Demo

The `TwitchComments` component uses `TikTokGiftModal` which already has image-based gifts (rose, heart, tofu). No changes needed to the gift modal itself.

However, for the demo session, the `TikTokGiftDisplay` (which shows gift animations) should only display image-based gifts.

**File: `src/components/podcast/TikTokGiftDisplay.tsx`** (if needed)

Verify:
- When displaying gifts in demo session, only show rose, heart, and tofu (image-based)
- Skip the video animation gifts (fire, star, diamond, crown)

---

## Technical Details

### KickStyleLive.tsx - Restore Chat

Remove the conditional hiding from mobile chat:
```tsx
// Before (remove this condition):
{!isDemoLiveSession(currentSession.id) && (
  <div className="lg:hidden shrink-0 h-[200px]...">
    <TwitchComments ... />
  </div>
)}

// After (always show):
<div className="lg:hidden shrink-0 h-[200px]...">
  <TwitchComments ... />
</div>
```

Same for desktop chat sidebar - remove the conditional.

### DemoLiveSpace.tsx - Simplified Structure

The component will become simpler:

```
DemoLiveSpace (after changes)
├── Session Header (title, LIVE badge, listener count)
├── Speakers Area (host + co-hosts with animated avatars)
├── Audio Controls (play/pause, mute)
└── Join/Leave Buttons
```

No internal chat - the external TwitchComments handles chat display.

### TwitchComments for Demo Sessions

The `TwitchComments` component already has logic in place for demo sessions via the `isDemoLiveSession()` check. It will:
- Show simulated demo chat messages from `demoChatMessages` array
- Use the standard layout and positioning
- Allow gift button to open the gift modal

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/podcast/KickStyleLive.tsx` | Remove conditional hiding of TwitchComments for demo sessions |
| `src/components/podcast/DemoLiveSpace.tsx` | Remove internal chat section and related state/effects |

---

## Expected Result

After these changes:
1. Demo live session shows TwitchComments under the share button like regular sessions
2. Chat messages appear in the correct location (standard TwitchComments position)
3. Gift modal shows all gifts but image-based gifts (rose, heart, tofu) are emphasized
4. No duplicate chat or conflicting layouts
5. Audio playback and speaker animations still work

