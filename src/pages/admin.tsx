import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Pencil, Check, X, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { naira } from "@/lib/auth";
import { PageTitle, Status, Empty } from "@/components/AppShell";
import { Activity, UserDetails } from "./AdminActivity";
import { Button } from "@/components/Button";
import { isAgentProfileComplete } from "@/lib/rentalRules";

export function Analytics() {
  const [d, setD] = useState<any>(null);
  useEffect(() => {
    (async () => {
      const [{ data: pays }, { data: props }, { data: roles }] = await Promise.all([
        supabase.from("payments").select("status,total,platform_fee,rent,created_at"),
        supabase.from("property_catalog").select("status"),
        supabase.from("user_roles").select("role"),
      ]);
      const paid = (pays ?? []).filter((p) => p.status !== "initiated");
      setD({
        rentals: paid.filter((p) => ["keys_handed", "released"].includes(p.status)).length,
        gross: paid.reduce((a, p) => a + Number(p.platform_fee), 0),
        volume: paid.reduce((a, p) => a + Number(p.total), 0),
        escrow: paid.filter((p) => ["in_escrow", "keys_handed", "disputed"].includes(p.status)).reduce((a, p) => a + Number(p.total), 0),
        pending: (props ?? []).filter((p) => p.status === "pending").length,
        active: (props ?? []).filter((p) => p.status === "active").length,
        tenants: (roles ?? []).filter((r) => r.role === "tenant").length,
        agents: (roles ?? []).filter((r) => r.role === "agent").length,
        disputes: paid.filter((p) => p.status === "disputed").length,
      });
    })();
  }, []);
  if (!d) return <p className="text-muted-foreground">Loading…</p>;
  const cards = [["Successful rentals", d.rentals], ["Platform gross revenue", naira(d.gross)], ["Total transaction volume", naira(d.volume)], ["Currently in escrow", naira(d.escrow)], ["Listings awaiting review", d.pending], ["Active listings", d.active], ["Tenants", d.tenants], ["Agents", d.agents], ["Open disputes", d.disputes]];
  return (
    <>
      <PageTitle title="Platform analytics" sub="Live view of betterhouse's health." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([l, v], i) => <div key={l as string} className={`card ${i === 1 ? "bg-primary text-primary-foreground" : ""}`}><p className={`text-sm ${i === 1 ? "opacity-80" : "text-muted-foreground"}`}>{l}</p><p className={`mt-1 font-display text-3xl font-bold ${i === 1 ? "text-accent" : ""}`}>{v}</p></div>)}
      </div>
      <Activity compact />
    </>
  );
}

export function AdminListings() {
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const load = () => supabase.from("properties").select("*, property_contacts(landlord_name, landlord_phone)").order("created_at", { ascending: false }).then(({ data, error }) => { if (error) toast.error(error.message); setRows(data ?? []); });
  useEffect(() => { load(); }, []);
  const set = async (id: string, status: string) => { const { error } = await supabase.from("properties").update({ status }).eq("id", id); error ? toast.error(error.message) : (toast.success(`Listing ${status}`), load()); };
  const del = async (id: string) => { if (confirm("Delete this listing?")) { await supabase.from("properties").delete().eq("id", id); load(); } };
  const shown = rows.filter((r) => filter === "all" || r.status === filter);
  return (
    <>
      <PageTitle title="Listings" sub="Verify agent submissions and manage the catalog." action={<Link to="/app/new" className="btn-primary"><Plus className="h-4 w-4" />New listing</Link>} />
      <div className="mb-5 flex flex-wrap gap-2">{["pending", "active", "rented", "rejected", "all"].map((s) => <button key={s} onClick={() => setFilter(s)} className={`chip border px-4 py-2 capitalize ${filter === s ? "bg-primary text-primary-foreground" : "bg-card"}`}>{s} ({s === "all" ? rows.length : rows.filter((r) => r.status === s).length})</button>)}</div>
      {shown.length ? <div className="space-y-3">{shown.map((p) => (
        <div key={p.id} className="card flex flex-wrap items-center gap-4">
          {p.images?.[0] && <img src={p.images[0]} alt="" className="h-20 w-28 rounded-xl object-cover" />}
          <div className="min-w-[200px] flex-1"><p className="font-bold">{p.title}</p><p className="text-sm text-muted-foreground">{p.area}, {p.city} · {naira(p.rent)}/yr</p><p className="text-xs text-muted-foreground">Landlord: {p.property_contacts?.landlord_name ?? "—"} · {p.property_contacts?.landlord_phone ?? "—"}</p><Link to={`/app/activity?user=${p.agent_id}`} className="text-sm font-semibold text-primary">Agent details</Link></div>
          <Status s={p.status} />
          <div className="flex gap-2">
            {p.status === "pending" && <><button onClick={() => set(p.id, "active")} className="btn-primary px-4 py-2"><Check className="h-4 w-4" />Approve</button><button onClick={() => set(p.id, "rejected")} className="btn-ghost px-4 py-2"><X className="h-4 w-4" />Reject</button></>}
            <Link to={`/app/edit/${p.id}`} className="btn-ghost px-3 py-2"><Pencil className="h-4 w-4" /></Link>
            <button onClick={() => del(p.id)} className="btn-ghost px-3 py-2 text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>))}</div> : <Empty text="Nothing here." />}
    </>
  );
}

export function Finance() {
  const [rows, setRows] = useState<any[]>([]);
  const load = () => supabase.from("payments").select("*, properties(title)").neq("status", "initiated").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); }, []);
  const set = async (id: string, status: string) => {
    const { error } = await supabase.from("payments").update({ status, ...(status === "released" ? { released_at: new Date().toISOString() } : {}) }).eq("id", id);
    error ? toast.error(error.message) : (toast.success("Updated"), load());
  };
  const s = (f: (r: any) => boolean, k = "total") => rows.filter(f).reduce((a, r) => a + Number(r[k]), 0);
  return (
    <>
      <PageTitle title="Escrow & finance" sub="Monitor incoming rent and manage disbursement splits." />
      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        {[["Held in escrow", s((r) => ["in_escrow", "keys_handed"].includes(r.status))], ["Disbursed", s((r) => r.status === "released")], ["Platform revenue", s(() => true, "platform_fee")], ["Disputed", s((r) => r.status === "disputed")]].map(([l, v]) => <div key={l as string} className="card"><p className="text-sm text-muted-foreground">{l}</p><p className="font-display text-2xl font-bold">{naira(v as number)}</p></div>)}
      </div>
      {rows.length ? <div className="space-y-3">{rows.map((p) => (
        <div key={p.id} className="card">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold">{p.properties?.title}</p><p className="text-xs text-muted-foreground">Ref {p.reference} · {new Date(p.paid_at ?? p.created_at).toLocaleString()}</p></div><div className="text-right"><p className="font-display text-xl font-bold">{naira(p.total)}</p><Status s={p.status} /></div></div>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-4">
            <div className="rounded-xl bg-muted p-3"><p className="text-xs text-muted-foreground">Landlord (rent + caution)</p><p className="font-semibold">{naira(p.landlord_payout)}</p></div>
            <div className="rounded-xl bg-muted p-3"><p className="text-xs text-muted-foreground">Agent commission</p><p className="font-semibold">{naira(p.agent_commission)}</p></div>
            <div className="rounded-xl bg-muted p-3"><p className="text-xs text-muted-foreground">Agreement fee</p><p className="font-semibold">{naira(p.agreement_fee)}</p></div>
            <div className="rounded-xl bg-muted p-3"><p className="text-xs text-muted-foreground">betterhouse fee</p><p className="font-semibold">{naira(p.platform_fee)}</p></div>
          </div>
          {p.dispute_reason && <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">Dispute: {p.dispute_reason}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {["in_escrow", "disputed"].includes(p.status) && <button onClick={() => set(p.id, "keys_handed")} className="btn-ghost px-4 py-2">Confirm key handover</button>}
            {p.status === "keys_handed" && <button onClick={() => set(p.id, "released")} className="btn-primary px-4 py-2">Release funds</button>}
            {["in_escrow", "disputed"].includes(p.status) && <button onClick={() => set(p.id, "refunded")} className="btn-ghost px-4 py-2 text-destructive">Refund tenant</button>}
          </div>
        </div>))}</div> : <Empty text="No payments yet." />}
    </>
  );
}

export function Users() {
  const [rows, setRows] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [tab, setTab] = useState("all");
  const [selected, setSelected] = useState<any>(null);
  useEffect(() => {
    Promise.all([supabase.from("profiles").select("*").order("created_at", { ascending: false }), supabase.from("user_roles").select("user_id, role")]).then(([p, r]) => {
      if (p.error || r.error) { toast.error("Could not load users. Please try again."); return; }
      setRows((p.data ?? []).map((u) => { const roles = (r.data ?? []).filter(x => x.user_id === u.id).map(x => x.role); return { ...u, role: roles.includes("admin") ? "admin" : roles.includes("agent") ? "agent" : "tenant" }; }));
    });
    supabase.from("payments").select("*, properties(title)").eq("status", "disputed").then(({ data }) => setDisputes(data ?? []));
  }, []);
  const shown = rows.filter((r) => tab === "all" || r.role === tab);
  return (
    <>
      <PageTitle title="Users & disputes" />
      {disputes.length > 0 && <div className="mb-8 space-y-2"><h2 className="font-bold">Open disputes</h2>{disputes.map((d) => <div key={d.id} className="card flex flex-wrap justify-between gap-2 border-destructive/30"><div><p className="font-semibold">{d.properties?.title}</p><p className="text-sm text-muted-foreground">{d.dispute_reason}</p></div><Link to="/app/finance" className="btn-ghost px-4 py-2">Resolve in finance</Link></div>)}</div>}
      <div className="mb-5 flex gap-2">{["all", "tenant", "agent", "admin"].map((s) => <button key={s} onClick={() => setTab(s)} className={`chip border px-4 py-2 capitalize ${tab === s ? "bg-primary text-primary-foreground" : "bg-card"}`}>{s}s</button>)}</div>
      <div className="card overflow-x-auto p-0"><table className="w-full text-sm"><thead className="text-left text-muted-foreground"><tr className="border-b"><th className="p-4">Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Profile</th><th>Joined</th></tr></thead>
        <tbody>{shown.map((u) => <tr key={u.id} className="border-b last:border-0"><td className="p-4 font-semibold"><Button className="text-left text-primary underline" onClick={() => setSelected(u)}>{u.full_name ?? "View user"}</Button>{u.avatar_url && <img src={u.avatar_url} alt="Profile" className="mt-2 h-10 w-10 rounded-full object-cover" />}</td><td>{u.email}</td><td>{u.phone ?? "—"}</td><td className="capitalize">{u.role}</td><td>{isAgentProfileComplete(u) ? <span className="chip bg-success/15 text-success">Complete</span> : <span className="chip bg-muted">Incomplete</span>}</td><td>{new Date(u.created_at).toLocaleDateString()}</td></tr>)}</tbody></table></div>
      {selected && <UserDetails profile={selected} close={() => setSelected(null)} />}
    </>
  );
}
