import { Link } from "react-router-dom";
import { ShieldCheck, Lock, FileSignature, BadgeCheck, Receipt, PhoneOff, ArrowRight, Home, Building2, Wallet, Star, Check } from "lucide-react";
import lekki from "@/assets/lekki.jpg";
import viAerial from "@/assets/vi-aerial.jpg";
import unilag from "@/assets/unilag.jpg";
import estate from "@/assets/estate.jpg";
import flats from "@/assets/flats-vi.jpg";
import abuja from "@/assets/abuja.jpg";
import skyline from "@/assets/lagos-skyline.jpg";
import { Logo } from "@/components/Logo";

const fees = [
  ["Annual rent", "₦150,000"],
  ["Agent fee", "₦10,000"],
  ["Agreement fee", "₦5,000"],
  ["Caution deposit (refundable)", "₦2,000"],
];

export default function Landing() {
  return (
    <div className="overflow-x-hidden">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-primary-foreground/10 bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Logo light />
          <nav className="hidden gap-8 text-sm font-medium opacity-80 md:flex">
            <a href="#how">How it works</a><a href="#features">Features</a><a href="#agents">For agents</a><a href="#faq">FAQ</a>
          </nav>
          <div className="flex gap-2">
            <Link to="/auth" className="btn hidden px-4 py-2 sm:inline-flex">Log in</Link>
            <Link to="/auth?mode=signup" className="btn-accent px-4 py-2">Get started</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-14 lg:grid-cols-2 lg:items-center lg:pt-20">
          <div>
            <span className="chip bg-primary-foreground/10"><ShieldCheck className="h-3.5 w-3.5 text-accent" /> Escrow-protected rentals in Nigeria</span>
            <h1 className="mt-6 text-5xl font-extrabold leading-[1.02] sm:text-6xl lg:text-7xl">
              Rent your next home <span className="text-accent">without the scam.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg opacity-80">
              Verified listings, transparent fees and your money held safely in escrow until you get the keys.
              Built for students and everyday renters across Lagos, Abuja and beyond.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth?mode=signup&role=tenant" className="btn-accent px-7 py-4 text-base"><Home className="h-4 w-4" /> Find a House</Link>
              <Link to="/auth?mode=signup&role=agent" className="btn border border-primary-foreground/25 px-7 py-4 text-base hover:bg-primary-foreground/10"><Building2 className="h-4 w-4" /> List a Property</Link>
            </div>
            <div className="mt-10 flex items-center gap-6 text-sm opacity-80">
              <div className="flex -space-x-2">{[lekki, estate, unilag].map((s) => <img key={s} src={s} alt="" className="h-9 w-9 rounded-full border-2 border-primary object-cover" />)}</div>
              <span>Every listing inspected before it goes live</span>
            </div>
          </div>
          <div className="relative">
            <img src={flats} alt="Apartment blocks in Victoria Island, Lagos" className="aspect-[4/5] w-full rounded-[2rem] object-cover lg:aspect-[5/6]" />
            <div className="absolute -bottom-6 left-4 w-72 rounded-3xl bg-card p-5 text-card-foreground shadow-[var(--shadow-soft)] sm:-left-8">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground"><span>Self-contain</span><span className="chip bg-secondary text-secondary-foreground"><BadgeCheck className="h-3 w-3" />Verified</span></div>
              <div className="mt-3 space-y-1.5 text-sm">{fees.map(([k, v]) => <div key={k} className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-semibold">{v}</span></div>)}</div>
              <div className="mt-3 flex justify-between border-t pt-3 font-bold"><span>Total</span><span>₦167,000</span></div>
            </div>
            <div className="absolute -top-4 right-4 rounded-2xl bg-accent px-4 py-3 text-accent-foreground shadow-[var(--shadow-soft)]">
              <div className="flex items-center gap-2 text-sm font-bold"><Lock className="h-4 w-4" /> Funds in escrow</div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem strip */}
      <section className="border-b bg-secondary">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-10 text-center sm:grid-cols-3">
          {[["Fake agents", "Gone — every lister is vetted"], ["Hidden fees", "Gone — every naira is itemised"], ["Lost deposits", "Gone — escrow until key handover"]].map(([a, b]) => (
            <div key={a}><p className="font-display text-2xl font-bold text-primary line-through decoration-accent decoration-4">{a}</p><p className="mt-1 text-sm text-muted-foreground">{b}</p></div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-7xl px-5 py-24">
        <p className="text-sm font-bold uppercase tracking-widest text-success">How it works</p>
        <h2 className="mt-3 max-w-2xl text-4xl font-extrabold sm:text-5xl">From search to keys in four safe steps.</h2>
        <div className="mt-14 grid gap-5 md:grid-cols-4">
          {[
            ["01", "Sign up & get verified", "Create your free account and complete your tenant profile once."],
            ["02", "Browse verified homes", "Only admin-inspected listings, with the full cost upfront."],
            ["03", "Inspect or fast-track", "Book an inspection, or pay directly for pre-verified homes."],
            ["04", "Pay into escrow, get keys", "Funds release to the landlord only after you move in."],
          ].map(([n, t, d]) => (
            <div key={n} className="card relative">
              <span className="font-display text-5xl font-extrabold text-accent">{n}</span>
              <h3 className="mt-4 text-xl font-bold">{t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features bento */}
      <section id="features" className="bg-primary py-24 text-primary-foreground">
        <div className="mx-auto max-w-7xl px-5">
          <h2 className="max-w-3xl text-4xl font-extrabold sm:text-5xl">Everything that makes renting in Nigeria stressful — <span className="text-accent">fixed.</span></h2>
          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            <div className="relative overflow-hidden rounded-3xl lg:col-span-2 lg:row-span-2">
              <img src={viAerial} alt="Aerial view of Victoria Island, Lagos" className="h-full min-h-[420px] w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/40 to-transparent" />
              <div className="absolute bottom-0 p-8">
                <Lock className="h-8 w-8 text-accent" />
                <h3 className="mt-4 text-3xl font-bold">Secure payment escrow</h3>
                <p className="mt-2 max-w-md opacity-80">Your rent is held by Bario — not the agent. Landlords get paid only after you confirm key handover.</p>
              </div>
            </div>
            {[
              [Receipt, "Transparent fee breakdown", "Rent, agency, agreement and caution fees shown upfront. No surprise charges."],
              [BadgeCheck, "Verified listings only", "Our team checks ownership and condition before any listing goes live."],
              [FileSignature, "Digital tenancy agreement", "Sign your contract online and get receipts instantly after payment."],
              [PhoneOff, "No bypass, no ghosting", "Contact details stay protected so deals stay safe on the platform."],
            ].map(([Icon, t, d]: any) => (
              <div key={t} className="rounded-3xl bg-primary-foreground/5 p-7 ring-1 ring-primary-foreground/10">
                <Icon className="h-7 w-7 text-accent" />
                <h3 className="mt-4 text-xl font-bold">{t}</h3>
                <p className="mt-2 text-sm opacity-75">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Students */}
      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-24 lg:grid-cols-2 lg:items-center">
        <img src={unilag} alt="University of Lagos campus" className="aspect-[4/3] w-full rounded-[2rem] object-cover" />
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-success">For students & tenants</p>
          <h2 className="mt-3 text-4xl font-extrabold sm:text-5xl">Housing your family can trust.</h2>
          <ul className="mt-8 space-y-4">
            {["Homes near where you study, work or want to live", "Pay once, online — no cash in envelopes", "Caution fee returned through the platform", "Agreement and receipts saved in your dashboard"].map((t) => (
              <li key={t} className="flex gap-3"><span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent"><Check className="h-3.5 w-3.5 text-accent-foreground" /></span><span>{t}</span></li>
            ))}
          </ul>
          <Link to="/auth?mode=signup&role=tenant" className="btn-primary mt-8">Find a House <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      {/* Agents */}
      <section id="agents" className="bg-secondary py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-2 lg:items-center">
          <div className="order-2 lg:order-1">
            <p className="text-sm font-bold uppercase tracking-widest text-success">For agents & landlords</p>
            <h2 className="mt-3 text-4xl font-extrabold sm:text-5xl">Serious tenants. Guaranteed commission.</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[[Building2, "Submit listings", "Upload photos, videos and fees in minutes."], [Star, "Verified leads", "Only vetted tenants request inspections."], [Wallet, "Commission tracking", "See your split and payout history."], [FileSignature, "Document vault", "Every signed agreement in one place."]].map(([I, t, d]: any) => (
                <div key={t} className="rounded-2xl bg-card p-5"><I className="h-6 w-6 text-success" /><h3 className="mt-3 font-bold">{t}</h3><p className="text-sm text-muted-foreground">{d}</p></div>
              ))}
            </div>
            <Link to="/auth?mode=signup&role=agent" className="btn-primary mt-8">List a Property <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="order-1 grid grid-cols-2 gap-4 lg:order-2">
            <img src={estate} alt="Housing estate in Ipaja, Lagos" className="aspect-[3/4] w-full rounded-3xl object-cover" />
            <img src={abuja} alt="Abuja city view" className="mt-10 aspect-[3/4] w-full rounded-3xl object-cover" />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="grid gap-8 rounded-[2rem] bg-accent p-10 text-accent-foreground sm:grid-cols-3">
          {[["100%", "of payments held in escrow"], ["0", "hidden charges, ever"], ["48h", "listing verification target"]].map(([a, b]) => (
            <div key={b}><p className="font-display text-6xl font-extrabold">{a}</p><p className="mt-1 font-medium">{b}</p></div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-5 pb-24">
        <h2 className="text-center text-4xl font-extrabold">Questions, answered.</h2>
        <div className="mt-10 space-y-3">
          {[
            ["Why can't I see listings before signing up?", "Verified accounts keep fake viewers and scammers out, protecting both tenants and landlords."],
            ["When does the landlord get paid?", "Only after you confirm that keys have been handed over. Until then your money sits in escrow."],
            ["What if something goes wrong?", "Raise a dispute from your dashboard. Funds stay frozen while our team resolves it."],
            ["How much does Bario cost?", "Tenants pay a small 2% service fee on rent, shown clearly before payment."],
          ].map(([q, a]) => (
            <details key={q} className="group rounded-2xl border bg-card p-5"><summary className="cursor-pointer list-none font-semibold">{q}</summary><p className="mt-3 text-sm text-muted-foreground">{a}</p></details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative">
        <img src={skyline} alt="Lagos skyline" className="h-[420px] w-full object-cover" />
        <div className="absolute inset-0 grid place-items-center bg-primary/80 px-5 text-center text-primary-foreground">
          <div>
            <h2 className="text-4xl font-extrabold sm:text-6xl">Your safe move starts here.</h2>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/auth?mode=signup&role=tenant" className="btn-accent px-7 py-4">Find a House</Link>
              <Link to="/auth?mode=signup&role=agent" className="btn border border-primary-foreground/30 px-7 py-4">List a Property</Link>
            </div>
          </div>
        </div>
      </section>
      <footer className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm opacity-80 sm:flex-row">
          <Logo light /><p>© {new Date().getFullYear()} Bario. Safe rentals for Nigeria.</p>
        </div>
      </footer>
    </div>
  );
}
