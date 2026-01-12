import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Platform takes 30%, creator gets 70%
const CREATOR_SHARE = 0.70;
const PLATFORM_FEE = 0.30;

// Coin to USD conversion rate (based on ~$0.99 for 65 coins)
const COIN_TO_USD_RATE = 0.015; // ~$0.015 per coin

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, ...params } = await req.json();
    console.log(`[Gift Transaction] Action: ${action}`);

    if (action === 'send_gift') {
      const { senderId, recipientId, sessionId, giftType, coinsCost, pointsValue } = params;

      if (!senderId || !recipientId || !sessionId || !giftType || !coinsCost) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 1. Check sender's coin balance
      const { data: senderCoins } = await supabase
        .from('user_coins')
        .select('balance, total_spent')
        .eq('user_id', senderId)
        .single();

      if (!senderCoins || senderCoins.balance < coinsCost) {
        return new Response(
          JSON.stringify({ error: 'Insufficient coins', balance: senderCoins?.balance || 0 }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 2. Deduct coins from sender
      await supabase
        .from('user_coins')
        .update({
          balance: senderCoins.balance - coinsCost,
          total_spent: (senderCoins.total_spent || 0) + coinsCost,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', senderId);

      // 3. Record the gift
      await supabase.from('podcast_gifts').insert({
        session_id: sessionId,
        sender_id: senderId,
        recipient_id: recipientId,
        gift_type: giftType,
        points_value: pointsValue || coinsCost
      });

      // 4. Calculate creator earnings (70% of coin value)
      const coinValueUsd = coinsCost * COIN_TO_USD_RATE;
      const creatorEarning = coinValueUsd * CREATOR_SHARE;

      // 5. Update creator's earnings
      const { data: existingEarnings } = await supabase
        .from('creator_earnings')
        .select('*')
        .eq('user_id', recipientId)
        .single();

      if (existingEarnings) {
        await supabase
          .from('creator_earnings')
          .update({
            total_coins_received: existingEarnings.total_coins_received + coinsCost,
            total_earnings_usd: parseFloat(existingEarnings.total_earnings_usd) + creatorEarning,
            pending_earnings_usd: parseFloat(existingEarnings.pending_earnings_usd) + creatorEarning,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', recipientId);
      } else {
        await supabase.from('creator_earnings').insert({
          user_id: recipientId,
          total_coins_received: coinsCost,
          total_earnings_usd: creatorEarning,
          pending_earnings_usd: creatorEarning
        });
      }

      // 6. Record transaction for sender
      await supabase.from('coin_transactions').insert({
        user_id: senderId,
        type: 'gift_sent',
        amount: 0,
        coins: -coinsCost,
        description: `Sent ${giftType} gift`,
        status: 'completed'
      });

      console.log(`[Gift Transaction] Gift sent: ${coinsCost} coins, creator earns $${creatorEarning.toFixed(4)}`);

      return new Response(
        JSON.stringify({
          success: true,
          coins_spent: coinsCost,
          creator_earning: creatorEarning,
          new_balance: senderCoins.balance - coinsCost
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'credit_users') {
      // Credit specific users with coins (for testing/onboarding)
      const { usernames, coins } = params;

      if (!usernames || !coins) {
        return new Response(
          JSON.stringify({ error: 'Missing usernames or coins' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const results = [];

      for (const username of usernames) {
        // Find user by username
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id')
          .or(`username.ilike.${username},full_name.ilike.${username}`)
          .single();

        if (profile) {
          // Credit coins
          const { data: existingCoins } = await supabase
            .from('user_coins')
            .select('balance')
            .eq('user_id', profile.user_id)
            .single();

          if (existingCoins) {
            await supabase
              .from('user_coins')
              .update({
                balance: existingCoins.balance + coins,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', profile.user_id);
          } else {
            await supabase.from('user_coins').insert({
              user_id: profile.user_id,
              balance: coins
            });
          }

          // Record transaction
          await supabase.from('coin_transactions').insert({
            user_id: profile.user_id,
            type: 'credit',
            amount: 0,
            coins: coins,
            description: 'Welcome bonus coins',
            status: 'completed'
          });

          results.push({ username, success: true, coins_credited: coins });
        } else {
          results.push({ username, success: false, error: 'User not found' });
        }
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[Gift Transaction] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
