import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const PLATFORM_RATE = 0.02; // 2% service fee on rent

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: u } = await admin.auth.getUser(token);
    if (!u?.user) return json({ error: "Please sign in" }, 401);
    const user = u.user;
    const body = await req.json();
    const key = Deno.env.get("PAYSTACK_SECRET_KEY")!;

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
      const { data: prof } = await admin.from("profiles").select("full_name").eq("id", user.id).single();
      const today = new Date().toDateString();
      const agreement = `TENANCY AGREEMENT

This agreement is made on ${today} between the Landlord of the property known as "${p?.title}", ${p?.address ?? ""}, ${p?.area ?? ""} ${p?.city ?? ""} (through Bario as escrow agent) and ${prof?.full_name ?? user.email} ("the Tenant").

1. TERM: One (1) year commencing on the date keys are handed over.
2. RENT: ₦${Number(pay.rent).toLocaleString()} per annum, paid in full and held in Bario escrow until key handover.
3. FEES: Agency ₦${Number(pay.agency_fee).toLocaleString()}, Agreement ₦${Number(pay.agreement_fee).toLocaleString()}, Caution (refundable) ₦${Number(pay.caution_fee).toLocaleString()}, Service ₦${Number(pay.platform_fee).toLocaleString()}.
4. CAUTION DEPOSIT: Refundable at the end of tenancy less the cost of any damage beyond fair wear and tear.
5. USE: The premises shall be used for residential purposes only. No subletting without written consent.
6. HOUSE RULES: The Tenant shall keep the premises clean, respect neighbours, and pay utility bills promptly.
7. REPAIRS: Structural repairs are the Landlord's responsibility; minor repairs are the Tenant's.
8. TERMINATION: Either party may terminate with three (3) months' written notice.
9. DISPUTES: Disputes are first resolved through Bario mediation before any legal action.

Payment reference: ${pay.reference}`;
      await admin.from("agreements").insert({
        payment_id: pay.id, property_id: pay.property_id, tenant_id: user.id, agent_id: pay.agent_id, body: agreement,
      });
      const notes = [{ user_id: user.id, title: "Payment secured in escrow", body: `Your payment for "${p?.title}" is safe. Sign your tenancy agreement.` }];
      if (pay.agent_id) notes.push({ user_id: pay.agent_id, title: "Property rented", body: `"${p?.title}" was paid for. Commission is pending key handover.` });
      await admin.from("notifications").insert(notes);
      return json({ status: "in_escrow" });
    }
    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
