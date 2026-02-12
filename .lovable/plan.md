

# Fix: Feed Tab Not Working After Viewing Live Session from Heatmap

## Root Cause

In `src/pages/Podcasts.tsx`, there's a useEffect (line 145) that watches `[searchParams, liveSessions, selectedSession, activeTab]`. When clicking the Feed tab, three state changes fire at once: `setActiveTab('feed')`, `setSelectedSession(null)`, and `setSearchParams({})`.

The problem is that `setSearchParams({})` triggers a react-router URL navigation that can cause the useEffect to re-fire before the `setActiveTab('feed')` state update takes effect. In that intermediate render, the condition `!selectedSession && activeTab === 'live'` evaluates to `true`, which sets `selectedSession` back to a demo session -- keeping the Live view stuck on screen.

## Fix

**File: `src/pages/Podcasts.tsx`**

1. **Reduce the useEffect dependencies** -- it should only react to URL `searchParams` changes, not to `activeTab` or `selectedSession` (which creates circular state dependencies).

2. **Remove the problematic else-if** that auto-sets a demo session when the Live tab has no selected session. Instead, handle this in the render by passing a fallback directly to `KickStyleLive`.

Changes:

```typescript
// BEFORE (line 145-177):
useEffect(() => {
  const sessionId = searchParams.get('session');
  if (sessionId) {
    // ... sets session and activeTab='live'
  } else if (!searchParams.get('battle') && !selectedSession && activeTab === 'live') {
    const demoSession = getDemoPodcastSession();
    setSelectedSession(demoSession);  // <-- causes the race condition
  }
}, [searchParams, liveSessions, selectedSession, activeTab]);

// AFTER:
useEffect(() => {
  const sessionId = searchParams.get('session');
  if (sessionId) {
    if (isDemoLiveSession(sessionId)) {
      if (sessionId === DEMO_SESSION_ID_3) {
        setSelectedSession(getDemoPodcastSession3());
      } else if (sessionId === DEMO_SESSION_ID_2) {
        setSelectedSession(getDemoPodcastSession2());
      } else {
        setSelectedSession(getDemoPodcastSession());
      }
      setActiveTab('live');
      return;
    }
    setActiveTab('live');
    const foundSession = liveSessions.find(p => p.id === sessionId);
    if (foundSession) {
      setSelectedSession(foundSession);
    } else {
      fetchSessionById(sessionId);
    }
  }
  // NO else-if -- removed the auto-demo-set logic
}, [searchParams, liveSessions]);
// Removed selectedSession and activeTab from deps
```

3. **Add fallback in the render** so that when the Live tab is active with no selected session, it still shows a demo session:

```typescript
// In the render, line 476-484:
{activeTab === 'live' ? (
  <KickStyleLive
    sessions={liveSessions}
    currentIndex={currentIndex}
    onIndexChange={setCurrentIndex}
    selectedSession={selectedSession || getDemoPodcastSession()}  // fallback
    onSessionSelect={setSelectedSession}
    hostLiveSession={hostLiveSession}
  />
) : ...}
```

## Why This Fixes It

- The useEffect no longer depends on `activeTab` or `selectedSession`, so switching tabs can't trigger a state loop
- No more race condition between `setActiveTab` and `setSearchParams`
- The Live tab still shows a demo session by default (via the render fallback) without needing the useEffect to manage it
- Clicking Feed will cleanly switch tabs without the useEffect fighting back
