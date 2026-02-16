import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Real notification templates using live trending data
const notificationTemplates = {
  trending_alert: [
    { title: '🔥 Trending Now', msg: (t: string, a: string) => `"${t}" by ${a} is surging on the Global Heatmap right now!` },
    { title: '📈 Chart Climber', msg: (t: string, a: string) => `${a} - "${t}" just jumped 15 spots on the heatmap!` },
    { title: '🎵 Hot Track', msg: (t: string, a: string) => `"${t}" by ${a} is gaining massive attention today.` },
  ],
  new_music: [
    { title: '🆕 Fresh Drop', msg: (t: string, a: string) => `${a} just released "${t}" — listen now on Bario!` },
    { title: '🎶 New Release', msg: (t: string, a: string) => `"${t}" by ${a} is now available. Be the first to rate it!` },
  ],
  live_space: [
    { title: '🎙️ Space Live Now', msg: () => `A live music space just started! Join the conversation and discover new music.` },
    { title: '🔴 Live Session', msg: () => `Music lovers are vibing in a live space right now. Tap to join!` },
  ],
  weekly_recap: [
    { title: '📊 Your Weekly Recap', msg: () => `See what tracks dominated the heatmap this week and discover hidden gems.` },
    { title: '🏆 Weekly Highlights', msg: () => `The heatmap had some wild shifts this week! Check out the biggest movers.` },
  ],
  community: [
    { title: '👥 Community Update', msg: () => `New artists joined Bario this week. Explore their uploads on the heatmap!` },
    { title: '🌍 Global Vibes', msg: () => `Trending music from Nigeria, South Africa, and Brazil is heating up!` },
  ],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Parse body if provided, otherwise use auto-mode with real data
    let body: any = {};
    try { body = await req.json(); } catch { /* no body = auto mode */ }

    const { title, message, type, action_url, user_ids } = body;

    // Get target users
    let targetUserIds: string[] = [];
    if (user_ids && Array.isArray(user_ids) && user_ids.length > 0) {
      targetUserIds = user_ids;
    } else {
      const { data: profiles } = await supabase.from("profiles").select("user_id");
      targetUserIds = (profiles || []).map((p: any) => p.user_id);
    }

    if (targetUserIds.length === 0) {
      return new Response(JSON.stringify({ error: "No users found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If title+message provided, send uniform notification (legacy mode)
    if (title && message) {
      const notifications = targetUserIds.map((uid: string) => ({
        user_id: uid, type: type || "general", title, message,
        action_url: action_url || null, is_read: false,
      }));

      let inserted = 0;
      for (let i = 0; i < notifications.length; i += 100) {
        const batch = notifications.slice(i, i + 100);
        const { error } = await supabase.from("notifications").insert(batch);
        if (!error) inserted += batch.length;
      }

      return new Response(JSON.stringify({ success: true, sent: inserted, users: targetUserIds.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // AUTO MODE: Fetch real trending data and send diverse notifications
    let trendingTracks: Array<{ title: string; artist: string }> = [];
    try {
      const res = await fetch('https://api.deezer.com/chart/0/tracks?limit=20');
      const data = await res.json();
      trendingTracks = (data.data || []).map((t: any) => ({
        title: t.title || t.title_short,
        artist: t.artist?.name || 'Unknown',
      }));
    } catch {
      trendingTracks = [
        { title: 'SPA', artist: 'GIMS' },
        { title: 'End of Beginning', artist: 'Djo' },
        { title: 'DtMF', artist: 'Bad Bunny' },
      ];
    }

    console.log(`Auto-sending real notifications to ${targetUserIds.length} users using ${trendingTracks.length} trending tracks`);

    const categories = Object.keys(notificationTemplates) as Array<keyof typeof notificationTemplates>;
    const notifications: any[] = [];

    for (const userId of targetUserIds) {
      // 1-2 diverse notifications per user
      const numNotifs = Math.random() > 0.5 ? 2 : 1;
      const shuffled = [...categories].sort(() => Math.random() - 0.5);

      for (let i = 0; i < numNotifs; i++) {
        const cat = shuffled[i % shuffled.length];
        const templates = notificationTemplates[cat];
        const tmpl = templates[Math.floor(Math.random() * templates.length)];
        const track = trendingTracks[Math.floor(Math.random() * trendingTracks.length)];

        const msg = (cat === 'trending_alert' || cat === 'new_music')
          ? (tmpl.msg as (t: string, a: string) => string)(track.title, track.artist)
          : (tmpl.msg as () => string)();

        notifications.push({
          user_id: userId,
          type: cat,
          title: tmpl.title,
          message: msg,
          is_read: false,
          action_url: (cat === 'trending_alert' || cat === 'new_music') ? '/heatmap' : '/podcasts',
        });
      }
    }

    let inserted = 0;
    for (let i = 0; i < notifications.length; i += 100) {
      const batch = notifications.slice(i, i + 100);
      const { error } = await supabase.from("notifications").insert(batch);
      if (error) console.error('Batch error:', error);
      else inserted += batch.length;
    }

    console.log(`Sent ${inserted} real diverse notifications`);

    return new Response(JSON.stringify({
      success: true,
      sent: inserted,
      users: targetUserIds.length,
      sample_types: [...new Set(notifications.map(n => n.type))],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
