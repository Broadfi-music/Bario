

# Notification System + Mystery Music Host Controls

## Overview
Build a full notification system to drive user engagement and traffic, plus add host controls for Mystery Music Drops. Notifications will be delivered in-app with real-time updates, and via browser Push Notifications so users receive alerts even when not on the site.

## Part 1: Database Setup

### New `notifications` table
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| user_id | uuid | Recipient |
| type | text | Category of notification |
| title | text | Display title |
| message | text | Body text |
| icon_url | text | Optional avatar/image |
| action_url | text | Where to navigate on click |
| is_read | boolean | Default false |
| created_at | timestamptz | Default now() |

RLS policies: Users can SELECT/UPDATE their own notifications. INSERT allowed for authenticated users (for system-generated via edge function or triggers).

Enable realtime on the notifications table so in-app notifications appear instantly.

### Notification Types
- **live_session** -- "DJ Amara just went live: Late Night Vibes"
- **follow_live** -- "Someone you follow is now live"
- **gift_received** -- "You received 5 Roses from @listener"
- **battle_invite** -- "You've been challenged to a battle!"
- **join_accepted** -- "Your request to speak was accepted"
- **chart_topper** -- "Track X just hit #1 on the Heatmap"
- **mystery_drop_highlight** -- "A mystery drop got 90% Keep votes"
- **new_follower** -- "User X started following you"
- **weekly_recap** -- "Your weekly stats: 500 listeners, 12 gifts"
- **achievement** -- "You unlocked the 'Fire Starter' badge"

## Part 2: Push Notifications (Browser)

### Service Worker (`public/sw.js`)
- Registers a service worker for handling push events
- Displays native browser notifications with title, body, icon
- Handles notification click to open the app at the correct URL

### Push Subscription Flow
- On login, prompt user for notification permission
- Store push subscription endpoint in a new `push_subscriptions` table
- Edge function `send-push-notification` sends Web Push notifications using VAPID keys

### New Secrets Needed
- **VAPID_PUBLIC_KEY** and **VAPID_PRIVATE_KEY** for Web Push (can be generated)

## Part 3: In-App Notification UI

### Notification Bell (in Navbar + Podcasts header)
- Bell icon with red unread count badge
- Click opens a Drawer/Sheet showing recent notifications
- Each notification shows icon, title, message, time ago, and unread dot
- Click a notification to mark as read and navigate to action_url
- "Mark all as read" button

### Real-time Updates
- Subscribe to `notifications` table changes for the logged-in user
- Increment unread count badge instantly when new notification arrives
- Play a subtle sound on new notification (optional)

## Part 4: Notification Triggers

### Edge Function: `create-notification`
A reusable edge function that inserts notifications and optionally sends push notifications.

### Trigger Points (integrated into existing code)
1. **Going Live** -- When a session status changes to "live", notify all followers
2. **Gift Received** -- When a row is inserted in `podcast_gifts`, notify recipient
3. **Join Request Accepted** -- When `space_join_requests` status changes to "accepted", notify requester
4. **Battle Invite** -- When `battle_invites` row inserted, notify target user
5. **New Follower** -- When `follows` row inserted, notify the followed user
6. **Chart Topper** -- Triggered from heatmap-sync edge function when a track hits top 3

## Part 5: Mystery Music Host Controls

### Host Toggle in DemoLiveSpace / HostStudio
- Add a small toggle button in the session header for hosts to enable/disable Mystery Drops
- Add a "Skip" button on the Mystery Drop card (visible only to host)
- Pass `enabled` and `onSkip` props to `MysteryMusicDrop` component

### MysteryMusicDrop Updates
- Accept `enabled` prop -- when false, don't trigger any drops
- Accept `onSkip` callback -- immediately stops current drop and advances to next
- Host can control without disrupting listeners

## Part 6: Testing Plan

After implementation:
1. Create an account and verify the notification bell appears
2. Trigger a live session and confirm "went live" notification appears
3. Send a gift and confirm recipient gets notification
4. Check browser push notification permission prompt on login
5. Verify Mystery Drop host toggle works (enable/disable/skip)
6. Take screenshots of each working feature

## Technical Details

### Files to Create
- `public/sw.js` -- Service worker for push notifications
- `src/components/NotificationBell.tsx` -- Bell icon with unread badge
- `src/components/NotificationCenter.tsx` -- Drawer listing notifications
- `src/hooks/useNotifications.ts` -- Hook for fetching, subscribing, marking read
- `supabase/functions/create-notification/index.ts` -- Edge function for creating and pushing notifications
- `supabase/functions/send-push-notification/index.ts` -- Edge function for Web Push delivery

### Files to Modify
- `src/components/Navbar.tsx` -- Add NotificationBell
- `src/pages/Podcasts.tsx` -- Add NotificationBell to header
- `src/components/podcast/DemoLiveSpace.tsx` -- Add host Mystery Drop toggle/skip
- `src/components/podcast/MysteryMusicDrop.tsx` -- Accept enabled/onSkip props
- `src/components/podcast/HostStudio.tsx` -- Add Mystery Drop toggle
- `src/contexts/AuthContext.tsx` -- Register push subscription on login
- `src/App.tsx` -- Register service worker on mount

### Database Migration
- Create `notifications` table with RLS
- Create `push_subscriptions` table with RLS
- Enable realtime on `notifications`
- Create database triggers on `podcast_gifts`, `follows`, `space_join_requests`, `battle_invites` to auto-insert notifications

