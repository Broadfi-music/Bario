import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, RefreshCw, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle, Status, Empty } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { naira } from "@/lib/auth";
import { isAgentProfileComplete } from "@/lib/rentalRules";

export function UserDetails({ profile, close }: { profile: Record<string, any>; close: () => void }) {
  const labels: Record<string, string> = { full_name: "Full name", email: "Email", phone: "Phone", alt_phone: "Other number", home_address: "Home address", occupation: "Occupation", institution: "School or employer", next_of_kin: "Next of kin", id_number: "NIN / student ID", bio: "About", created_at: "Joined", id: "Account ID" };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/60 p-4" onClick={close}>
    <section role="dialog" aria-modal="true" aria-label="Account details" className="max-h-[85dvh] w-full max-w-xl overflow-y-auto rounded-lg bg-card p-6 shadow-[var(--shadow-soft)]" onClick={e => e.stopPropagation()}>
      <div className="flex items-start justify-between gap-3"><div><h2 className="text-2xl font-bold">Account details</h2><p className="capitalize text-muted-foreground">{profile.role ?? "Agent"}</p></div><Button aria-label="Close details" className="p-2" onClick={close}><X size={20} /></Button></div>
      {profile.avatar_url ? <img src={profile.avatar_url} alt={`${profile.full_name || "User"} profile`} className="my-5 h-24 w-24 rounded-full object-cover" /> : <p className="my-5 text-sm text-muted-foreground">No profile photo added</p>}
      <dl className="grid gap-4 sm:grid-cols-2">{Object.entries(labels).map(([key, label]) => <div key={key}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{profile[key] ? key === "created_at" ? new Date(profile[key]).toLocaleString() : profile[key] : "Not provided"}</dd></div>)}</dl>
      <p className="mt-6 border-t pt-4 text-sm text-muted-foreground">{isAgentProfileComplete(profile) ? "Profile details complete" : "Profile details incomplete"}</p>
    </section>
  </div>;
}

export function Activity({ compact = false }: { compact?: boolean }) {
  const [rows, setRows] = useState<any[]>([]);
  const [people, setPeople] = useState<Record<string, any>>({});
  const [selected, setSelected] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [params] = useSearchParams();
  const load = async () => {
    setLoading(true); setError(false);
    const [p, u] = await Promise.all([
      supabase.from("properties").select("id,title,agent_id,created_at,status,rent,area,city,images").order("created_at", { ascending: false }).limit(compact ? 5 : 100),
      supabase.from("profiles").select("*")
    ]);
    setLoading(false);
    if (p.error || u.error) { setError(true); toast.error("Could not load activity. Please try again."); return; }
    setRows(p.data ?? []);
    setPeople(Object.fromEntries((u.data ?? []).map(person => [person.id, person])));
  };
  useEffect(() => { load(); }, [compact]);
  useEffect(() => { const id = params.get("user"); if (id && people[id]) setSelected(people[id]); }, [params, people]);
  return <>
    {compact ? <div className="mb-4 mt-10 flex items-center justify-between"><h2 className="text-2xl font-bold">Recent property activity</h2><Link to="/app/activity" className="flex items-center gap-2 text-sm font-semibold text-primary">View all<ArrowRight size={16} /></Link></div> : <PageTitle title="Property activity" sub="New listings and the people who published them." action={<Button className="btn-ghost" onClick={load}><RefreshCw size={16} />Refresh</Button>} />}
    {loading ? <p role="status" className="py-6 text-muted-foreground">Loading activity…</p> : error ? <Button className="btn-ghost" onClick={load}>Retry activity</Button> : rows.length ? <div className="divide-y border-y">{rows.map(p => <div key={p.id} className="flex flex-wrap items-center gap-4 py-5">
      {p.images?.[0] && <img src={p.images[0]} alt={p.title} className="h-16 w-20 rounded-lg object-cover" />}
      <div className="min-w-0 flex-1"><p className="break-words font-semibold">{p.title}</p><p className="text-sm text-muted-foreground">{p.area}, {p.city} · {naira(p.rent)}/year</p><p className="mt-1 text-xs text-muted-foreground">{people[p.agent_id]?.full_name || "Agent"} · {new Date(p.created_at).toLocaleString()}</p></div>
      <Status s={p.status} /><Button className="btn-ghost" disabled={!people[p.agent_id]} onClick={() => setSelected(people[p.agent_id])}>Agent details<ArrowRight size={16} /></Button><Link className="text-sm font-semibold text-primary" to={`/app/edit/${p.id}`}>View property</Link>
    </div>)}</div> : <Empty text="No property activity yet." />}
    {selected && <UserDetails profile={selected} close={() => setSelected(null)} />}
  </>;
}