

# Fix Plan: End Stale Battle Session and Use Real Usernames in Comments

## Summary

Two issues need to be fixed:
1. **Stale Battle Session**: The battle between richieart51 (Richard) and Miracle Yakubu is still showing as "live" on the landing page even though it's no longer active
2. **Dummy Usernames in Comments**: Comments in battle/podcast sessions show fake names like "CryptoKing", "BeatDrop" instead of real usernames from the profiles table

---

## Issue 1: End the Stale Battle/Session

The database shows:
- **Session**: `aec38d76` - "Battle: richieart51 vs Miracle Yakubu" (status: live, created 7 hours ago)
- **Battle**: `80aa06ba` - host_score: 0, opponent_score: 0 (status: active)

This session is showing on the landing page's "Trending Now" section because the status is still 'live'. 

**Database Fix Required**:
- Mark the podcast session as 'ended'
- Mark the battle as 'ended'

---

## Issue 2: Use Real Usernames in Comments

**Current Problem**:
In `src/components/podcast/TwitchComments.tsx` at line 58-61:
```typescript
const getRandomUsername = (userId: string) => {
  const names = ['CryptoKing', 'MusicLover', 'BeatDrop', 'VibeCheck', 'NightOwl', 'StarGazer', 'WaveRider', 'SoundWave'];
  const index = userId.charCodeAt(0) % names.length;
  return names[index] + userId.slice(0, 3);
};
```

This generates random dummy names based on the user ID instead of fetching real names.

**Solution**:
1. Create a username cache (Map) to store user profiles
2. When fetching comments, also fetch the profiles for those users
3. When receiving realtime comments, fetch the profile for new users
4. Display `full_name` or `username` from the profiles table

---

## Technical Implementation

### File: `src/components/podcast/TwitchComments.tsx`

#### Changes:

1. **Add a username cache state** to store profile data:
```typescript
const [userProfiles, setUserProfiles] = useState<Map<string, { name: string; avatar?: string }>>(new Map());
```

2. **Update Comment interface** to include the fetched name:
```typescript
interface Comment {
  id: string;
  user_id: string;
  content: string;
  is_emoji: boolean;
  created_at: string;
  user_name?: string; // Already exists but not used
  fadeOut?: boolean;
}
```

3. **Modify `fetchRecentComments`** to fetch profiles for comment authors:
```typescript
const fetchRecentComments = async () => {
  const { data } = await supabase
    .from('podcast_comments')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (data) {
    // Fetch profiles for comment authors
    const userIds = [...new Set(data.map(c => c.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, username, avatar_url')
      .in('user_id', userIds);
    
    // Build profile map
    const profileMap = new Map();
    profiles?.forEach(p => {
      profileMap.set(p.user_id, {
        name: p.full_name || p.username || 'Listener',
        avatar: p.avatar_url
      });
    });
    setUserProfiles(prev => new Map([...prev, ...profileMap]));
    
    // Enrich comments with user names
    const enrichedComments = data.map(c => ({
      ...c,
      user_name: profileMap.get(c.user_id)?.name
    }));
    
    setComments(enrichedComments.reverse());
  }
};
```

4. **Update realtime handler** to fetch profile for new commenters:
```typescript
if (payload.eventType === 'INSERT') {
  const newComment = payload.new as Comment;
  
  // Fetch profile if not cached
  if (!userProfiles.has(newComment.user_id)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, full_name, username, avatar_url')
      .eq('user_id', newComment.user_id)
      .single();
    
    if (profile) {
      setUserProfiles(prev => new Map([...prev, 
        [profile.user_id, { name: profile.full_name || profile.username || 'Listener', avatar: profile.avatar_url }]
      ]));
      newComment.user_name = profile.full_name || profile.username || 'Listener';
    }
  } else {
    newComment.user_name = userProfiles.get(newComment.user_id)?.name;
  }
  
  setComments(prev => [...prev.slice(-99), newComment]);
}
```

5. **Update the username display** to use real names (line 314):
```typescript
// BEFORE:
{getRandomUsername(comment.user_id)}

// AFTER:
{comment.user_name || userProfiles.get(comment.user_id)?.name || 'Listener'}
```

6. **Update `handleReply`** function to use real names:
```typescript
const handleReply = (userId: string) => {
  const profile = userProfiles.get(userId);
  const username = profile?.name || 'User';
  setNewComment(`@${username} `);
};
```

---

## Database Cleanup

Mark the stale session and battle as ended:

```sql
-- End the stale podcast session
UPDATE podcast_sessions 
SET status = 'ended', ended_at = now() 
WHERE id = 'aec38d76-3fae-4357-9572-c8839ca99a29';

-- End the stale battle
UPDATE podcast_battles 
SET status = 'ended', ended_at = now() 
WHERE id = '80aa06ba-63e6-440d-b4de-b673cd888a18';
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/podcast/TwitchComments.tsx` | Fetch real usernames from profiles table instead of using dummy names |
| Database | End stale battle and session |

---

## Expected Results

After implementation:
1. The landing page will no longer show the old Miracle vs Richard battle in "Trending Now"
2. Comments in battle/podcast sessions will display real usernames like "Miracle Yakubu", "Holar Tech", "richieart51" instead of "CryptoKing5a2", "BeatDrop69f"

