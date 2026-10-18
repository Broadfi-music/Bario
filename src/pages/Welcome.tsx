import { Navigate, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/Button";
import { WelcomeIllustration } from "@/components/WelcomeIllustration";
import { Logo } from "@/components/Logo";

export const WELCOME_KEY = "bario-rental-welcome-v1";
export function hasSeenWelcome() {
  try { return localStorage.getItem(WELCOME_KEY) === "done"; } catch { return false; }
}
export function isAppLaunch() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    new URLSearchParams(window.location.search).get("source") === "pwa";
}

export default function Welcome() {
  const nav = useNavigate();
  const { user } = useAuth();
  const finish = (role: "tenant" | "agent" = "tenant", login = false) => {
    try { localStorage.setItem(WELCOME_KEY, "done"); } catch { /* Welcome still works with storage disabled. */ }
    nav(login ? "/auth" : `/auth?mode=signup&role=${role}`, { replace: true });
  };
  if (user) return <Navigate to="/app" replace />;

  return (
    <main className="betterhouse-splash">
      <div className="splash-shell">
        <Logo light />
        <div className="splash-art"><WelcomeIllustration step={0} /></div>
        <h1>A better home.<br />Wherever life takes you.</h1>
        <p>Find a place near where you want to live. Book inspections, see every fee, and rent with peace of mind.</p>
        <div className="mt-8 space-y-3">
          <Button className="btn-accent w-full py-4" onClick={() => finish()}>Find a home<ArrowRight size={21} /></Button>
          <div className="flex justify-between"><Button className="py-3" onClick={() => finish("agent")}>List a property</Button><Button className="py-3" onClick={() => finish("tenant", true)}>Log in<ArrowRight size={18} /></Button></div>
        </div>
      </div>
    </main>
  );
}