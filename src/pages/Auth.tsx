import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Home, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import flats from "@/assets/flats-vi.jpg";
import { Button } from "@/components/Button";
import { WelcomeIllustration } from "@/components/WelcomeIllustration";

const authSlides = [
  ["Your next home starts here.", "A place for your plans, in the location you love."],
  ["Every fee. Upfront.", "Know your rent, agency fees and deposit before you commit."],
  ["From inspection to move-in.", "Find your place, book a visit and pay with peace of mind."],
  ["Closer to where you belong.", "Homes near work, school, family and your next chapter."],
];

export default function Auth() {
  const [params] = useSearchParams();
  const [mode, setMode] = useState(params.get("mode") === "signup" ? "signup" : "login");
  const [role, setRole] = useState<"tenant" | "agent">(params.get("role") === "agent" ? "agent" : "tenant");
  const [f, setF] = useState({ full_name: "", phone: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setSlide(s => (s + 1) % 4), 4500);
    return () => window.clearInterval(timer);
  }, []);
  const { user } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (user) nav("/app"); }, [user, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email: f.email, password: f.password,
        options: { emailRedirectTo: `${window.location.origin}/app`, data: { full_name: f.full_name, phone: f.phone, role } },
      });
      if (error) toast.error(error.message); else if (!data.session) setSent(true);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: f.email, password: f.password });
      if (error) toast.error(error.message);
    }
    setBusy(false);
  };

  return (
    <div className="auth-page grid min-h-screen lg:grid-cols-2">
      <div className="auth-intro lg:hidden">
        <Logo light />
        <h2>{authSlides[slide][0]}</h2>
        <p>{authSlides[slide][1]}</p>
        <div className="auth-illustration" key={slide}><WelcomeIllustration step={slide} /></div>
        <div className="auth-dots">{authSlides.map((_, i) => <Button key={i} aria-label={`Show housing illustration ${i + 1}`} aria-pressed={i === slide} onClick={() => setSlide(i)}><span className={i === slide ? "selected" : ""} /></Button>)}</div>
      </div>
      <div className="auth-form-panel flex flex-col px-6 py-8 sm:px-12">
        <div className="hidden lg:block"><Logo /></div>
        <div className="mx-auto my-auto w-full max-w-md py-4 lg:py-10">
          {sent ? (
            <div className="card text-center"><h1 className="text-2xl font-bold">Check your email</h1><p className="mt-2 text-muted-foreground">We sent a confirmation link to {f.email}. Click it to activate your account.</p></div>
          ) : (
            <>
              <h1 className="text-4xl font-extrabold">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
              <p className="mt-2 text-muted-foreground">{mode === "signup" ? "Join Nigeria's safest rental platform." : "Log in to your dashboard."}</p>
              <form onSubmit={submit} className="mt-8 space-y-4">
                {mode === "signup" && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      {([["tenant", Home, "I'm looking for a house"], ["agent", Building2, "I'm an agent / lister"]] as const).map(([r, I, t]) => (
                        <Button type="button" key={r} onClick={() => setRole(r)} className={`flex-col items-start rounded-lg border p-4 text-left text-sm font-semibold transition ${role === r ? "border-primary bg-secondary ring-2 ring-primary" : "bg-card"}`}>
                          <I className="mb-2 h-5 w-5" />{t}
                        </Button>
                      ))}
                    </div>
                    <div><label className="label">Full name</label><input required className="input" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
                    <div><label className="label">Phone</label><input required className="input" placeholder="080..." value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
                  </>
                )}
                <div><label className="label">Email</label><input required type="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
                <div><label className="label">Password</label><input required minLength={6} type="password" className="input" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
                <Button type="submit" disabled={busy} className="btn-primary w-full py-3.5">{busy ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}</Button>
              </form>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                {mode === "signup" ? "Already have an account?" : "New to betterhouse?"}{" "}
                <Button className="font-semibold text-primary underline" onClick={() => { setSent(false); setMode(mode === "signup" ? "login" : "signup"); }}>{mode === "signup" ? "Log in" : "Sign up"}</Button>
              </p>
            </>
          )}
        </div>
      </div>
      <div className="relative hidden lg:block">
        <img src={flats} alt="Apartments in Victoria Island, Lagos" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 to-transparent" />
        <p className="absolute bottom-12 left-12 max-w-md font-display text-4xl font-bold text-primary-foreground">Verified homes. Protected payments. Zero bypass.</p>
      </div>
    </div>
  );
}
