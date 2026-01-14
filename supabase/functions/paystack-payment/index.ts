import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CoinPackage {
  id: string;
  name: string;
  coins: number;
  price_usd: number;
  bonus_coins: number;
}

// Current USD to NGN exchange rate (approximate - should be fetched from API in production)
const USD_TO_NGN_RATE = 1550;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { action, ...params } = await req.json();

    console.log(`[Paystack] Action: ${action}`);

    if (action === 'initialize') {
      // Initialize payment
      const { userId, email, packageId, currency = 'NGN' } = params;
      
      if (!userId || !email || !packageId) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch package details
      const { data: pkg } = await supabase
        .from('coin_packages')
        .select('*')
        .eq('id', packageId)
        .single();

      if (!pkg) {
        return new Response(
          JSON.stringify({ error: 'Invalid package' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Convert USD price to NGN, then to kobo (smallest Nigerian currency unit)
      // Paystack expects amounts in kobo (1 NGN = 100 kobo)
      const priceInNgn = pkg.price_usd * USD_TO_NGN_RATE;
      const amountInKobo = Math.round(priceInNgn * 100);
      
      console.log(`[Paystack] Converting $${pkg.price_usd} USD to ${priceInNgn} NGN (${amountInKobo} kobo)`);
      
      // Create payment reference
      const reference = `BARIO_${Date.now()}_${userId.slice(0, 8)}`;

      // Initialize Paystack transaction
      const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          amount: amountInKobo,
          currency,
          reference,
          callback_url: `${params.callbackUrl || 'https://bario.app'}/dashboard/rewards?payment=success`,
          metadata: {
            user_id: userId,
            package_id: packageId,
            coins: pkg.coins,
            bonus_coins: pkg.bonus_coins,
            custom_fields: [
              { display_name: "Package", variable_name: "package_name", value: pkg.name },
              { display_name: "Coins", variable_name: "total_coins", value: (pkg.coins + pkg.bonus_coins).toString() }
            ]
          },
          channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer']
        }),
      });

      const paystackData = await paystackResponse.json();
      console.log('[Paystack] Initialize response:', paystackData);

      if (!paystackData.status) {
        return new Response(
          JSON.stringify({ error: paystackData.message || 'Failed to initialize payment' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Record pending transaction
      await supabase.from('coin_transactions').insert({
        user_id: userId,
        type: 'purchase',
        amount: pkg.price_usd,
        coins: pkg.coins + pkg.bonus_coins,
        description: `Pending: ${pkg.name} package`,
        reference_id: reference,
        status: 'pending'
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          authorization_url: paystackData.data.authorization_url,
          access_code: paystackData.data.access_code,
          reference
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'verify') {
      // Verify payment
      const { reference } = params;
      
      if (!reference) {
        return new Response(
          JSON.stringify({ error: 'Missing reference' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify with Paystack
      const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
        },
      });

      const paystackData = await paystackResponse.json();
      console.log('[Paystack] Verify response:', paystackData);

      if (!paystackData.status || paystackData.data.status !== 'success') {
        // Update transaction as failed
        await supabase
          .from('coin_transactions')
          .update({ status: 'failed' })
          .eq('reference_id', reference);

        return new Response(
          JSON.stringify({ error: 'Payment verification failed', details: paystackData }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { metadata } = paystackData.data;
      const userId = metadata.user_id;
      const totalCoins = metadata.coins + metadata.bonus_coins;

      // Update transaction as completed
      await supabase
        .from('coin_transactions')
        .update({ status: 'completed' })
        .eq('reference_id', reference);

      // Credit user's coin balance
      const { data: existingCoins } = await supabase
        .from('user_coins')
        .select('balance, total_purchased')
        .eq('user_id', userId)
        .single();

      if (existingCoins) {
        await supabase
          .from('user_coins')
          .update({
            balance: existingCoins.balance + totalCoins,
            total_purchased: existingCoins.total_purchased + totalCoins,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
      } else {
        await supabase.from('user_coins').insert({
          user_id: userId,
          balance: totalCoins,
          total_purchased: totalCoins
        });
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          coins_credited: totalCoins,
          message: 'Payment verified and coins credited!'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'webhook') {
      // Handle Paystack webhook
      const event = params;
      console.log('[Paystack] Webhook event:', event.event);

      if (event.event === 'charge.success') {
        const { reference, metadata } = event.data;
        const userId = metadata.user_id;
        const totalCoins = metadata.coins + metadata.bonus_coins;

        // Update transaction as completed
        await supabase
          .from('coin_transactions')
          .update({ status: 'completed' })
          .eq('reference_id', reference);

        // Credit user's coin balance
        const { data: existingCoins } = await supabase
          .from('user_coins')
          .select('balance, total_purchased')
          .eq('user_id', userId)
          .single();

        if (existingCoins) {
          await supabase
            .from('user_coins')
            .update({
              balance: existingCoins.balance + totalCoins,
              total_purchased: existingCoins.total_purchased + totalCoins,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);
        } else {
          await supabase.from('user_coins').insert({
            user_id: userId,
            balance: totalCoins,
            total_purchased: totalCoins
          });
        }
      }

      return new Response(
        JSON.stringify({ received: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[Paystack] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
