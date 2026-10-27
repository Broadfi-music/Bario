import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { buildAgreement } from "./agreement.ts";
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const PLATFORM_RATE = 0.02; // 2% service fee on rent

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return json({ error: "Payment service unavailable" }, 503);
    const admin = createClient(url, serviceKey);
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: u } = await admin.auth.getUser(token);
    if (!u?.user) return json({ error: "Please sign in" }, 401);
    const user = u.user;
    const body = await req.json();
    const key = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!key) return json({ error: "Payment service unavailable" }, 503);

    if (body.action === "init") {
      const { data: p } = await admin.from("properties").select("*").eq("id", body.property_id).single();
      if (!p || p.status !== "active") return json({ error: "This property is not available" }, 400);
      const platform_fee = Math.round(Number(p.rent) * PLATFORM_RATE);
      const other_fees = (Array.isArray(p.other_fees) ? p.other_fees : []).reduce((a: number, f: any) => a + Math.max(0, Number(f?.amount) || 0), 0);
      const total = Number(p.rent) + Number(p.agency_fee) + Number(p.agreement_fee) + Number(p.caution_fee) + other_fees + platform_fee;
      const reference = `BR-${crypto.randomUUID().slice(0, 12)}`;
      const { error } = await admin.from("payments").insert({
        property_id: p.id, tenant_id: user.id, agent_id: p.agent_id,
        rent: p.rent, agency_fee: p.agency_fee, agreement_fee: p.agreement_fee, caution_fee: p.caution_fee, other_fees,
        platform_fee, total, agent_commission: p.agency_fee,
        landlord_payout: Number(p.rent) + Number(p.caution_fee) + other_fees, reference,
      });
      if (error) return json({ error: error.message }, 400);
      const r = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email, amount: Math.round(total * 100), reference, currency: "NGN",
          callback_url: `${body.origin}/app/payments?reference=${reference}`,
          metadata: { property_id: p.id },
        }),
      });
      const d = await r.json();
      if (!d.status) return json({ error: d.message ?? "Payment gateway error" }, 400);
      return json({ url: d.data.authorization_url, reference });
    }

    if (body.action === "verify") {
      const { data: pay } = await admin.from("payments").select("*").eq("reference", body.reference).single();
      if (!pay || pay.tenant_id !== user.id) return json({ error: "Payment not found" }, 404);
      if (pay.status !== "initiated") return json({ status: pay.status });
      const r = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(body.reference)}`, {
        headers: { Authorization: `Bearer ${key}` },
      });
      const d = await r.json();
      if (!d.status || d.data.status !== "success" || d.data.amount < Math.round(Number(pay.total) * 100))
        return json({ status: "initiated", message: d.data?.gateway_response ?? "Not paid yet" });
      await admin.from("payments").update({ status: "in_escrow", paid_at: new Date().toISOString() }).eq("id", pay.id);
      const { data: p } = await admin.from("properties").update({ status: "rented" }).eq("id", pay.property_id).select().single();
      const { data: prof } = await admin.from("profiles").select("*").eq("id", user.id).maybeSingle();
      const { data: lc } = await admin.from("property_contacts").select("*").eq("property_id", pay.property_id).maybeSingle();
      const rid = "BH-" + String(pay.id).replace(/-/g, "").slice(0, 10).toUpperCase();
      const agreement = buildAgreement({
        date: new Date(), receiptId: rid, reference: pay.reference,
        landlord: { name: lc?.landlord_name, phone: lc?.landlord_phone, email: lc?.landlord_email },
        tenant: { name: prof?.full_name ?? user.email, email: prof?.email ?? user.email, phone: prof?.phone, address: prof?.home_address, idNumber: prof?.id_number, nextOfKin: prof?.next_of_kin },
        property: p ?? {},
        pay: { rent: pay.rent, caution_fee: pay.caution_fee, agency_fee: pay.agency_fee, agreement_fee: pay.agreement_fee, other_fees: pay.other_fees, platform_fee: pay.platform_fee, total: pay.total },
      });
      await admin.from("agreements").insert({
        payment_id: pay.id, property_id: pay.property_id, tenant_id: user.id, agent_id: pay.agent_id, body: agreement,
      });
      const notes = [{ user_id: user.id, title: "Payment secured in escrow", body: `Your payment for "${p?.title}" is safe. Your receipt ID is ${rid}. Sign your tenancy agreement.` }];
      if (pay.agent_id) notes.push({ user_id: pay.agent_id, title: "Property rented", body: `"${p?.title}" was paid for. Commission is pending key handover.` });
      await admin.from("notifications").insert(notes);
      return json({ status: "in_escrow" });
    }
    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
