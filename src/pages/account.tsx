import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { Camera, Landmark, ArrowDownToLine, Heart, CalendarCheck, Trash2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, naira, totalOf } from "@/lib/auth";
import { PageTitle, Status, Empty } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { inspectionFee } from "@/lib/rentalRules";

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(100),
  phone: z.string().trim().regex(/^\+?[0-9 ]{10,15}$/, "Enter a valid phone number"),
  alt_phone: z.string().trim().regex(/^(\+?[0-9 ]{10,15})?$/, "Enter a valid other number").optional(),
  home_address: z.string().trim().min(5, "Enter your home address").max(300),
});

export function AccountProfile() {
  const { user, role } = useAuth();
  const [f, setF] = useState<any>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!user) return; supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data, error }) => { if (error) toast.error("Could not load profile"); else setF(data ?? {}); }); }, [user]);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  const uploadPhoto = async (file?: File) => {
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Photo must be under 5MB");
    setBusy(true);
    const path = `${user.id}/avatar-${Date.now()}.${file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "jpg"}`;
    const { error } = await supabase.storage.from("user-uploads").upload(path, file, { upsert: true });
    setBusy(false);
    if (error) return toast.error(error.message);
    setF((x: any) => ({ ...x, avatar_url: supabase.storage.from("user-uploads").getPublicUrl(path).data.publicUrl }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (role === "agent" && !f.avatar_url) return toast.error("Add a profile photo to complete your agent profile");
    const r = profileSchema.safeParse({ full_name: f.full_name ?? "", phone: f.phone ?? "", alt_phone: f.alt_phone ?? "", home_address: f.home_address ?? "" });
    if (!r.success) return toast.error(r.error.issues[0].message);
    const row: any = { id: user.id, email: user.email, ...r.data, avatar_url: f.avatar_url ?? null };
    if (role === "tenant") Object.assign(row, { occupation: f.occupation, institution: f.institution, next_of_kin: f.next_of_kin, id_number: f.id_number, bio: f.bio });
    const { error } = await supabase.from("profiles").upsert(row);
    error ? toast.error(error.message) : toast.success("Profile saved");
  };

  return (
    <form onSubmit={save}>
      <PageTitle title="My profile" sub={role === "tenant" ? "Your details help landlords get to know you before move-in." : "Complete your name, photo, phone, email and home address before listing."} />
      <div className="card mb-5 flex items-center gap-4">
        <label className="relative cursor-pointer">
          {f.avatar_url ? <img src={f.avatar_url} alt="Profile" className="h-20 w-20 rounded-full object-cover" /> : <div className="grid h-20 w-20 place-items-center rounded-full bg-muted font-display text-2xl font-bold">{(f.full_name || user?.email || "?")[0].toUpperCase()}</div>}
          <span className="absolute bottom-0 right-0 rounded-full bg-primary p-1.5 text-primary-foreground"><Camera className="h-3.5 w-3.5" /></span>
          <input hidden type="file" accept="image/*" onChange={(e) => uploadPhoto(e.target.files?.[0])} />
        </label>
        <div className="min-w-0"><p className="truncate font-bold">{f.full_name || "Add your name"}</p><p className="truncate text-sm text-muted-foreground">{user?.email}</p>{busy && <p className="text-xs text-muted-foreground">Uploading photo…</p>}</div>
      </div>
      <div className="card grid gap-4 sm:grid-cols-2">
        <div><label className="label">Full name</label><input className="input" value={f.full_name ?? ""} onChange={set("full_name")} /></div>
        <div><label className="label">Email</label><input className="input" value={user?.email ?? ""} disabled /></div>
        <div><label className="label">Phone number</label><input className="input" inputMode="tel" value={f.phone ?? ""} onChange={set("phone")} placeholder="0803 000 0000" /></div>
        <div><label className="label">Other number (optional)</label><input className="input" inputMode="tel" value={f.alt_phone ?? ""} onChange={set("alt_phone")} /></div>
        <div className="sm:col-span-2"><label className="label">Home address</label><input className="input" value={f.home_address ?? ""} onChange={set("home_address")} /></div>
        {role === "tenant" && <>
          {[["occupation", "Occupation / status"], ["institution", "School or employer"], ["next_of_kin", "Next of kin (name & phone)"], ["id_number", "NIN or student ID"]].map(([k, l]) => <div key={k}><label className="label">{l}</label><input className="input" value={f[k] ?? ""} onChange={set(k)} /></div>)}
          <div className="sm:col-span-2"><label className="label">About you</label><textarea rows={3} className="input" value={f.bio ?? ""} onChange={set("bio")} /></div>
        </>}
        <Button type="submit" disabled={busy} className="btn-primary w-full sm:w-fit">Save profile</Button>
      </div>
    </form>
  );
}

const BANKS = ["Access Bank", "First Bank", "GTBank", "UBA", "Zenith Bank", "Fidelity Bank", "FCMB", "Union Bank", "Sterling Bank", "Wema Bank", "Stanbic IBTC", "Ecobank", "Polaris Bank", "Keystone Bank", "Opay", "Moniepoint", "Kuda", "PalmPay"];

export function Wallet() {
  const { user } = useAuth();
  const [pays, setPays] = useState<any[]>([]);
  const [wds, setWds] = useState<any[]>([]);
  const [bal, setBal] = useState(0);
  const [bank, setBank] = useState({ bank_name: "", account_number: "", account_name: "" });
  const [hasBank, setHasBank] = useState(false);
  const [amt, setAmt] = useState("");
  const load = async () => {
    const [p, w, b, k] = await Promise.all([
      supabase.from("payments").select("*, properties(title)").eq("agent_id", user!.id).neq("status", "initiated").order("created_at", { ascending: false }),
      supabase.from("withdrawals").select("*").eq("agent_id", user!.id).order("created_at", { ascending: false }),
      supabase.rpc("agent_available_balance", { _agent: user!.id }),
      supabase.from("bank_accounts").select("*").eq("user_id", user!.id).maybeSingle(),
    ]);
    setPays(p.data ?? []); setWds(w.data ?? []); setBal(Number(b.data ?? 0));
    if (k.data) { setBank({ bank_name: k.data.bank_name, account_number: k.data.account_number, account_name: k.data.account_name }); setHasBank(true); }
  };
  useEffect(() => { load(); }, []);
  const sum = (f: (r: any) => boolean) => pays.filter(f).reduce((a, r) => a + Number(r.agent_commission), 0);
  const totalRent = pays.reduce((a, r) => a + Number(r.rent), 0);
  const earned = sum(() => true);

  const saveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bank.bank_name) return toast.error("Choose your bank");
    if (!/^\d{10}$/.test(bank.account_number)) return toast.error("Account number must be 10 digits");
    if (bank.account_name.trim().length < 3) return toast.error("Enter the account name");
    const { error } = await supabase.from("bank_accounts").upsert({ user_id: user!.id, ...bank, account_name: bank.account_name.trim(), updated_at: new Date().toISOString() });
    error ? toast.error(error.message) : (toast.success("Bank details saved"), setHasBank(true));
  };
  const withdraw = async () => {
    const n = Number(amt);
    if (!n) return toast.error("Enter an amount");
    const { error } = await supabase.rpc("request_withdrawal", { _amount: n });
    if (error) return toast.error(error.message);
    toast.success("Withdrawal requested. We'll pay it to your bank within 24 hours.");
    setAmt(""); load();
  };

  return (
    <>
      <PageTitle title="Earnings & withdrawals" sub="Your commission becomes available once the tenant gets the keys." />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card col-span-2 bg-primary text-primary-foreground lg:col-span-1"><p className="text-sm opacity-80">Available to withdraw</p><p className="font-display text-3xl font-bold text-accent">{naira(bal)}</p></div>
        <div className="card"><p className="text-xs text-muted-foreground">Total earned</p><p className="font-display text-xl font-bold">{naira(earned)}</p></div>
        <div className="card"><p className="text-xs text-muted-foreground">In escrow</p><p className="font-display text-xl font-bold">{naira(sum((r) => ["in_escrow", "keys_handed"].includes(r.status)))}</p></div>
        <div className="card col-span-2 lg:col-span-1"><p className="text-xs text-muted-foreground">Your share of rent</p><p className="font-display text-xl font-bold">{totalRent ? `${((earned / totalRent) * 100).toFixed(1)}%` : "—"}</p></div>
      </div>
      <div className="mb-8 grid gap-5 lg:grid-cols-2">
        <form onSubmit={saveBank} className="card space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Landmark className="h-5 w-5" />Bank details</h2>
          <select className="input" value={bank.bank_name} onChange={(e) => setBank({ ...bank, bank_name: e.target.value })}><option value="">Choose bank</option>{BANKS.map((b) => <option key={b}>{b}</option>)}</select>
          <input className="input" inputMode="numeric" maxLength={10} placeholder="10-digit account number" value={bank.account_number} onChange={(e) => setBank({ ...bank, account_number: e.target.value.replace(/\D/g, "") })} />
          <input className="input" placeholder="Account name" value={bank.account_name} onChange={(e) => setBank({ ...bank, account_name: e.target.value })} />
          <button className="btn-ghost w-full">{hasBank ? "Update bank details" : "Save bank details"}</button>
        </form>
        <div className="card space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-bold"><ArrowDownToLine className="h-5 w-5" />Withdraw</h2>
          <input className="input" type="number" min={1000} placeholder="Amount (min ₦1,000)" value={amt} onChange={(e) => setAmt(e.target.value)} />
          <button onClick={withdraw} disabled={!hasBank || bal < 1000} className="btn-primary w-full">Withdraw to {hasBank ? bank.bank_name : "bank"}</button>
          {!hasBank && <p className="text-xs text-muted-foreground">Add your bank details first.</p>}
        </div>
      </div>
      <h2 className="mb-3 text-lg font-bold">Withdrawal history</h2>
      {wds.length ? <div className="mb-8 space-y-2">{wds.map((w) => <div key={w.id} className="card flex items-center justify-between gap-3 py-4"><div><p className="font-bold">{naira(w.amount)}</p><p className="text-xs text-muted-foreground">{w.bank_name} ••{w.account_number?.slice(-4)} · {new Date(w.created_at).toLocaleDateString()}</p></div><Status s={w.status} /></div>)}</div> : <div className="mb-8"><Empty text="No withdrawals yet." /></div>}
      <h2 className="mb-3 text-lg font-bold">Commission from tenants</h2>
      {pays.length ? <div className="space-y-2">{pays.map((r) => <div key={r.id} className="card flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-bold">{r.properties?.title}</p><p className="text-xs text-muted-foreground">Rent {naira(r.rent)} · You earn {naira(r.agent_commission)} ({Number(r.rent) ? ((Number(r.agent_commission) / Number(r.rent)) * 100).toFixed(0) : 0}%)</p></div><Status s={r.status} /></div>)}</div> : <Empty text="Commission appears here when a tenant pays for one of your listings." />}
    </>
  );
}

export function Wishlist() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [pick, setPick] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const load = async () => {
    const { data: w } = await supabase.from("wishlist").select("property_id").eq("tenant_id", user!.id);
    const ids = (w ?? []).map((x) => x.property_id);
    if (!ids.length) { setRows([]); setPick([]); return; }
    const { data } = await supabase.from("property_catalog").select("*").in("id", ids);
    setRows(data ?? []); setPick((data ?? []).filter((p) => p.status === "active").map((p) => p.id!));
  };
  useEffect(() => { load(); }, []);
  const remove = async (id: string) => { await supabase.from("wishlist").delete().eq("tenant_id", user!.id).eq("property_id", id); load(); };
  const fee = inspectionFee(pick.length);
  const book = async () => {
    if (!pick.length) return toast.error("Select at least one home");
    if (!date) return toast.error("Pick a date and time");
    setBusy(true);
    const { error } = await supabase.rpc("book_inspections", { _property_ids: pick, _scheduled_at: new Date(date).toISOString(), _note: note.trim() || undefined });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Inspection booked for ${pick.length} home${pick.length > 1 ? "s" : ""}. Agents have been notified.`);
    setDate(""); setNote(""); load();
  };
  return (
    <>
      <PageTitle title="Saved homes" sub="Pick the homes you want to see and book one inspection trip." />
      {rows.length ? <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-3 lg:col-span-2">{rows.map((p) => (
          <div key={p.id} className="card flex items-center gap-3 p-3">
            <input type="checkbox" aria-label={`Select ${p.title}`} className="h-5 w-5 accent-[hsl(var(--primary))]" disabled={p.status !== "active"} checked={pick.includes(p.id)} onChange={(e) => setPick(e.target.checked ? [...pick, p.id] : pick.filter((x) => x !== p.id))} />
            <Link to={`/app/property/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              {p.images?.[0] && <img src={p.images[0]} alt="" className="h-16 w-20 shrink-0 rounded-xl object-cover" />}
              <div className="min-w-0"><p className="truncate font-bold">{p.title}</p><p className="truncate text-xs text-muted-foreground">{p.area}, {p.city}</p><p className="text-sm font-semibold">{naira(totalOf(p))}</p></div>
            </Link>
            <button aria-label="Remove" onClick={() => remove(p.id)} className="p-2 text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
          </div>))}
        </div>
        <aside className="card h-fit min-w-0 space-y-4 lg:sticky lg:top-24">
          <h2 className="flex items-center gap-2 text-lg font-bold"><CalendarCheck className="h-5 w-5" />Book inspection</h2>
          <input type="datetime-local" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          <textarea rows={2} maxLength={500} className="input" placeholder="Note for the agent (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Homes selected</span><span className="font-semibold">{pick.length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Inspection fee</span><span className="font-semibold">{fee ? naira(fee) : "Free"}</span></div>
          </div>
          <p className="flex gap-2 rounded-xl bg-muted p-3 text-xs"><Info className="h-4 w-4 shrink-0" />One home is free. Inspecting 2 or more homes costs ₦3,500, paid on the inspection day.</p>
          <Button disabled={busy} onClick={book} className="btn-accent w-full">{busy ? "Booking…" : `Book ${pick.length || ""} inspection${pick.length > 1 ? "s" : ""}`}</Button>
        </aside>
      </div> : <Empty text="No saved homes yet. Tap the heart on any home to save it here." />}
    </>
  );
}

export function SaveButton({ propertyId }: { propertyId: string }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  useEffect(() => { supabase.from("wishlist").select("property_id").eq("tenant_id", user!.id).eq("property_id", propertyId).maybeSingle().then(({ data }) => setSaved(!!data)); }, [propertyId]);
  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (saved) { await supabase.from("wishlist").delete().eq("tenant_id", user!.id).eq("property_id", propertyId); setSaved(false); toast("Removed from saved homes"); }
    else { const { error } = await supabase.from("wishlist").insert({ tenant_id: user!.id, property_id: propertyId }); if (error) return toast.error(error.message); setSaved(true); toast.success("Saved — book inspections from Saved homes"); }
  };
  return <button onClick={toggle} aria-label={saved ? "Remove from saved" : "Save home"} className="rounded-full bg-card/95 p-2.5 shadow"><Heart className={`h-4 w-4 ${saved ? "fill-destructive text-destructive" : ""}`} /></button>;
}

export function AdminWithdrawals() {
  const [rows, setRows] = useState<any[]>([]);
  const load = () => supabase.from("withdrawals").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); }, []);
  const set = async (id: string, status: string) => {
    const { error } = await supabase.from("withdrawals").update({ status, processed_at: new Date().toISOString() }).eq("id", id);
    error ? toast.error(error.message) : (toast.success(`Marked ${status}`), load());
  };
  return (
    <>
      <PageTitle title="Agent withdrawals" sub="Pay agents to their bank, then mark the request as paid." />
      {rows.length ? <div className="space-y-2">{rows.map((w) => (
        <div key={w.id} className="card flex flex-wrap items-center justify-between gap-3 py-4">
          <div><p className="font-bold">{naira(w.amount)}</p><p className="text-sm text-muted-foreground">{w.account_name} · {w.bank_name} {w.account_number}</p><p className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleString()}</p></div>
          <div className="flex items-center gap-2"><Status s={w.status} />{w.status === "pending" && <><button onClick={() => set(w.id, "paid")} className="btn-primary px-4 py-2">Mark paid</button><button onClick={() => set(w.id, "rejected")} className="text-sm text-destructive">Reject</button></>}</div>
        </div>))}</div> : <Empty text="No withdrawal requests yet." />}
    </>
  );
}
