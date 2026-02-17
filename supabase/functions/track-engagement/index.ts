import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { track_id, country_code, action } = await req.json();

    if (!track_id || !action) {
      return new Response(
        JSON.stringify({ error: 'track_id and action are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['play', 'save', 'vote'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'action must be play, save, or vote' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const countryToUse = country_code || 'GLOBAL';

    // Upsert: increment the relevant counter
    // First try to get existing record
    const { data: existing } = await supabase
      .from('heatmap_engagement')
      .select('id, plays_count, saves_count, votes_count')
      .eq('track_id', String(track_id))
      .eq('country_code', countryToUse)
      .maybeSingle();

    let plays = existing?.plays_count || 0;
    let saves = existing?.saves_count || 0;
    let votes = existing?.votes_count || 0;

    if (action === 'play') plays++;
    if (action === 'save') saves++;
    if (action === 'vote') votes++;

    // Calculate score_boost: plays * 100 + saves * 500 + votes * 200
    const score_boost = plays * 100 + saves * 500 + votes * 200;

    if (existing) {
      await supabase
        .from('heatmap_engagement')
        .update({
          plays_count: plays,
          saves_count: saves,
          votes_count: votes,
          score_boost,
          last_played_at: action === 'play' ? new Date().toISOString() : undefined,
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('heatmap_engagement')
        .insert({
          track_id: String(track_id),
          country_code: countryToUse,
          plays_count: plays,
          saves_count: saves,
          votes_count: votes,
          score_boost,
          last_played_at: action === 'play' ? new Date().toISOString() : null,
        });
    }

    return new Response(
      JSON.stringify({ success: true, score_boost }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Track engagement error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
