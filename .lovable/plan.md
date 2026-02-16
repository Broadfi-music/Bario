

# Testing, Fixing, and Enabling Push Notifications

## Current Status

### What's Working
- Notification bell icon is present in both Navbar and Podcasts header
- NotificationCenter drawer opens correctly with "Notifications" title, "Read all" and "Clear" buttons
- Mystery Music "Drop" toggle is visible in the live session header
- MysteryMusicDrop component accepts `enabled`, `isHost`, and `onSkip` props
- Database tables (`notifications`, `push_subscriptions`) exist with proper RLS
- Database triggers for `new_follower`, `gift_received`, `battle_invite`, `join_accepted` are active
- 7 test notifications exist in the database for 3 users
- Service worker (`sw.js`) is registered on app mount
- 34 registered users in the platform

### What's Missing / Broken
1. **No `send-push-notification` edge function exists** -- it was planned but never created
2. **No VAPID keys configured** -- needed for Web Push API
3. **Push subscription flow not implemented** -- users never subscribe to push notifications after login
4. **No scheduled/periodic notifications** -- nothing sends notifications to offline users proactively
5. **Console shows repeated `CHANNEL_ERROR`** for battle invite subscriptions (unrelated but noisy)

## Implementation Plan

### Step 1: Generate and Store VAPID Keys
- Generate a VAPID key pair (can be done via the edge function itself on first run, or hardcoded)
- Store `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` as secrets
- Add `VAPID_PUBLIC_KEY` as a public env variable in the codebase (it's safe -- it's a public key)

### Step 2: Create `send-push-notification` Edge Function
- New edge function at `supabase/functions/send-push-notification/index.ts`
- Accepts `user_id`, `title`, `message`, `action_url`, and optionally `notify_all` flag
- Looks up push subscriptions for the target user(s)
- Uses Web Push protocol with VAPID keys to send browser push notifications
- Falls back gracefully if no subscriptions exist

### Step 3: Add Push Subscription Flow in AuthContext
- After successful login/signup, request notification permission via `Notification.requestPermission()`
- If granted, subscribe to push via `serviceWorkerRegistration.pushManager.subscribe()`
- Save the subscription (endpoint, p256dh, auth) to `push_subscriptions` table
- This ensures every logged-in user is subscribed for push notifications

### Step 4: Create `send-bulk-notifications` Edge Function
- New edge function that can send notifications to all users or specific user groups
- Used for periodic engagement notifications (chart updates, weekly recaps, etc.)
- Inserts into `notifications` table AND sends push notifications
- Can be called manually or via a cron-like trigger

### Step 5: Send Test Notifications to All 34 Users
- Insert notifications for all registered users with engaging content:
  - "Trending Now: Aperture by Harry Styles just hit #1!"
  - "Live Now: Solomon Harvey is hosting 'As A Man Thinketh'"
  - "Your weekly recap is ready"
- Also trigger push notifications for any users with active subscriptions

### Step 6: Fix Minor Issues
- Suppress the `CHANNEL_ERROR` spam in console for battle invite subscriptions
- Ensure the notification bell shows unread count badge properly for logged-in users

### Step 7: Screenshots and Verification
- Navigate to the app logged in and show notification bell with unread count
- Open NotificationCenter and show notifications listed
- Show the Mystery Drop toggle and Skip button in live session
- Show the Mystery Drop card appearing with track info and vote buttons

## Technical Details

### Files to Create
- `supabase/functions/send-push-notification/index.ts` -- Web Push delivery edge function
- `supabase/functions/send-bulk-notifications/index.ts` -- Bulk notification sender

### Files to Modify
- `src/contexts/AuthContext.tsx` -- Add push subscription registration after login
- `src/components/podcast/DemoLiveSpace.tsx` -- Minor fix if needed
- `supabase/config.toml` -- Add verify_jwt config for new edge functions

### Secrets to Add
- `VAPID_PUBLIC_KEY` -- Public key for Web Push (also embedded in client code)
- `VAPID_PRIVATE_KEY` -- Private key for Web Push (edge function only)

### Database Operations
- Insert notifications for all 34 users to demonstrate the system working
- No schema changes needed (tables already exist)

