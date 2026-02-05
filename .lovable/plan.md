

# Fix Demo Live Session - Speaker Layout & Video Animations

## Problem Analysis

### Issue 1: Video Gift Animations Still Showing
There are **TWO separate components** handling gift animations:

1. **`TikTokGiftDisplay`** - Shows small gift banners on the left side (already fixed with `DEMO_ALLOWED_GIFTS` filter)
2. **`GiftAnimation`** - Shows **FULL-SCREEN video animations** (NOT fixed!)

The `GiftAnimation` component (line 216-225) runs in demo mode and generates random gifts including video gifts (`fire`, `star`, `diamond`, `crown`). This is the source of the video animations still appearing.

**Root Cause**: `GiftAnimation` in demo mode generates random gifts from `['fire', 'heart', 'star', 'diamond', 'crown']` which includes 4 video gifts.

### Issue 2: Host Profile Icons Too Large
The speakers in `DemoLiveSpace` are displayed with large circular avatars:
- Host: `w-20 h-20 sm:w-24 sm:h-24` (80-96px)
- Co-hosts/Speakers: `w-16 h-16 sm:w-20 sm:h-20` (64-80px)

User wants them **very small** in a **rectangular listing style** (horizontal row layout).

---

## Solution

### Fix 1: Disable Full-Screen Video Animations for Demo Sessions

**File: `src/components/podcast/GiftAnimation.tsx`**

Changes:
- Import `isDemoLiveSession` from `@/lib/authUtils`
- At the start of the component, check if it's a demo session and **return null immediately**
- This completely disables the full-screen video animation component for demo sessions
- The image-based gift display (`TikTokGiftDisplay`) is already properly filtering gifts

```tsx
// At the top of GiftAnimation component:
if (isDemoLiveSession(sessionId)) {
  return null; // Don't show video animations for demo sessions
}
```

### Fix 2: Resize Speaker Icons to Small Rectangular Listing

**File: `src/components/podcast/DemoLiveSpace.tsx`**

Changes to `renderSpeaker` function and speaker layout:
- Change from vertical flex columns to horizontal row layout
- Reduce avatar sizes to very small: `w-8 h-8` (32px)
- Remove the separate "large" host display - all speakers in one row
- Use a compact rectangular card/list style
- Smaller text sizes

New layout structure:
```
┌──────────────────────────────────────────────────┐
│ [Session Header: Title, LIVE badge, listeners]   │
├──────────────────────────────────────────────────┤
│                                                  │
│   ┌────────────────────────────────────────┐     │
│   │ 🟣 Solomon Harvey • HOST                │     │
│   │ 🔵 Mind Coach • Co-host                 │     │
│   │ 🟢 Wisdom Seeker • Speaker              │     │
│   └────────────────────────────────────────┘     │
│                                                  │
│             [Play] [Mute] controls               │
│                                                  │
├──────────────────────────────────────────────────┤
│ [Join Session] [Leave]                          │
└──────────────────────────────────────────────────┘
```

---

## Technical Details

### GiftAnimation.tsx Changes

```tsx
import { isDemoLiveSession } from '@/lib/authUtils';

const GiftAnimation = ({ sessionId }: GiftAnimationProps) => {
  // Early return for demo sessions - no video animations
  if (isDemoLiveSession(sessionId)) {
    return null;
  }
  
  // ... rest of component unchanged
```

### DemoLiveSpace.tsx - Speaker Layout Changes

The renderSpeaker function will be updated to use:
- Small inline avatar: `w-8 h-8` 
- Horizontal flex row with name and role inline
- Compact styling with smaller fonts

```tsx
const renderSpeaker = (speaker: DemoSpeaker) => {
  const isActive = speaker.id === activeSpeaker && isPlaying;
  
  return (
    <div key={speaker.id} className="flex items-center gap-2 py-1.5 px-2">
      {/* Small circular avatar */}
      <div className="relative">
        <div 
          className={`w-8 h-8 rounded-full bg-gradient-to-br ${speaker.avatarGradient} 
            flex items-center justify-center 
            ${isActive ? 'ring-2 ring-green-500/50' : ''}`}
        >
          <span className="text-white font-bold text-xs">
            {speaker.name.charAt(0)}
          </span>
        </div>
        {isActive && (
          <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2">
            <AudioWaveform isActive={true} />
          </div>
        )}
      </div>
      
      {/* Name and role inline */}
      <div className="flex items-center gap-2">
        <span className="text-white text-xs font-medium">
          {speaker.name}
        </span>
        {speaker.role === 'host' && (
          <span className="bg-yellow-500 text-black text-[8px] font-bold px-1.5 py-0.5 rounded-full">
            HOST
          </span>
        )}
        {speaker.role === 'co_host' && (
          <span className="text-white/40 text-[10px]">Co-host</span>
        )}
        {speaker.role === 'speaker' && (
          <span className="text-white/40 text-[10px]">Speaker</span>
        )}
      </div>
    </div>
  );
};
```

The speakers area will use a rectangular listing:
```tsx
{/* Speakers Area - Rectangular List Style */}
<div className="flex-1 flex flex-col items-center justify-center px-4 py-4 min-h-0">
  <div className="bg-white/5 rounded-lg border border-white/10 w-full max-w-xs">
    {demoSession.speakers.map(speaker => renderSpeaker(speaker))}
  </div>
  
  {/* Audio Controls - smaller */}
  <div className="flex items-center gap-2 mt-4">
    {/* ... play/mute buttons ... */}
  </div>
</div>
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/podcast/GiftAnimation.tsx` | Return null early for demo sessions (disable video animations) |
| `src/components/podcast/DemoLiveSpace.tsx` | Resize speakers to small rectangular listing layout |

---

## Expected Result

After these changes:
1. **No video gift animations** in demo live session (completely disabled)
2. Only image-based gifts (rose, tofu, flame heart) display via `TikTokGiftDisplay`
3. Speaker icons are **very small** (32px) in a **rectangular vertical list** layout
4. Cleaner, more compact demo session view

