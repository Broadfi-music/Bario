import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { title, message, type = "general", action_url, user_ids } = await req.json();

    if (!title || !message) {
      return new Response(
        JSON.stringify({ error: "title and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get target users - either specific user_ids or all users
    let targetUserIds: string[] = [];

    if (user_ids && Array.isArray(user_ids) && user_ids.length > 0) {
      targetUserIds = user_ids;
    } else {
      // Get all user IDs from profiles table
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id");

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch users" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      targetUserIds = (profiles || []).map((p: any) => p.user_id);
    }

    console.log(`Sending bulk notification to ${targetUserIds.length} users`);

    // Batch insert notifications
    const notifications = targetUserIds.map((user_id: string) => ({
      user_id,
      type,
      title,
      message,
      action_url: action_url || null,
      is_read: false,
    }));

    // Insert in batches of 100
    let insertedCount = 0;
    for (let i = 0; i < notifications.length; i += 100) {
      const batch = notifications.slice(i, i + 100);
      const { error } = await supabase.from("notifications").insert(batch);
      if (error) {
        console.error(`Batch insert error at ${i}:`, error);
      } else {
        insertedCount += batch.length;
      }
    }

    // Try to send push notifications to users with subscriptions
    let pushCount = 0;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    if (vapidPublicKey) {
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("*")
        .in("user_id", targetUserIds);

      if (subscriptions && subscriptions.length > 0) {
        pushCount = subscriptions.length;
        console.log(`Found ${pushCount} push subscriptions to notify`);
        // Push delivery is best-effort, we don't block on it
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_users: targetUserIds.length,
        notifications_inserted: insertedCount,
        push_subscriptions_found: pushCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
