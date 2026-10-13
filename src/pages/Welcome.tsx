import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/Button";
import { WelcomeIllustration } from "@/components/WelcomeIllustration";

export const WELCOME_KEY = "bario-rental-welcome-v1";
export function hasSeenWelcome() {
  try { return localStorage.getItem(WELCOME_KEY) === "done"; } catch { return false; }
}
export function isAppLaunch() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    new URLSearchParams(window.location.search).get("source") === "pwa";
}
const slides = [
  { title: "Your next home.\nWithout the hassle.", description: "Find a home near where you want to live — for school, work, or a fresh start. All in one place." },
  { title: "Verified homes.\nA safer move.", description: "Browse listings checked before they go live, with rent, agent fees and deposits shown upfront." },
  { title: "Find. Book.\nFeel at home.", description: "Save your favourite homes, book an inspection and pay securely. Your rent stays protected until key handover." },
];

export default function Welcome() {
  const [step, setStep] = useState(0);
  const nav = useNavigate();
  const { user } = useAuth();
  const finish = (role: "tenant" | "agent" = "tenant", login = false) => {
    try { localStorage.setItem(WELCOME_KEY, "done"); } catch { /* Welcome still works with storage disabled. */ }
    nav(login ? "/auth" : `/auth?mode=signup&role=${role}`, { replace: true });
  };
  if (user) return <Navigate to="/app" replace />;

  return (
    <main className="welcome-page">
      <div className="welcome-shell">
        <header className="welcome-header">
          {step > 0 ? <Button className="welcome-back" onClick={() => setStep(step - 1)} aria-label="Previous welcome screen"><ArrowLeft size={21} /></Button> : <Link to="/" className="welcome-brand" aria-label="Bario home">B<span className="sr-only">ario</span></Link>}
          <div className="welcome-progress" role="progressbar" aria-label="Welcome progress" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step + 1}>
            {[0, 1, 2].map(i => <span key={i} className={i <= step ? "is-complete" : ""} />)}
          </div>
          <Button onClick={() => finish()} className="welcome-skip">{step === 2 ? "Continue" : "Skip"}<ArrowRight size={20} /></Button>
        </header>
        <div key={step} className="welcome-slide motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
          <div className="welcome-visual"><WelcomeIllustration step={step} /></div>
          <section className="welcome-copy" aria-live="polite" aria-atomic="true">
            <h1>{slides[step].title}</h1>
            <p>{slides[step].description}</p>
          </section>
        </div>
        <footer className="welcome-actions">
          <Button className="welcome-primary" onClick={() => step < 2 ? setStep(step + 1) : finish()}>{step === 2 ? "Find a home" : "Next"}<ArrowRight size={21} /></Button>
          {step === 2 ? <div className="welcome-secondary"><Button onClick={() => finish("agent")}>List a property</Button><Button onClick={() => finish("tenant", true)}>Log in</Button></div> : <p className="welcome-footer">A better way to rent. Bario.</p>}
        </footer>
      </div>
    </main>
  );
}