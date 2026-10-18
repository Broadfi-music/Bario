import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, naira } from "@/lib/auth";
import { PageTitle } from "./AppShell";
import { isAgentProfileComplete } from "@/lib/rentalRules";
import { Button } from "./Button";

const empty = { title: "", description: "", property_type: "Self-contain", address: "", city: "Lagos", area: "", near_institution: "", bedrooms: 1, bathrooms: 1, rent: 0, agency_fee: 0, agreement_fee: 0, caution_fee: 0, amenities: "", images: [] as string[], videos: [] as string[], other_fees: [] as { label: string; amount: number }[] };

export default function PropertyForm() {
  const { user, role } = useAuth();
  const { id } = useParams();
  const nav = useNavigate();
  const [f, setF] = useState<any>(empty);
  const [c, setC] = useState({ landlord_name: "", landlord_phone: "", landlord_email: "" });
  const [status, setStatus] = useState("active");
  const [busy, setBusy] = useState(false);
  const isAdmin = role === "admin";
  const [profileReady, setProfileReady] = useState<boolean | null>(null);
  useEffect(() => {
    if (!user) return;
    if (role === "admin") { setProfileReady(true); return; }
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data, error }) => {
      if (error) toast.error("Could not check your profile. Please try again.");
      setProfileReady(!error && isAgentProfileComplete(data));
    });
  }, [user, role]);

  useEffect(() => {
    if (!id) return;
    supabase.from("properties").select("*").eq("id", id).single().then(({ data }) => { if (data) { setF({ ...data, other_fees: Array.isArray(data.other_fees) ? data.other_fees : [], amenities: (data.amenities ?? []).join(", ") }); setStatus(data.status); } });
    supabase.from("property_contacts").select("*").eq("property_id", id).maybeSingle().then(({ data }) => data && setC({ landlord_name: data.landlord_name ?? "", landlord_phone: data.landlord_phone ?? "", landlord_email: data.landlord_email ?? "" }));
  }, [id]);

  const upload = async (files: FileList | null, kind: "images" | "videos") => {
    if (!files || !user) return;
    setBusy(true);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const path = `${user.id}/listings/${crypto.randomUUID()}-${file.name.replace(/[^a-z0-9.]/gi, "_")}`;
      const { error } = await supabase.storage.from("user-uploads").upload(path, file);
      if (error) { toast.error(error.message); continue; }
      urls.push(supabase.storage.from("user-uploads").getPublicUrl(path).data.publicUrl);
    }
    setF((x: any) => ({ ...x, [kind]: [...x[kind], ...urls] }));
    setBusy(false);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profileReady) return toast.error("Complete your profile before adding a property");
    if (!f.images.length) return toast.error("Add at least one photo");
    setBusy(true);
    const row = {
      title: f.title, description: f.description, property_type: f.property_type, address: f.address, city: f.city, area: f.area, near_institution: f.near_institution,
      bedrooms: +f.bedrooms, bathrooms: +f.bathrooms, rent: +f.rent, agency_fee: +f.agency_fee, agreement_fee: +f.agreement_fee, caution_fee: +f.caution_fee,
      amenities: String(f.amenities).split(",").map((s) => s.trim()).filter(Boolean), images: f.images, videos: f.videos,
      other_fees: f.other_fees.filter((x: any) => x.label?.trim()).map((x: any) => ({ label: String(x.label).trim().slice(0, 60), amount: Math.max(0, +x.amount || 0) })),
      status: isAdmin ? status : id ? f.status : "active",
    };
    const res = id
      ? await supabase.from("properties").update(row).eq("id", id).select().single()
      : await supabase.from("properties").insert({ ...row, agent_id: user.id }).select().single();
    if (res.error) { setBusy(false); return toast.error(res.error.message); }
    const { error: contactError } = await supabase.from("property_contacts").upsert({ property_id: res.data.id, ...c });
    if (contactError) { setBusy(false); toast.error("Listing saved, but landlord details could not be saved. Please retry."); nav(`/app/edit/${res.data.id}`); return; }
    setBusy(false);
    toast.success(id ? "Listing saved" : "Property published");
    nav(isAdmin ? "/app/listings" : "/app");
  };

  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const total = +f.rent + +f.agency_fee + +f.agreement_fee + +f.caution_fee + f.other_fees.reduce((a: number, x: any) => a + (+x.amount || 0), 0);
  const setFee = (i: number, k: string, v: any) => setF({ ...f, other_fees: f.other_fees.map((x: any, j: number) => (j === i ? { ...x, [k]: v } : x)) });

  if (profileReady === null) return <p role="status" className="text-muted-foreground">Checking your profile…</p>;
  if (!profileReady) return <><PageTitle title="Complete your agent profile" sub="Add your full name, photo, phone number, email and home address before listing a home." /><Link to="/app/profile" className="btn-primary">Complete profile</Link></>;

  return (
    <form onSubmit={save}>
      <PageTitle title={id ? "Edit listing" : "Create listing"} sub={isAdmin ? "Manual listings for landlords who don't use the app." : "Your new property is published automatically."} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card space-y-4">
            <h2 className="text-lg font-bold">Property details</h2>
            <div><label className="label">Title</label><input required className="input" value={f.title} onChange={set("title")} placeholder="Clean self-contain near UNILAG" /></div>
            <div><label className="label">Description</label><textarea rows={4} className="input" value={f.description} onChange={set("description")} /></div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div><label className="label">Type</label><select className="input" value={f.property_type} onChange={set("property_type")}>{["Self-contain", "Room & parlour", "Mini flat", "1-bed flat", "2-bed flat", "3-bed flat", "Shared hostel", "Duplex"].map((t) => <option key={t}>{t}</option>)}</select></div>
              <div><label className="label">Bedrooms</label><input type="number" min={0} className="input" value={f.bedrooms} onChange={set("bedrooms")} /></div>
              <div><label className="label">Bathrooms</label><input type="number" min={0} className="input" value={f.bathrooms} onChange={set("bathrooms")} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label">Address</label><input required className="input" value={f.address} onChange={set("address")} /></div>
              <div><label className="label">Area</label><input required className="input" value={f.area} onChange={set("area")} placeholder="Yaba, Akoka" /></div>
              <div><label className="label">City</label><input required className="input" value={f.city} onChange={set("city")} /></div>
              <div><label className="label">Nearby school (optional)</label><input className="input" value={f.near_institution} onChange={set("near_institution")} placeholder="UNILAG" /></div>
            </div>
            <div><label className="label">Amenities (comma separated)</label><input className="input" value={f.amenities} onChange={set("amenities")} placeholder="Prepaid meter, Borehole, Security, Tiled" /></div>
          </section>
          <section className="card space-y-4">
            <h2 className="text-lg font-bold">Photos & videos</h2>
            <div className="flex flex-wrap gap-3">
              {f.images.map((u: string) => (
                <div key={u} className="relative"><img src={u} className="h-24 w-32 rounded-xl object-cover" alt="" /><button type="button" onClick={() => setF({ ...f, images: f.images.filter((x: string) => x !== u) })} className="absolute -right-2 -top-2 rounded-full bg-card p-1 shadow"><X className="h-3 w-3" /></button></div>
              ))}
              {f.videos.map((u: string) => <video key={u} src={u} className="h-24 w-32 rounded-xl bg-muted object-cover" />)}
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="btn-ghost cursor-pointer"><Upload className="h-4 w-4" />Add photos<input hidden type="file" accept="image/*" multiple onChange={(e) => upload(e.target.files, "images")} /></label>
              <label className="btn-ghost cursor-pointer"><Upload className="h-4 w-4" />Add videos<input hidden type="file" accept="video/*" multiple onChange={(e) => upload(e.target.files, "videos")} /></label>
              {busy && <span className="self-center text-sm text-muted-foreground">Uploading…</span>}
            </div>
          </section>
          <section className="card space-y-4">
            <h2 className="text-lg font-bold">Landlord contact <span className="text-sm font-normal text-muted-foreground">(private — never shown to tenants)</span></h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div><label className="label">Name</label><input required className="input" value={c.landlord_name} onChange={(e) => setC({ ...c, landlord_name: e.target.value })} /></div>
              <div><label className="label">Phone</label><input required className="input" value={c.landlord_phone} onChange={(e) => setC({ ...c, landlord_phone: e.target.value })} /></div>
              <div><label className="label">Email</label><input type="email" className="input" value={c.landlord_email} onChange={(e) => setC({ ...c, landlord_email: e.target.value })} /></div>
            </div>
          </section>
        </div>
        <aside className="space-y-6">
          <section className="card space-y-4 lg:sticky lg:top-24">
            <h2 className="text-lg font-bold">Fee breakdown (₦)</h2>
            {[["rent", "Annual rent"], ["agency_fee", "Agent commission (agency fee)"], ["agreement_fee", "Agreement / legal fee"], ["caution_fee", "Caution / damage deposit"]].map(([k, l]) => (
              <div key={k}><label className="label">{l}</label><input required type="number" min={0} className="input" value={f[k]} onChange={set(k)} /></div>
            ))}
            <div className="space-y-2">
              <label className="label">Other fees (service charge, etc.)</label>
              {f.other_fees.map((x: any, i: number) => (
                <div key={i} className="flex gap-2">
                  <input className="input" placeholder="e.g. Service charge" value={x.label} onChange={(e) => setFee(i, "label", e.target.value)} />
                  <input type="number" min={0} className="input w-28" value={x.amount} onChange={(e) => setFee(i, "amount", e.target.value)} />
                  <button type="button" aria-label="Remove fee" onClick={() => setF({ ...f, other_fees: f.other_fees.filter((_: any, j: number) => j !== i) })}><X className="h-4 w-4" /></button>
                </div>
              ))}
              <button type="button" className="text-sm font-semibold text-primary" onClick={() => setF({ ...f, other_fees: [...f.other_fees, { label: "", amount: 0 }] })}>+ Add another fee</button>
            </div>
            <div className="flex justify-between border-t pt-4 font-bold"><span>Tenant pays</span><span>{naira(total)}</span></div>
            {isAdmin && <div><label className="label">Status</label><select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>{["pending", "active", "rented", "rejected"].map((s) => <option key={s}>{s}</option>)}</select></div>}
            <Button type="submit" disabled={busy} className="btn-primary w-full">{id ? "Save changes" : "Save & publish"}</Button>
          </section>
        </aside>
      </div>
    </form>
  );
}
