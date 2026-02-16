import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map room categories to relevant Deezer search queries
const categoryToSearchQueries: Record<string, string[]> = {
  'Philosophy': ['meditation music', 'ambient thinking', 'calm instrumental', 'mindfulness'],
  'Business': ['corporate motivation', 'business podcast intro', 'professional background', 'success motivation'],
  'Finance': ['money motivation', 'hustle beats', 'entrepreneur music', 'wealth mindset'],
  'Music': ['trending hits', 'new releases', 'top charts'],
  'Entertainment': ['party hits', 'feel good music', 'pop hits'],
  'Sports': ['gym motivation', 'workout beats', 'sports anthem'],
  'Technology': ['electronic ambient', 'tech house', 'synthwave'],
  'Health': ['relaxing music', 'yoga ambient', 'wellness sounds'],
  'Education': ['study music', 'focus beats', 'lo-fi study'],
  'Comedy': ['funny music', 'comedy show intro', 'upbeat fun'],
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse optional category/genre from request body
    let category = '';
    let roomTitle = '';
    try {
      const body = await req.json();
      category = body?.category || '';
      roomTitle = body?.roomTitle || '';
    } catch {}

    const tracks: any[] = [];

    // Get search queries based on category
    const searchQueries = category && categoryToSearchQueries[category]
      ? categoryToSearchQueries[category]
      : null;

    if (searchQueries) {
      // Fetch contextual tracks based on room category
      const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];
      try {
        const deezerRes = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=30`);
        if (deezerRes.ok) {
          const data = await deezerRes.json();
          if (data.data) {
            for (const t of data.data) {
              if (t.preview) {
                tracks.push({
                  title: t.title,
                  artist: t.artist?.name || 'Unknown',
                  coverUrl: t.album?.cover_medium || t.album?.cover || '',
                  previewUrl: t.preview,
                  source: 'deezer',
                });
              }
            }
          }
        }
      } catch (e) {
        console.error('Deezer contextual search error:', e);
      }

      // Also try searching by room title keywords for extra relevance
      if (roomTitle) {
        try {
          const titleWords = roomTitle.split(' ').slice(0, 3).join(' ');
          const titleRes = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(titleWords + ' music')}&limit=10`);
          if (titleRes.ok) {
            const titleData = await titleRes.json();
            if (titleData.data) {
              for (const t of titleData.data) {
                if (t.preview) {
                  tracks.push({
                    title: t.title,
                    artist: t.artist?.name || 'Unknown',
                    coverUrl: t.album?.cover_medium || t.album?.cover || '',
                    previewUrl: t.preview,
                    source: 'deezer',
                  });
                }
              }
            }
          }
        } catch {}
      }
    }

    // Fallback: fetch global trending if no contextual results or no category
    if (tracks.length < 10) {
      try {
        const deezerRes = await fetch('https://api.deezer.com/chart/0/tracks?limit=50');
        if (deezerRes.ok) {
          const data = await deezerRes.json();
          if (data.data) {
            for (const t of data.data) {
              if (t.preview) {
                tracks.push({
                  title: t.title,
                  artist: t.artist?.name || 'Unknown',
                  coverUrl: t.album?.cover_medium || t.album?.cover || '',
                  previewUrl: t.preview,
                  source: 'deezer',
                });
              }
            }
          }
        }
      } catch (e) {
        console.error('Deezer chart error:', e);
      }
    }

    // Fetch Audius trending (always good for discovery)
    const audiusKey = Deno.env.get('AUDIUS_API_KEY') || '';
    try {
      const genre = category === 'Music' ? '' : '';
      const audiusRes = await fetch(
        `https://discoveryprovider.audius.co/v1/tracks/trending?app_name=${audiusKey || 'bario'}&limit=15`
      );
      if (audiusRes.ok) {
        const data = await audiusRes.json();
        if (data.data) {
          for (const t of data.data) {
            let previewUrl = '';
            try {
              const searchRes = await fetch(
                `https://api.deezer.com/search?q=${encodeURIComponent(t.title + ' ' + t.user?.name)}&limit=1`
              );
              if (searchRes.ok) {
                const searchData = await searchRes.json();
                if (searchData.data?.[0]?.preview) {
                  previewUrl = searchData.data[0].preview;
                }
              }
            } catch {}

            if (!previewUrl) {
              previewUrl = `https://discoveryprovider.audius.co/v1/tracks/${t.id}/stream?app_name=${audiusKey || 'bario'}`;
            }

            tracks.push({
              title: t.title,
              artist: t.user?.name || 'Unknown',
              coverUrl: t.artwork?.['480x480'] || t.artwork?.['150x150'] || '',
              previewUrl,
              source: 'audius',
            });
          }
        }
      }
    } catch (e) {
      console.error('Audius error:', e);
    }

    // Deduplicate by title
    const seen = new Set<string>();
    const unique = tracks.filter(t => {
      const key = t.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Shuffle and return 20 tracks
    const shuffled = unique.sort(() => Math.random() - 0.5).slice(0, 20);

    console.log(`Mystery Music: category=${category}, roomTitle=${roomTitle}, returned ${shuffled.length} tracks`);

    return new Response(JSON.stringify({ tracks: shuffled }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Mystery music error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch tracks', tracks: [] }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
