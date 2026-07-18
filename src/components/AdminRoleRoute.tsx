import { Navigate, useLocation } from "react-router-dom";
import { useAdminRole, canAccessPath, AdminRole } from "@/hooks/useAdminRole";

interface Props {
  children: React.ReactNode;
  /** Optional: explicit allow list (sub-roles). If omitted, falls back to path-based ROLE_ACCESS. */
  allow?: Exclude<AdminRole, null>[];
}

export default function AdminRoleRoute({ children, allow }: Props) {
  const { role, loading } = useAdminRole();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!role) return <Navigate to="/admin/unauthorized" replace />;

  if (allow) {
    if (!allow.includes(role) && role !== "super_admin") {
      return <Navigate to="/admin/unauthorized" replace />;
    }
  } else if (!canAccessPath(role, location.pathname)) {
    return <Navigate to="/admin/unauthorized" replace />;
  }

  return <>{children}</>;
}
