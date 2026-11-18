import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AuthCtx { session: Session | null; user: User | null; ready: boolean; isAdmin: boolean; adminLoading: boolean }
const Ctx = createContext<AuthCtx>({ session: null, user: null, ready: false, isAdmin: false, adminLoading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const qc = useQueryClient();
  const activeAccountId = useRef<string | null>(null);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      const nextId = s?.user.id ?? null;
      const accountChanged = activeAccountId.current !== nextId;
      activeAccountId.current = nextId;
      // Orders, deliveries and profile queries contain private data. Never
      // reuse them after switching from customer/admin to courier (or back).
      if (accountChanged || event === "SIGNED_OUT") {
        void qc.cancelQueries();
        qc.clear();
      } else if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        void qc.invalidateQueries({ queryKey: ["me"] });
      }
      setSession(s);
      setReady(true);
    });
    supabase.auth.getSession().then(({ data: d }) => {
      const nextId = d.session?.user.id ?? null;
      if (activeAccountId.current !== nextId) {
        activeAccountId.current = nextId;
        void qc.cancelQueries();
        qc.clear();
      }
      setSession(d.session);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, [qc]);

  const userId = session?.user.id;
  const roles = useQuery({
    queryKey: ["me", "roles", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      return (data ?? []).map((r) => r.role);
    },
  });

  return (
    <Ctx.Provider
      value={{
        session,
        user: session?.user ?? null,
        ready,
        isAdmin: !!roles.data?.includes("admin"),
        adminLoading: !ready || (!!userId && roles.isLoading),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
export const useAuth = () => useContext(Ctx);