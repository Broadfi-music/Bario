import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { BadgeCheck, CalendarCheck, Lock, MapPin, PhoneOff, Zap, ShieldCheck, KeyRound, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, naira, totalOf } from "@/lib/auth";
import PropertyCard from "@/components/PropertyCard";
import { PageTitle, Status, Empty } from "@/components/AppShell";

export function Catalog() {
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [max, setMax] = useState("");
  useEffect(() => { supabase.from("property_catalog").select("*").eq("status", "active").order("created_at", { ascending: false }).then(({ data }) => setItems(data ?? [])); }, []);
  const shown = useMemo(() => items.filter((p) => (!q || `${p.title} ${p.area} ${p.city} ${p.near_institution}`.toLowerCase().includes(q.toLowerCase())) && (!max || Number(p.rent) <= Number(max))), [items, q, max]);
  return (
    <>
      <PageTitle title="Verified homes" sub="Every listing is inspected by Bario. Prices include every fee." />
      <div className="mb-6 flex flex-wrap gap-3">
        <input className="input max-w-sm" placeholder="Search area, city or school…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input max-w-[200px]" value={max} onChange={(e) => setMax(e.target.value)}>
          <option value="">Any rent</option>{[300000, 500000, 800000, 1500000, 3000000].map((v) => <option key={v} value={v}>Up to {naira(v)}</option>)}
        </select>
      </div>
      {shown.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{shown.map((p) => <PropertyCard key={p.id} p={p} to={`/app/property/${p.id}`} />)}</div> : <Empty text="No verified homes match yet. Check back soon — new listings are verified daily." />}
    </>
  );
}

export function PropertyDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [p, setP] = useState<any>(null);
  const [img, setImg] = useState(0);
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { supabase.from("property_catalog").select("*").eq("id", id!).single().then(({ data }) => setP(data)); }, [id]);
  if (!p) return <p className="text-muted-foreground">Loading…</p>;
  const service = Math.round(Number(p.rent) * 0.02);

  const book = async () => {
    if (!date) return toast.error("Pick an inspection date");
    const { error } = await supabase.from("bookings").insert({ property_id: p.id, tenant_id: user!.id, kind: "inspection", scheduled_at: new Date(date).toISOString() });
    error ? toast.error(error.message) : toast.success("Inspection requested. The agent has been notified.");
  };
  const pay = async () => {
    setBusy(true);
    await supabase.from("bookings").insert({ property_id: p.id, tenant_id: user!.id, kind: "checkout" });
    const { data, error } = await supabase.functions.invoke("escrow-pay", { body: { action: "init", property_id: p.id, origin: window.location.origin } });
    setBusy(false);
    if (error || data?.error) return toast.error(data?.error ?? "Could not start payment");
    window.location.href = data.url;
  };

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <div className="overflow-hidden rounded-3xl bg-muted">{p.images?.[img] && <img src={p.images[img]} alt={p.title} className="aspect-[4/3] w-full object-cover" />}</div>
        <div className="mt-3 flex gap-2 overflow-x-auto">{p.images?.map((u: string, i: number) => <button key={u} onClick={() => setImg(i)}><img src={u} alt="" className={`h-16 w-24 rounded-xl object-cover ${i === img ? "ring-2 ring-primary" : "opacity-70"}`} /></button>)}</div>
        {p.videos?.length > 0 && <div className="mt-4 grid gap-3 sm:grid-cols-2">{p.videos.map((v: string) => <video key={v} src={v} controls className="w-full rounded-2xl" />)}</div>}
        <span className="chip mt-6 bg-success/15 text-success"><BadgeCheck className="h-3.5 w-3.5" />Verified by Bario</span>
        <h1 className="mt-3 text-3xl font-extrabold">{p.title}</h1>
        <p className="mt-1 flex items-center gap-1 text-muted-foreground"><MapPin className="h-4 w-4" />{p.address}, {p.area}, {p.city}{p.near_institution && ` · near ${p.near_institution}`}</p>
        <p className="mt-6 whitespace-pre-line leading-relaxed">{p.description}</p>
        {p.amenities?.length > 0 && <div className="mt-6 flex flex-wrap gap-2">{p.amenities.map((a: string) => <span key={a} className="chip bg-secondary text-secondary-foreground">{a}</span>)}</div>}
        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-muted p-4 text-sm"><PhoneOff className="mt-0.5 h-4 w-4 shrink-0" />Landlord and agent phone numbers are protected. All communication and payment happens safely through Bario.</div>
      </div>
      <aside className="lg:col-span-2">
        <div className="card space-y-5 lg:sticky lg:top-24">
          <h2 className="text-lg font-bold">Transparent cost breakdown</h2>
          <div className="space-y-2 text-sm">
            {[["Annual rent", p.rent], ["Agency fee", p.agency_fee], ["Agreement fee", p.agreement_fee], ["Caution deposit (refundable)", p.caution_fee], ["Bario service fee (2%)", service]].map(([k, v]) => <div key={k} className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-semibold">{naira(v)}</span></div>)}
          </div>
          <div className="flex justify-between border-t pt-4 font-display text-2xl font-bold"><span>Total</span><span>{naira(totalOf(p) + service)}</span></div>
          <button disabled={busy} onClick={pay} className="btn-accent w-full py-4"><Zap className="h-4 w-4" />{busy ? "Opening secure checkout…" : "Fast-track: pay into escrow"}</button>
          <p className="flex items-center gap-2 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" />Held safely until you confirm key handover.</p>
          <div className="border-t pt-5">
            <label className="label">Or book an inspection</label>
            <input type="datetime-local" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
            <button onClick={book} className="btn-ghost mt-3 w-full"><CalendarCheck className="h-4 w-4" />Request inspection</button>
          </div>
        </div>
      </aside>
    </div>
  );
}

export function Bookings() {
  const [rows, setRows] = useState<any[]>([]);
  const load = () => supabase.from("bookings").select("*, properties(title, area, city)").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); }, []);
  const cancel = async (id: string) => { await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id); load(); };
  return (
    <>
      <PageTitle title="Inspections & bookings" sub="Track every inspection request and fast-track checkout." />
      {rows.length ? <div className="space-y-3">{rows.map((b) => (
        <div key={b.id} className="card flex flex-wrap items-center justify-between gap-3">
          <div><p className="font-bold">{b.properties?.title}</p><p className="text-sm text-muted-foreground">{b.kind === "inspection" ? `Inspection · ${b.scheduled_at ? new Date(b.scheduled_at).toLocaleString() : ""}` : "Fast-track checkout"}</p></div>
          <div className="flex items-center gap-3"><Status s={b.status} />{b.status === "requested" && <button onClick={() => cancel(b.id)} className="text-sm text-destructive">Cancel</button>}</div>
        </div>))}</div> : <Empty text="No bookings yet." />}
    </>
  );
}

const steps = ["initiated", "in_escrow", "keys_handed", "released"];
export function Payments() {
  const [rows, setRows] = useState<any[]>([]);
  const [params, setParams] = useSearchParams();
  const load = () => supabase.from("payments").select("*, properties(title, area, city)").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  useEffect(() => {
    const ref = params.get("reference");
    if (ref) {
      supabase.functions.invoke("escrow-pay", { body: { action: "verify", reference: ref } }).then(({ data }) => {
        if (data?.status === "in_escrow") toast.success("Payment secured in escrow. Your agreement is ready to sign.");
        else toast.message(data?.message ?? "Payment not confirmed yet");
        setParams({}); load();
      });
    } else load();
  }, []);
  const dispute = async (id: string) => {
    const reason = prompt("Describe the problem");
    if (!reason) return;
    const { error } = await supabase.from("payments").update({ status: "disputed", dispute_reason: reason }).eq("id", id);
    error ? toast.error("Contact support to raise a dispute") : load();
  };
  return (
    <>
      <PageTitle title="Payments & escrow" sub="Your money stays protected until keys are in your hand." />
      {rows.length ? <div className="space-y-4">{rows.map((p) => {
        const at = steps.indexOf(p.status);
        return (
          <div key={p.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="font-bold">{p.properties?.title}</p><p className="text-sm text-muted-foreground">Ref {p.reference}</p></div>
              <div className="text-right"><p className="font-display text-2xl font-bold">{naira(p.total)}</p><Status s={p.status} /></div>
            </div>
            <div className="mt-6 grid grid-cols-4 gap-2">
              {[[Lock, "Paid"], [ShieldCheck, "In escrow"], [KeyRound, "Keys handed"], [BadgeCheck, "Released"]].map(([I, l]: any, i) => (
                <div key={l} className="text-center"><div className={`mx-auto h-1.5 rounded-full ${at >= i && at >= 1 ? "bg-success" : "bg-muted"}`} /><I className={`mx-auto mt-3 h-4 w-4 ${at >= i && at >= 1 ? "text-success" : "text-muted-foreground"}`} /><p className="mt-1 text-xs">{l}</p></div>
              ))}
            </div>
            {p.status === "in_escrow" && <button onClick={() => dispute(p.id)} className="mt-5 flex items-center gap-2 text-sm text-destructive"><AlertTriangle className="h-4 w-4" />Report a problem</button>}
          </div>);
      })}</div> : <Empty text="No payments yet. Choose a verified home and pay securely into escrow." />}
    </>
  );
}

export function Agreements() {
  const { user, role } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [sig, setSig] = useState<Record<string, string>>({});
  const load = () => supabase.from("agreements").select("*, properties(title), payments(total, reference, status)").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); }, []);
  const sign = async (id: string) => {
    if (!sig[id]?.trim()) return toast.error("Type your full name to sign");
    const { error } = await supabase.from("agreements").update({ tenant_signature: sig[id], signed_at: new Date().toISOString() }).eq("id", id);
    error ? toast.error(error.message) : (toast.success("Agreement signed"), load());
  };
  return (
    <>
      <PageTitle title={role === "agent" ? "Document vault" : "Tenancy agreements"} sub="Legal contracts, house rules and receipts." />
      {rows.length ? <div className="space-y-5">{rows.map((a) => (
        <div key={a.id} className="card">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold">{a.properties?.title}</h2>{a.signed_at ? <span className="chip bg-success/15 text-success">Signed {new Date(a.signed_at).toLocaleDateString()}</span> : <span className="chip bg-warning/15 text-warning">Awaiting signature</span>}</div>
          <pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap rounded-2xl bg-muted p-5 font-sans text-sm leading-relaxed">{a.body}</pre>
          <div className="mt-4 rounded-2xl border p-4 text-sm"><p className="font-semibold">Receipt</p><p className="text-muted-foreground">Ref {a.payments?.reference} · Total paid {naira(a.payments?.total)}</p></div>
          {a.signed_at ? <p className="mt-4 font-display text-2xl italic">{a.tenant_signature}</p> : a.tenant_id === user?.id && (
            <div className="mt-4 flex flex-wrap gap-3"><input className="input max-w-xs" placeholder="Type full name to sign" value={sig[a.id] ?? ""} onChange={(e) => setSig({ ...sig, [a.id]: e.target.value })} /><button onClick={() => sign(a.id)} className="btn-primary">Sign agreement</button></div>
          )}
          <button onClick={() => { const w = window.open(""); w?.document.write(`<pre style="font-family:sans-serif;white-space:pre-wrap;padding:40px">${a.body}\n\nSigned: ${a.tenant_signature ?? "—"}</pre>`); w?.print(); }} className="mt-3 text-sm font-semibold underline">Download / print</button>
        </div>))}</div> : <Empty text="Agreements appear here after a successful payment." />}
    </>
  );
}

export function Profile() {
  const { user } = useAuth();
  const [f, setF] = useState<any>({});
  useEffect(() => { supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle().then(({ data }) => setF(data ?? { id: user!.id, email: user!.email })); }, [user]);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("profiles").upsert({ id: user!.id, email: user!.email, full_name: f.full_name, phone: f.phone, occupation: f.occupation, institution: f.institution, next_of_kin: f.next_of_kin, id_number: f.id_number, bio: f.bio });
    error ? toast.error(error.message) : toast.success("Profile saved — landlords can now vet you faster");
  };
  const fields = [["full_name", "Full name"], ["phone", "Phone"], ["occupation", "Occupation / status"], ["institution", "School or employer"], ["next_of_kin", "Next of kin (name & phone)"], ["id_number", "NIN or student ID"]];
  return (
    <form onSubmit={save}>
      <PageTitle title="Tenant profile" sub="Landlords use this to vet you before move-in. Shared only with your landlord after payment." />
      <div className="card grid gap-4 sm:grid-cols-2">
        {fields.map(([k, l]) => <div key={k}><label className="label">{l}</label><input required className="input" value={f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>)}
        <div className="sm:col-span-2"><label className="label">About you</label><textarea rows={3} className="input" value={f.bio ?? ""} onChange={(e) => setF({ ...f, bio: e.target.value })} /></div>
        <button className="btn-primary w-fit">Save profile</button>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">Ready to move? <Link className="font-semibold underline" to="/app">Browse homes</Link></p>
    </form>
  );
}
