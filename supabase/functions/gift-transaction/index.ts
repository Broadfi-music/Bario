import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Gift USD earnings mapping - MUST match TikTokGiftModal.tsx exactly
const GIFT_EARNINGS_MAP: Record<string, number> = {
  'rose': 0.0128,
  'heart': 0.064,
  'tofu': 0.064,
  'flame': 0.128,
  'fire': 0.64,
  'star': 1.28,
  'diamond': 2.56,
  'crown': 6.40
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, ...params } = await req.json();
    console.log(`[Gift Transaction] ✅ Action received: ${action}`, JSON.stringify(params));

    if (action === 'send_gift') {
      const { senderId, recipientId, sessionId, giftType, coinsCost, earningsUsd, giftCount = 1 } = params;

      console.log(`[Gift Transaction] 🎁 Processing gift:`, {
        senderId,
        recipientId,
        sessionId,
        giftType,
        coinsCost,
        earningsUsd,
        giftCount
      });

      if (!senderId || !recipientId || !sessionId || !giftType || !coinsCost || earningsUsd === undefined) {
        console.error('[Gift Transaction] ❌ Missing required fields');
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate earningsUsd against our mapping
      const expectedEarnings = (GIFT_EARNINGS_MAP[giftType.toLowerCase()] || 0) * giftCount;
      console.log(`[Gift Transaction] 💰 Earnings validation: received=$${earningsUsd}, expected=$${expectedEarnings}, giftType=${giftType}`);

      // Use the passed earningsUsd but log if it differs
      const finalEarnings = earningsUsd;
      if (Math.abs(earningsUsd - expectedEarnings) > 0.001) {
        console.warn(`[Gift Transaction] ⚠️ Earnings mismatch! Using passed value: $${earningsUsd}`);
      }

      // 1. Check sender's coin balance
      console.log(`[Gift Transaction] 📊 Checking sender balance for user: ${senderId}`);
      const { data: senderCoins, error: balanceError } = await supabase
        .from('user_coins')
        .select('balance, total_spent')
        .eq('user_id', senderId)
        .single();

      if (balanceError) {
        console.error('[Gift Transaction] ❌ Error fetching sender balance:', balanceError);
      }

      console.log(`[Gift Transaction] 💳 Sender balance: ${senderCoins?.balance || 0}, required: ${coinsCost}`);

      if (!senderCoins || senderCoins.balance < coinsCost) {
        console.error('[Gift Transaction] ❌ Insufficient coins');
        return new Response(
          JSON.stringify({ error: 'Insufficient coins', balance: senderCoins?.balance || 0 }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 2. Deduct coins from sender
      console.log(`[Gift Transaction] 💸 Deducting ${coinsCost} coins from sender`);
      const { error: updateError } = await supabase
        .from('user_coins')
        .update({
          balance: senderCoins.balance - coinsCost,
          total_spent: (senderCoins.total_spent || 0) + coinsCost,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', senderId);

      if (updateError) {
        console.error('[Gift Transaction] ❌ Failed to update sender coins:', updateError);
        throw updateError;
      }
      console.log(`[Gift Transaction] ✅ Coins deducted successfully`);

      // 3. Record gift in podcast_gifts with gift_count
      console.log(`[Gift Transaction] 📝 Recording gift in database`);
      const { error: giftError } = await supabase.from('podcast_gifts').insert({
        session_id: sessionId,
        sender_id: senderId,
        recipient_id: recipientId,
        gift_type: giftType,
        points_value: coinsCost,
        gift_count: giftCount
      });
      
      if (giftError) {
        console.error('[Gift Transaction] ❌ Failed to record gift:', giftError);
      } else {
        console.log('[Gift Transaction] ✅ Gift recorded in podcast_gifts');
      }

      // 4. Check if this session is part of a battle and update battle scores
      console.log(`[Gift Transaction] 🎮 Checking for active battle with session: ${sessionId}`);
      const { data: battle, error: battleError } = await supabase
        .from('podcast_battles')
        .select('id, host_id, opponent_id, host_score, opponent_score, status')
        .eq('session_id', sessionId)
        .eq('status', 'active')
        .single();

      if (battleError && battleError.code !== 'PGRST116') {
        console.error('[Gift Transaction] ❌ Error fetching battle:', battleError);
      }

      if (battle) {
        console.log(`[Gift Transaction] 🎮 Battle found: ${battle.id}, host_id=${battle.host_id}, opponent_id=${battle.opponent_id}`);
        console.log(`[Gift Transaction] 🎮 Current scores: host=${battle.host_score}, opponent=${battle.opponent_score}`);
        
        // Update the correct participant's score based on who received the gift
        if (recipientId === battle.host_id) {
          const newScore = battle.host_score + coinsCost;
          const { error: scoreError } = await supabase
            .from('podcast_battles')
            .update({ host_score: newScore, updated_at: new Date().toISOString() })
            .eq('id', battle.id);
          
          if (scoreError) {
            console.error('[Gift Transaction] ❌ Failed to update host_score:', scoreError);
          } else {
            console.log(`[Gift Transaction] ✅ Updated host_score: ${battle.host_score} -> ${newScore}`);
          }
        } else if (recipientId === battle.opponent_id) {
          const newScore = battle.opponent_score + coinsCost;
          const { error: scoreError } = await supabase
            .from('podcast_battles')
            .update({ opponent_score: newScore, updated_at: new Date().toISOString() })
            .eq('id', battle.id);
          
          if (scoreError) {
            console.error('[Gift Transaction] ❌ Failed to update opponent_score:', scoreError);
          } else {
            console.log(`[Gift Transaction] ✅ Updated opponent_score: ${battle.opponent_score} -> ${newScore}`);
          }
        } else {
          console.warn(`[Gift Transaction] ⚠️ Recipient ${recipientId} is not a battle participant`);
        }
      } else {
        console.log('[Gift Transaction] ℹ️ No active battle found for this session');
      }

      // 5. Update creator's earnings with the exact USD amount
      console.log(`[Gift Transaction] 💵 Updating creator earnings for: ${recipientId}, amount: $${finalEarnings}`);
      const { data: existingEarnings, error: earningsError } = await supabase
        .from('creator_earnings')
        .select('*')
        .eq('user_id', recipientId)
        .single();

      if (earningsError && earningsError.code !== 'PGRST116') {
        console.error('[Gift Transaction] ❌ Error fetching existing earnings:', earningsError);
      }

      if (existingEarnings) {
        const newTotalEarnings = parseFloat(existingEarnings.total_earnings_usd) + finalEarnings;
        const newPendingEarnings = parseFloat(existingEarnings.pending_earnings_usd) + finalEarnings;
        const newTotalCoins = existingEarnings.total_coins_received + coinsCost;
        
        console.log(`[Gift Transaction] 📈 Updating existing earnings: total=$${newTotalEarnings.toFixed(4)}, pending=$${newPendingEarnings.toFixed(4)}`);
        
        const { error: updateEarningsError } = await supabase
          .from('creator_earnings')
          .update({
            total_coins_received: newTotalCoins,
            total_earnings_usd: newTotalEarnings,
            pending_earnings_usd: newPendingEarnings,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', recipientId);

        if (updateEarningsError) {
          console.error('[Gift Transaction] ❌ Failed to update creator earnings:', updateEarningsError);
        } else {
          console.log('[Gift Transaction] ✅ Creator earnings updated successfully');
        }
      } else {
        console.log(`[Gift Transaction] 📝 Creating new earnings record for creator`);
        const { error: insertEarningsError } = await supabase.from('creator_earnings').insert({
          user_id: recipientId,
          total_coins_received: coinsCost,
          total_earnings_usd: finalEarnings,
          pending_earnings_usd: finalEarnings
        });

        if (insertEarningsError) {
          console.error('[Gift Transaction] ❌ Failed to create creator earnings:', insertEarningsError);
        } else {
          console.log('[Gift Transaction] ✅ Creator earnings record created');
        }
      }

      // 6. Record transaction for sender
      console.log(`[Gift Transaction] 📝 Recording coin transaction`);
      const { error: txError } = await supabase.from('coin_transactions').insert({
        user_id: senderId,
        type: 'gift_sent',
        amount: 0,
        coins: -coinsCost,
        description: `Sent ${giftCount}x ${giftType} gift`,
        status: 'completed',
        reference_id: sessionId
      });

      if (txError) {
        console.error('[Gift Transaction] ❌ Failed to record transaction:', txError);
      } else {
        console.log('[Gift Transaction] ✅ Transaction recorded');
      }

      console.log(`[Gift Transaction] 🎉 SUCCESS: ${giftCount}x ${giftType}, creator earns $${finalEarnings.toFixed(4)}, new balance: ${senderCoins.balance - coinsCost}`);

      return new Response(
        JSON.stringify({
          success: true,
          coins_spent: coinsCost,
          creator_earning: finalEarnings,
          new_balance: senderCoins.balance - coinsCost
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'credit_users') {
      // Credit specific users with coins (for testing/onboarding)
      const { usernames, coins } = params;
      console.log(`[Gift Transaction] 💰 Crediting users:`, usernames, `with ${coins} coins`);

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
          console.log(`[Gift Transaction] ✅ Credited ${coins} coins to ${username}`);
        } else {
          results.push({ username, success: false, error: 'User not found' });
          console.log(`[Gift Transaction] ❌ User not found: ${username}`);
        }
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.error(`[Gift Transaction] ❌ Invalid action: ${action}`);
    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[Gift Transaction] ❌ FATAL ERROR:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
