

# Fix UI Density — Fill Empty Space Like Twitch/Weverse

## Problem
The current feed has tiny elements (48px creator icons, small card grids) surrounded by massive dead space. Compared to Twitch and Weverse, the page looks empty and sparse.

## Changes

### 1. Larger Creator Avatars (PodcastFeed.tsx)
- Increase creator avatar circles from `w-12 h-12` (48px) to `w-16 h-16` (64px) on mobile, `w-20 h-20` (80px) on desktop
- Increase name text from `text-[8px]` to `text-[11px]`
- Add more spacing between avatars (`gap-4` → `gap-5`)
- Make the "Discover" button match the larger size
- Section heading from `text-[11px]` to `text-sm`

### 2. Bigger Live Channel Cards (PodcastFeed.tsx)
- Change grid from `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5` to `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3` — fewer columns = bigger cards
- Increase card gap from `gap-1.5 md:gap-2` to `gap-3`
- Host avatar in card info from `w-5 h-5` to `w-8 h-8`
- Title text from `text-[10px]` to `text-sm`, host name from `text-[9px]` to `text-xs`
- Category text from `text-[8px]` to `text-[11px]`

### 3. Sidebar Channel Items (PodcastFeed.tsx)
- Sidebar avatar from `w-5 h-5` to `w-8 h-8`
- Name text from `text-[10px]` to `text-xs`, category from `text-[9px]` to `text-[10px]`
- Item padding from `p-1` to `p-1.5`
- "RECOMMENDED CHANNELS" heading from `text-[8px]` to `text-[10px]`

### 4. Category Tabs (PodcastFeed.tsx)
- Increase pill text from `text-[10px]` to `text-xs`
- Increase padding from `px-2.5 py-1` to `px-3 py-1.5`

### 5. Hero Carousel (PodcastFeed.tsx)
- Increase height from `h-[180px] md:h-[200px] lg:h-[220px]` to `h-[200px] md:h-[260px] lg:h-[300px]`
- Title text from `text-xs` to `text-base`, description from `text-[9px]` to `text-xs`

### 6. Battle Cards (PodcastFeed.tsx)
- Match the same larger grid: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3`
- VS avatar from `w-7 h-7` to `w-10 h-10`

### 7. Episodes Grid (PodcastFeed.tsx)
- Change from `grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6` to `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`
- Title from `text-[9px]` to `text-xs`, host from `text-[8px]` to `text-[11px]`

### 8. Footer Banner
- Text from `text-[11px]` to `text-sm`, button text from `text-[10px]` to `text-xs`

## Files Modified
- `src/components/podcast/PodcastFeed.tsx` — all size/spacing increases above

## Result
Every element scales up to fill the available space. The page will feel dense and populated like Twitch, with no large empty gaps between small elements.

