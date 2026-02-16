import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { user_id, type, title, message, icon_url, action_url, notify_followers, source_user_id } = await req.json();

    // If notify_followers is true, send to all followers of source_user_id
    if (notify_followers && source_user_id) {
      const { data: followers } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', source_user_id);

      if (followers && followers.length > 0) {
        const notifications = followers.map((f: any) => ({
          user_id: f.follower_id,
          type,
          title,
          message,
          icon_url: icon_url || null,
          action_url: action_url || null,
        }));

        const { error } = await supabase.from('notifications').insert(notifications);
        if (error) {
          console.error('Error inserting follower notifications:', error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(
          JSON.stringify({ success: true, count: notifications.length }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Single user notification
    if (!user_id || !type || !title || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, type, title, message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error } = await supabase.from('notifications').insert({
      user_id,
      type,
      title,
      message,
      icon_url: icon_url || null,
      action_url: action_url || null,
    });

    if (error) {
      console.error('Error creating notification:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
