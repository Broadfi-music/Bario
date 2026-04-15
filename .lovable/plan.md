

## PWA & Play Store Status

**Your PWA is already fully configured** with `vite-plugin-pwa`, manifest, icons, and service worker push notifications. It's ready for Play Store upload via TWA/PWABuilder.

**Important answer to your question about updates**: Since you're using a TWA (Trusted Web Activity) AAB file, **you do NOT need to re-upload the AAB** for content updates. The TWA is just a thin wrapper pointing to your published URL (`https://era-remix-studio.lovable.app`). Any updates you make in Lovable and publish will automatically reflect in the Play Store app. You only need to re-upload the AAB if you change the app name, icons, package name, or TWA configuration itself.

---

## UI Changes Plan

### 1. Mobile Bottom Nav: Change "Feed" to "DM"
**File**: `src/components/MobileBottomNav.tsx`
- Replace the second tab (currently `{ id: 'feed', icon: Sparkles, label: 'Feed', path: '/feed' }`) with `{ id: 'dm', icon: MessageCircle, label: 'DM', path: '/messages' }`
- Update `isActive` to check `location.pathname === '/messages'` for the `dm` tab
- Import `MessageCircle` from lucide-react instead of `Sparkles`

### 2. PWA Top Header: Remove "Home", keep only "Feed", add Notification icon
**File**: `src/pages/Podcasts.tsx` (lines 608-646)
- Remove the "Home" button entirely from the PWA header
- Keep only the "Feed" button (with Sparkles icon) as the single centered tab
- Add `<NotificationBell />` component next to the profile icon on the right side of the header (or as a separate absolute-positioned element)
- Import is already present (`NotificationBell` is imported at line 6)

### Summary of changes
| Location | Current | New |
|---|---|---|
| Bottom nav, 2nd tab | Feed → /feed | DM → /messages |
| PWA top header | Home + Feed | Feed only + Notification bell |

Two files modified: `MobileBottomNav.tsx` and `Podcasts.tsx`.

