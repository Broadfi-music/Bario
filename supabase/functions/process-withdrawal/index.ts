import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WITHDRAWAL_THRESHOLD = 100; // $100 minimum

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, amount, bankName, accountNumber, accountName } = await req.json();
    
    console.log(`[Withdrawal] 📤 Processing withdrawal request:`, {
      userId,
      amount,
      bankName,
      accountNumber: accountNumber?.slice(-4), // Log only last 4 digits for security
      accountName
    });

    // Validate inputs
    if (!userId || !amount || !bankName || !accountNumber || !accountName) {
      console.error('[Withdrawal] ❌ Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (amount < WITHDRAWAL_THRESHOLD) {
      console.error(`[Withdrawal] ❌ Amount below threshold: $${amount} < $${WITHDRAWAL_THRESHOLD}`);
      return new Response(
        JSON.stringify({ error: `Minimum withdrawal amount is $${WITHDRAWAL_THRESHOLD}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Check creator earnings
    console.log(`[Withdrawal] 📊 Checking creator earnings for user: ${userId}`);
    const { data: earnings, error: earningsError } = await supabase
      .from('creator_earnings')
      .select('pending_earnings_usd, total_earnings_usd, withdrawn_earnings_usd')
      .eq('user_id', userId)
      .single();

    if (earningsError) {
      console.error('[Withdrawal] ❌ Error fetching earnings:', earningsError);
      return new Response(
        JSON.stringify({ error: 'Could not fetch earnings' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!earnings || earnings.pending_earnings_usd < amount) {
      console.error(`[Withdrawal] ❌ Insufficient earnings: $${earnings?.pending_earnings_usd || 0} < $${amount}`);
      return new Response(
        JSON.stringify({ error: 'Insufficient available earnings' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Withdrawal] ✅ Earnings verified: $${earnings.pending_earnings_usd} available`);

    // 2. Check for pending withdrawal requests
    const { data: pendingRequests } = await supabase
      .from('withdrawal_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'pending');

    if (pendingRequests && pendingRequests.length > 0) {
      console.error('[Withdrawal] ❌ User already has a pending withdrawal request');
      return new Response(
        JSON.stringify({ error: 'You already have a pending withdrawal request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Create withdrawal request
    console.log(`[Withdrawal] 📝 Creating withdrawal request for $${amount}`);
    const { data: withdrawalRequest, error: requestError } = await supabase
      .from('withdrawal_requests')
      .insert({
        user_id: userId,
        amount_usd: amount,
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
        status: 'pending'
      })
      .select()
      .single();

    if (requestError) {
      console.error('[Withdrawal] ❌ Failed to create withdrawal request:', requestError);
      throw requestError;
    }

    console.log(`[Withdrawal] ✅ Withdrawal request created: ${withdrawalRequest.id}`);

    // 4. Update creator earnings (move from pending to withdrawn)
    const newPendingEarnings = earnings.pending_earnings_usd - amount;
    const newWithdrawnEarnings = (earnings.withdrawn_earnings_usd || 0) + amount;

    console.log(`[Withdrawal] 💰 Updating earnings: pending $${earnings.pending_earnings_usd} -> $${newPendingEarnings}`);
    
    const { error: updateError } = await supabase
      .from('creator_earnings')
      .update({
        pending_earnings_usd: newPendingEarnings,
        withdrawn_earnings_usd: newWithdrawnEarnings,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('[Withdrawal] ❌ Failed to update earnings:', updateError);
      // Rollback: delete the withdrawal request
      await supabase.from('withdrawal_requests').delete().eq('id', withdrawalRequest.id);
      throw updateError;
    }

    console.log(`[Withdrawal] ✅ Earnings updated successfully`);

    // 5. Record the transaction
    await supabase.from('coin_transactions').insert({
      user_id: userId,
      type: 'withdrawal',
      amount: amount,
      coins: 0,
      description: `Withdrawal request: $${amount} to ${bankName}`,
      status: 'pending',
      reference_id: withdrawalRequest.id
    });

    console.log(`[Withdrawal] 🎉 SUCCESS: Withdrawal request for $${amount} submitted`);

    return new Response(
      JSON.stringify({
        success: true,
        request_id: withdrawalRequest.id,
        amount: amount,
        new_pending_balance: newPendingEarnings,
        message: 'Withdrawal request submitted successfully. Processing typically takes 1-3 business days.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[Withdrawal] ❌ FATAL ERROR:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});