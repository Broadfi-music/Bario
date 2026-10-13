import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";
// One-off: creates test tenant + agent accounts and sample listings. Delete after use.
Deno.serve(async () => {
  const a = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const out: any = {};
  const mk = async (email: string, role: string, name: string, phone: string) => {
    const { data: list } = await a.auth.admin.listUsers({ perPage: 1000 });
    let u = list.users.find((x) => x.email === email);
    if (!u) {
      const r = await a.auth.admin.createUser({ email, password: "BarioTest2026!", email_confirm: true, user_metadata: { role, full_name: name, phone } });
      if (r.error) throw r.error; u = r.data.user!;
    }
    await a.from("profiles").upsert({ id: u.id, email, full_name: name, phone, home_address: "12 Herbert Macaulay Way, Yaba, Lagos" });
    return u.id;
  };
  try {
    out.tenant = await mk("tenant.test@bario.icu", "tenant", "Tolu Adeyemi", "08030000001");
    const agent = await mk("agent.test@bario.icu", "agent", "Chidi Okafor", "08030000002");
    out.agent = agent;
    const { count } = await a.from("properties").select("id", { count: "exact", head: true }).eq("agent_id", agent);
    if (!count) {
      const homes = [
        { title: "Clean self-contain in Yaba", property_type: "Self-contain", area: "Yaba", address: "5 Alagomeji St", rent: 150000, agency_fee: 10000, agreement_fee: 5000, caution_fee: 2000, images: ["/sample/home1.jpg"] },
        { title: "Mini flat with prepaid meter", property_type: "Mini flat", area: "Surulere", address: "14 Adeniran Ogunsanya", rent: 350000, agency_fee: 35000, agreement_fee: 10000, caution_fee: 20000, images: ["/sample/home2.jpg"], other_fees: [{ label: "Service charge", amount: 15000 }] },
        { title: "Room & parlour in Gbagada", property_type: "Room & parlour", area: "Gbagada", address: "3 Diya St", rent: 250000, agency_fee: 25000, agreement_fee: 7500, caution_fee: 10000, images: ["/sample/home3.jpg"] },
      ];
      const { data: rows, error } = await a.from("properties").insert(homes.map((h) => ({ other_fees: [], ...h, agent_id: agent, city: "Lagos", bedrooms: 1, bathrooms: 1, status: "active", description: "Tiled floors, running water, secure compound. Verified by our team.", amenities: ["Borehole", "Prepaid meter", "Security"] }))).select("id");
      if (error) throw error;
      await a.from("property_contacts").insert(rows!.map((r) => ({ property_id: r.id, landlord_name: "Mr. Bello (test)", landlord_phone: "08030000009" })));
    }
    const k = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";
    out.paystack = k.startsWith("sk_test") ? "test" : k.startsWith("sk_live") ? "live" : k ? "unknown" : "missing";
    return new Response(JSON.stringify(out));
  } catch (e) { return new Response(JSON.stringify({ error: (e as any)?.message ?? JSON.stringify(e) }), { status: 500 }); }
});
