import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "agent" | "tenant";
type Ctx = { user: User | null; role: Role | null; loading: boolean; signOut: () => Promise<void> };
const AuthCtx = createContext<Ctx>({ user: null, role: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRole = async (u: User | null) => {
    if (!u) { setRole(null); setLoading(false); return; }
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.id);
    const roles = (data ?? []).map((r) => r.role as Role);
    setRole(roles.includes("admin") ? "admin" : roles.includes("agent") ? "agent" : "tenant");
    setLoading(false);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setUser(s?.user ?? null);
      setTimeout(() => loadRole(s?.user ?? null), 0);
    });
    supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); loadRole(data.session?.user ?? null); });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <AuthCtx.Provider value={{ user, role, loading, signOut: async () => { await supabase.auth.signOut(); } }}>
      {children}
    </AuthCtx.Provider>
  );
}
export const useAuth = () => useContext(AuthCtx);

export const naira = (n: number | string | null | undefined) => "₦" + Number(n ?? 0).toLocaleString("en-NG");
export const totalOf = (p: { rent: number; agency_fee: number; agreement_fee: number; caution_fee: number }) =>
  Number(p.rent) + Number(p.agency_fee) + Number(p.agreement_fee) + Number(p.caution_fee);
