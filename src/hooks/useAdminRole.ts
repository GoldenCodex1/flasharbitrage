import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AdminRole =
  | "super_admin"
  | "trade_manager"
  | "finance_manager"
  | "support"
  | "viewer"
  | null;

// Which sub-roles may access which admin route paths (relative to /admin).
// "" === /admin index. super_admin always has full access.
export const ROLE_ACCESS: Record<Exclude<AdminRole, null>, string[] | "all"> = {
  super_admin: "all",
  trade_manager: [
    "",
    "trades",
    "trades/create",
    "trades/:id",
    "trades/settlement-logs",
    "trade-engine",
    "bot",
  ],
  finance_manager: [
    "",
    "deposits",
    "withdrawals",
    "transactions",
    "finance",
    "wallets",
    "referrals",
  ],
  support: ["", "users", "users/:id", "kyc", "applications", "transactions"],
  viewer: "all", // read-only — UI may disable mutations, but routes are reachable
};

// Sidebar items keyed by their path
export function canAccessPath(role: AdminRole, path: string): boolean {
  if (!role) return false;
  const allowed = ROLE_ACCESS[role];
  if (allowed === "all") return true;
  // Normalize: strip leading /admin/
  const rel = path.replace(/^\/admin\/?/, "");
  if (allowed.includes(rel)) return true;
  // Match dynamic segments (e.g., users/abc-123 against users/:id)
  const segs = rel.split("/");
  return allowed.some((p) => {
    const ps = p.split("/");
    if (ps.length !== segs.length) return false;
    return ps.every((s, i) => s.startsWith(":") || s === segs[i]);
  });
}

export function useAdminRole() {
  const { user, isAdmin } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["current-admin-role", user?.id],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("current_admin_role");
      if (error) throw error;
      return (data as AdminRole) ?? null;
    },
    // Auto-refresh so role grants/revocations propagate without a re-login
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
  return { role: (data ?? null) as AdminRole, loading: isLoading };
}

