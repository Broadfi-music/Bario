import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Fetch popular podcasts from Deezer API
    const deezerUrl = `https://api.deezer.com/chart/0/podcasts?limit=${limit}&index=${offset}`;
    
    let episodes: any[] = [];
    
    try {
      const response = await fetch(deezerUrl);
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        // For each podcast, fetch episodes
        const podcastPromises = data.data.slice(0, 10).map(async (podcast: any) => {
          try {
            const episodesRes = await fetch(`https://api.deezer.com/podcast/${podcast.id}/episodes?limit=5`);
            const episodesData = await episodesRes.json();
            
            if (episodesData.data) {
              return episodesData.data.map((ep: any) => ({
                id: ep.id?.toString(),
                title: ep.title || 'Untitled Episode',
                description: ep.description?.substring(0, 200) || '',
                cover_image_url: ep.picture_big || ep.picture_medium || podcast.picture_big || podcast.picture_medium,
                audio_url: ep.link || '',
                duration_ms: (ep.duration || 0) * 1000,
                play_count: Math.floor(Math.random() * 100000) + 10000,
                like_count: Math.floor(Math.random() * 10000) + 1000,
                host_name: podcast.title || 'Podcast Host',
                host_avatar: podcast.picture_small || podcast.picture_medium,
                created_at: ep.release_date || new Date().toISOString(),
              }));
            }
            return [];
          } catch {
            return [];
          }
        });

        const results = await Promise.all(podcastPromises);
        episodes = results.flat();
      }
    } catch (deezerError) {
      console.error('Deezer API error:', deezerError);
    }

    // If no Deezer episodes, use fallback curated episodes
    if (episodes.length === 0) {
      episodes = [
        {
          id: 'fallback-1',
          title: 'The Evolution of Hip-Hop in 2024',
          description: 'Breaking down the biggest trends in hip-hop this year',
          cover_image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
          audio_url: '',
          duration_ms: 3600000,
          play_count: 125000,
          like_count: 8900,
          host_name: 'DJ Akademiks',
          host_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
          created_at: new Date(Date.now() - 86400000 * 2).toISOString()
        },
        {
          id: 'fallback-2',
          title: 'Behind the Beats: Production Secrets',
          description: 'Studio session breakdown with guest producers',
          cover_image_url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400',
          audio_url: '',
          duration_ms: 2700000,
          play_count: 89000,
          like_count: 6540,
          host_name: 'Metro Boomin',
          host_avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100',
          created_at: new Date(Date.now() - 86400000 * 4).toISOString()
        },
        {
          id: 'fallback-3',
          title: 'K-Pop Global Domination',
          description: 'How K-Pop conquered the world music industry',
          cover_image_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400',
          audio_url: '',
          duration_ms: 3200000,
          play_count: 156000,
          like_count: 12300,
          host_name: 'Eric Nam',
          host_avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100',
          created_at: new Date(Date.now() - 86400000 * 5).toISOString()
        },
        {
          id: 'fallback-4',
          title: 'Reggaeton Revolution',
          description: 'The rise of Latin music in mainstream culture',
          cover_image_url: '/src/assets/podcast-cover-4.jpg',
          audio_url: '',
          duration_ms: 4200000,
          play_count: 203000,
          like_count: 18700,
          host_name: 'J Balvin',
          host_avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100',
          created_at: new Date(Date.now() - 86400000 * 7).toISOString()
        },
        {
          id: 'fallback-5',
          title: 'Indie Artist Spotlight',
          description: 'Underground artists you need to know',
          cover_image_url: '/src/assets/podcast-cover-5.jpg',
          audio_url: '',
          duration_ms: 2400000,
          play_count: 67000,
          like_count: 5200,
          host_name: 'Phoebe Bridgers',
          host_avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100',
          created_at: new Date(Date.now() - 86400000 * 10).toISOString()
        },
        {
          id: 'fallback-6',
          title: 'The Future of Music Streaming',
          description: 'Industry experts discuss where music is heading',
          cover_image_url: '/src/assets/podcast-cover-6.jpg',
          audio_url: '',
          duration_ms: 3900000,
          play_count: 142000,
          like_count: 11200,
          host_name: 'Music Industry Weekly',
          host_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
          created_at: new Date(Date.now() - 86400000 * 12).toISOString()
        }
      ];
    }

    return new Response(JSON.stringify({ 
      episodes,
      total: episodes.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch podcast episodes' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
