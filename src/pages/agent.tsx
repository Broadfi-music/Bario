import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, naira } from "@/lib/auth";
import PropertyCard from "@/components/PropertyCard";
import { PageTitle, Status, Empty } from "@/components/AppShell";

export function MyListings() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { supabase.from("property_catalog").select("*").eq("agent_id", user!.id).order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? [])); }, [user]);
  const count = (s: string) => rows.filter((r) => r.status === s).length;
  return (
    <>
      <PageTitle title="My listings" sub="Track verification and rental status." action={<Link to="/app/new" className="btn-primary"><Plus className="h-4 w-4" />Submit property</Link>} />
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {[["pending", "Pending verification"], ["active", "Active"], ["rented", "Rented"]].map(([s, l]) => <div key={s} className="card"><p className="text-sm text-muted-foreground">{l}</p><p className="font-display text-4xl font-bold">{count(s)}</p></div>)}
      </div>
      {rows.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{rows.map((p) => (
        <div key={p.id} className="relative">
          <PropertyCard p={p} showStatus />
          {p.status === "pending" && <Link to={`/app/edit/${p.id}`} className="btn-ghost absolute right-3 top-3 px-3 py-2"><Pencil className="h-3.5 w-3.5" /></Link>}
        </div>))}</div> : <Empty text="You haven't submitted any property yet." />}
    </>
  );
}

export function Leads() {
  const [rows, setRows] = useState<any[]>([]);
  const { user } = useAuth();
  const load = () => supabase.from("bookings").select("*, properties(title)").eq("agent_id", user!.id).order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); }, []);
  const set = async (id: string, status: string) => { await supabase.from("bookings").update({ status }).eq("id", id); load(); };
  return (
    <>
      <PageTitle title="Tenant leads" sub="Verified tenants requesting inspections or checking out on your listings." />
      {rows.length ? <div className="space-y-3">{rows.map((b) => (
        <div key={b.id} className="card flex flex-wrap items-center justify-between gap-3">
          <div><p className="font-bold">{b.properties?.title}</p><p className="text-sm text-muted-foreground">{b.kind === "inspection" ? `Inspection · ${b.scheduled_at ? new Date(b.scheduled_at).toLocaleString() : "date TBD"}` : "Fast-track checkout"} · {new Date(b.created_at).toLocaleDateString()}</p></div>
          <div className="flex items-center gap-2"><Status s={b.status} />
            {b.status === "requested" && b.kind === "inspection" && <button onClick={() => set(b.id, "confirmed")} className="btn-primary px-4 py-2">Confirm</button>}
            {b.status === "confirmed" && <button onClick={() => set(b.id, "completed")} className="btn-ghost px-4 py-2">Mark done</button>}
          </div>
        </div>))}</div> : <Empty text="No leads yet. You'll be notified the moment a tenant books." />}
    </>
  );
}

export function Earnings() {
  const [rows, setRows] = useState<any[]>([]);
  const { user } = useAuth();
  useEffect(() => { supabase.from("payments").select("*, properties(title)").eq("agent_id", user!.id).neq("status", "initiated").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? [])); }, [user]);
  const sum = (f: (r: any) => boolean) => rows.filter(f).reduce((a, r) => a + Number(r.agent_commission), 0);
  return (
    <>
      <PageTitle title="Commission & payouts" sub="Commission is released once the tenant receives keys." />
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="card bg-primary text-primary-foreground"><p className="text-sm opacity-80">Total earned</p><p className="font-display text-4xl font-bold text-accent">{naira(sum(() => true))}</p></div>
        <div className="card"><p className="text-sm text-muted-foreground">Pending (in escrow)</p><p className="font-display text-3xl font-bold">{naira(sum((r) => ["in_escrow", "keys_handed"].includes(r.status)))}</p></div>
        <div className="card"><p className="text-sm text-muted-foreground">Paid out</p><p className="font-display text-3xl font-bold">{naira(sum((r) => r.status === "released"))}</p></div>
      </div>
      {rows.length ? <div className="card overflow-x-auto p-0"><table className="w-full text-sm"><thead className="text-left text-muted-foreground"><tr className="border-b"><th className="p-4">Property</th><th>Rent</th><th>Your commission</th><th>Status</th><th>Paid out</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id} className="border-b last:border-0"><td className="p-4 font-semibold">{r.properties?.title}</td><td>{naira(r.rent)}</td><td className="font-semibold">{naira(r.agent_commission)}</td><td><Status s={r.status} /></td><td>{r.released_at ? new Date(r.released_at).toLocaleDateString() : "—"}</td></tr>)}</tbody></table></div>
        : <Empty text="Commission will appear here when a tenant pays for one of your listings." />}
    </>
  );
}
