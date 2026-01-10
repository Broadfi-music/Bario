import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const endpoint = pathParts[pathParts.length - 1] || '';
  const resourceId = url.searchParams.get('id');

  console.log(`Bario API request: ${req.method} ${endpoint} ${resourceId || ''}`);

  try {
    // GET /bario-api?endpoint=tracks - Get trending tracks
    if (endpoint === 'tracks' && req.method === 'GET') {
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const search = url.searchParams.get('search');
      const genre = url.searchParams.get('genre');
      
      // Fetch from heatmap-tracks edge function
      const params = new URLSearchParams({ limit: limit.toString() });
      if (search) params.append('search', search);
      if (genre) params.append('genre', genre);
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/heatmap-tracks?${params}`,
        {
          headers: { 
            'Content-Type': 'application/json',
            'apikey': Deno.env.get('SUPABASE_ANON_KEY')!
          }
        }
      );
      
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /bario-api?endpoint=track&id=xxx - Get single track details
    if (endpoint === 'track' && req.method === 'GET' && resourceId) {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/heatmap-track-detail?id=${encodeURIComponent(resourceId)}`,
        {
          headers: { 
            'Content-Type': 'application/json',
            'apikey': Deno.env.get('SUPABASE_ANON_KEY')!
          }
        }
      );
      
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /bario-api?endpoint=uploads - Get user uploads (Bario Music)
    if (endpoint === 'uploads' && req.method === 'GET') {
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const userId = url.searchParams.get('user_id');
      
      let query = supabase
        .from('user_uploads')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return new Response(JSON.stringify({ 
        uploads: data,
        count: data?.length || 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /bario-api?endpoint=upload&id=xxx - Get single upload
    if (endpoint === 'upload' && req.method === 'GET' && resourceId) {
      const { data, error } = await supabase
        .from('user_uploads')
        .select(`
          *,
          profiles!user_uploads_user_id_fkey(username, full_name, avatar_url)
        `)
        .eq('id', resourceId)
        .single();
      
      if (error) throw error;
      
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /bario-api?endpoint=live - Get live podcast sessions
    if (endpoint === 'live' && req.method === 'GET') {
      const { data, error } = await supabase
        .from('podcast_sessions')
        .select(`
          *,
          profiles!podcast_sessions_host_id_fkey(username, full_name, avatar_url)
        `)
        .eq('status', 'live')
        .order('listener_count', { ascending: false });
      
      if (error) throw error;
      
      return new Response(JSON.stringify({ 
        sessions: data,
        count: data?.length || 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /bario-api?endpoint=creators - Get top creators
    if (endpoint === 'creators' && req.method === 'GET') {
      const limit = parseInt(url.searchParams.get('limit') || '20');
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          user_id,
          username,
          full_name,
          avatar_url,
          bio
        `)
        .not('username', 'is', null)
        .limit(limit);
      
      if (error) throw error;
      
      // Get follower counts
      const creatorsWithStats = await Promise.all(
        (data || []).map(async (creator) => {
          const { count: followerCount } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', creator.user_id);
          
          const { count: uploadCount } = await supabase
            .from('user_uploads')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', creator.user_id)
            .eq('is_published', true);
          
          return {
            ...creator,
            followers: followerCount || 0,
            uploads: uploadCount || 0
          };
        })
      );
      
      // Sort by followers
      creatorsWithStats.sort((a, b) => b.followers - a.followers);
      
      return new Response(JSON.stringify({ 
        creators: creatorsWithStats,
        count: creatorsWithStats.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /bario-api?endpoint=coin-packages - Get available coin packages
    if (endpoint === 'coin-packages' && req.method === 'GET') {
      const { data, error } = await supabase
        .from('coin_packages')
        .select('*')
        .eq('is_active', true)
        .order('coins', { ascending: true });
      
      if (error) throw error;
      
      return new Response(JSON.stringify({ packages: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /bario-api?endpoint=health - Health check
    if (endpoint === 'health' && req.method === 'GET') {
      return new Response(JSON.stringify({ 
        status: 'healthy',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Not found
    return new Response(JSON.stringify({ 
      error: 'Endpoint not found',
      available_endpoints: [
        'GET /bario-api?endpoint=tracks - Get trending tracks',
        'GET /bario-api?endpoint=track&id=xxx - Get track details',
        'GET /bario-api?endpoint=uploads - Get Bario Music uploads',
        'GET /bario-api?endpoint=upload&id=xxx - Get single upload',
        'GET /bario-api?endpoint=live - Get live podcast sessions',
        'GET /bario-api?endpoint=creators - Get top creators',
        'GET /bario-api?endpoint=coin-packages - Get coin packages',
        'GET /bario-api?endpoint=health - Health check'
      ]
    }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Bario API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
