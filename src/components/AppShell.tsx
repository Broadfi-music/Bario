import { NavLink, Outlet, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Bell, LogOut, Search, CalendarCheck, Wallet, FileText, User, Building2, Users, BarChart3, Inbox, Plus, Banknote, Heart, ArrowDownToLine, Activity } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "./Logo";

const navs = {
  tenant: [["/app", Search, "Find homes"], ["/app/saved", Heart, "Saved homes"], ["/app/bookings", CalendarCheck, "Inspections"], ["/app/payments", Wallet, "Payments & escrow"], ["/app/agreements", FileText, "Agreements"], ["/app/profile", User, "Profile"]],
  agent: [["/app", Building2, "My listings"], ["/app/new", Plus, "Submit property"], ["/app/leads", Inbox, "Tenant leads"], ["/app/earnings", Banknote, "Earnings"], ["/app/agreements", FileText, "Document vault"], ["/app/profile", User, "Profile"]],
  admin: [["/app", BarChart3, "Analytics"], ["/app/activity", Activity, "Activity"], ["/app/listings", Building2, "Listings"], ["/app/new", Plus, "New listing"], ["/app/finance", Wallet, "Escrow & finance"], ["/app/withdrawals", ArrowDownToLine, "Withdrawals"], ["/app/users", Users, "Users & disputes"]],
} as const;

const short: Record<string, string> = { "My listings": "Listings", "Submit property": "Add", "Tenant leads": "Leads", "Document vault": "Docs", "Escrow & finance": "Escrow", "Users & disputes": "Users", "New listing": "New", "Saved homes": "Saved", "Payments & escrow": "Payments", "Find homes": "Find" };

export default function AppShell() {
  const { user, role, loading, signOut } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const isHome = useLocation().pathname.replace(/\/$/, "") === "/app";
  useEffect(() => {
    if (!user) return;
    supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(20).then(({ data }) => setNotes(data ?? []));
  }, [user]);
  if (loading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  const items = navs[role ?? "tenant"];
  const unread = notes.filter((n) => !n.read).length;
  const markRead = async () => { setOpen(!open); if (unread) { await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false); setNotes(notes.map((n) => ({ ...n, read: true }))); } };

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col bg-primary p-5 text-primary-foreground lg:flex">
        <Logo light />
        <span className="chip mt-4 w-fit bg-accent capitalize text-accent-foreground">{role === "admin" ? "Super admin" : role}</span>
        <nav className="mt-8 space-y-1">
          {items.map(([to, I, l]) => (
            <NavLink key={to} to={to} end className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${isActive ? "bg-primary-foreground/10 text-accent" : "opacity-80 hover:opacity-100"}`}>
              <I className="h-4 w-4" />{l}
            </NavLink>
          ))}
        </nav>
        <button onClick={signOut} className="mt-auto flex items-center gap-3 px-3 py-2 text-sm opacity-70 hover:opacity-100"><LogOut className="h-4 w-4" />Log out</button>
      </aside>
      <div className="flex-1 pb-28 lg:pb-0">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/90 px-5 py-4 backdrop-blur">
          <div className="lg:hidden"><Logo /></div>
          <p className="hidden text-sm text-muted-foreground lg:block">{user.email}</p>
          <div className="relative flex items-center gap-2">
            <button onClick={markRead} aria-label="Notifications" className="relative rounded-full border bg-card p-2.5">
              <Bell className="h-4 w-4" />{unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">{unread}</span>}
            </button>
            <button onClick={signOut} aria-label="Log out" className="rounded-full border bg-card p-2.5 lg:hidden"><LogOut className="h-4 w-4" /></button>
            {open && (
              <div className="absolute right-0 top-12 max-h-[70vh] w-[min(20rem,calc(100vw-2rem))] overflow-auto rounded-2xl border bg-card p-2 shadow-[var(--shadow-soft)]">
                {notes.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No notifications yet.</p> : notes.map((n) => (
                  <div key={n.id} className="rounded-xl p-3 hover:bg-muted"><p className="text-sm font-semibold">{n.title}</p><p className="text-xs text-muted-foreground">{n.body}</p></div>
                ))}
              </div>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-6xl p-4 sm:p-8">
          {isHome && <div className="mb-6 grid grid-cols-3 gap-3 lg:hidden">{items.slice(1).map(([to, I, l]) => (
            <NavLink key={to} to={to} className="flex flex-col items-start gap-2 rounded-2xl border bg-card p-3 shadow-sm active:scale-95">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-foreground"><I className="h-4 w-4" /></span>
              <span className="text-xs font-semibold leading-tight">{l}</span>
            </NavLink>))}</div>}
          <Outlet />
        </main>
      </div>
      <nav className="fixed inset-x-3 bottom-3 z-30 flex gap-1 overflow-x-auto rounded-3xl border bg-card/95 p-1.5 shadow-[var(--shadow-soft)] backdrop-blur lg:hidden" style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}>
        {items.map(([to, I, l]) => (
          <NavLink key={to} to={to} end className={({ isActive }) => `flex min-w-[64px] flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-semibold ${isActive ? "bg-primary text-accent" : "text-muted-foreground"}`}>
            <I className="h-5 w-5" />{short[l] ?? l.split(" ")[0]}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export const PageTitle = ({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) => (
  <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
    <div><h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>{sub && <p className="mt-1 text-muted-foreground">{sub}</p>}</div>{action}
  </div>
);

const tone: Record<string, string> = {
  pending: "bg-warning/15 text-warning", active: "bg-success/15 text-success", rented: "bg-primary/10 text-primary", rejected: "bg-destructive/10 text-destructive",
  requested: "bg-warning/15 text-warning", confirmed: "bg-success/15 text-success", completed: "bg-primary/10 text-primary", cancelled: "bg-destructive/10 text-destructive",
  initiated: "bg-muted text-muted-foreground", in_escrow: "bg-warning/15 text-warning", keys_handed: "bg-success/15 text-success", released: "bg-primary/10 text-primary", paid: "bg-success/15 text-success", refunded: "bg-muted text-muted-foreground", disputed: "bg-destructive/10 text-destructive",
};
const label: Record<string, string> = { pending: "Pending verification", in_escrow: "In escrow", keys_handed: "Keys handed", initiated: "Awaiting payment" };
export const Status = ({ s }: { s: string }) => <span className={`chip capitalize ${tone[s] ?? "bg-muted"}`}>{label[s] ?? s}</span>;
export const Empty = ({ text }: { text: string }) => <div className="card text-center text-muted-foreground">{text}</div>;
