
# Dynamic Ranking System -- IMPLEMENTED ✅

Songs now compete for rank based on real user activity on Bario. Every play, save, or Three Strike vote boosts a track's score, causing it to climb the rankings and push other songs down.

## What Was Built

1. **`heatmap_engagement` table** -- Tracks plays, saves, votes per track per country with `score_boost` calculation
2. **`track-engagement` edge function** -- POST endpoint that records user engagement (play/save/vote) 
3. **`heatmap-tracks` edge function** -- Updated to query engagement data, add boost to attentionScore, and re-sort tracks dynamically
4. **AudioPlayerContext** -- Fires engagement "play" event when heatmap tracks are played
5. **ThreeStrike page** -- Fires engagement "vote" event on save votes

## Score Formula

`score_boost = plays_count * 100 + saves_count * 500 + votes_count * 200`

This boost is added to the base `attentionScore` from Deezer/Audius APIs, then all tracks are re-sorted. Songs with more Bario engagement climb higher.
