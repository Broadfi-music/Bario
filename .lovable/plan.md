
# Clean Up Live Session UI

## Summary
Remove unnecessary text, icons, and labels from both the DemoLiveSpace header and the KickStyleLive action bar to achieve a cleaner TikTok-style layout.

## Changes

### 1. `src/components/podcast/DemoLiveSpace.tsx`
- **Remove** the session title (`activeDemo.title`) -- line 180-182
- **Remove** the description text (`activeDemo.description`) -- line 183-185
- **Remove** the "LIVE" badge next to the header -- lines 188-191
- **Remove** the Users icon and listener count -- lines 192-195
- Simplify or remove the entire Session Header block since all its content is being removed

### 2. `src/components/podcast/KickStyleLive.tsx`
- **Remove** the "LIVE" badge next to the host name (`<span className="text-xs bg-red-500/20...">LIVE</span>`) -- line 587
- **Remove** the session title line below the host name (`currentSession.title`) -- lines 589-591
- **Remove** the Headphones icon and "Listeners" count section -- lines 627-631
- **Reduce** the host name text size from `text-sm lg:text-base` to `text-xs` for a more compact look

## Technical Details

### DemoLiveSpace Header Cleanup
The entire `Session Header` div (lines 176-198) will be removed since all its children (title, description, LIVE badge, listener count) are being removed. This gives the speakers area more vertical space.

### KickStyleLive Action Bar Cleanup
In the Host Info Row:
- The host name stays but gets smaller text (`text-xs`)
- The "LIVE" span next to the name is removed
- The title paragraph below the name is removed  
- The Headphones + listener count div on the right side is removed
- Top Engagement and Daily Ranking indicators remain untouched
