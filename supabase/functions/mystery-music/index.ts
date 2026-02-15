import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const tracks: any[] = [];

    // 1. Fetch Deezer chart (global trending)
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
      console.error('Deezer error:', e);
    }

    // 2. Fetch Audius trending
    const audiusKey = Deno.env.get('AUDIUS_API_KEY') || '';
    try {
      const audiusRes = await fetch(
        `https://discoveryprovider.audius.co/v1/tracks/trending?app_name=${audiusKey || 'bario'}&limit=30`
      );
      if (audiusRes.ok) {
        const data = await audiusRes.json();
        if (data.data) {
          for (const t of data.data) {
            // Try to get a Deezer preview for better quality
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

            // Fallback to Audius stream
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

    // Shuffle and return 20 tracks
    const shuffled = tracks.sort(() => Math.random() - 0.5).slice(0, 20);

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
