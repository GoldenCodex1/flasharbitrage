import { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  TrendingUp,
  Bot,
  ArrowDownToLine,
  ArrowUpFromLine,
  DollarSign,
  Users,
  History,
  Gift,
  Crown,
  ShieldCheck,
  Wallet,
  Settings,
  Lock,
  FileText,
  Mail,
  LogOut,
  Menu,
  X,
  ChevronLeft,
} from "lucide-react";

import { useAdminRole, canAccessPath } from "@/hooks/useAdminRole";

const adminNavItems = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { label: "Trade Engine", path: "/admin/trades", icon: TrendingUp },
  { label: "Trade Generator", path: "/admin/trade-engine", icon: Bot },
  { label: "Finance", path: "/admin/finance", icon: DollarSign },
  { label: "Auto Bot Settings", path: "/admin/bot", icon: Bot },
  { label: "Users", path: "/admin/users", icon: Users },
  { label: "Admins", path: "/admin/admins", icon: ShieldCheck, superOnly: true },
  { label: "Audit Logs", path: "/admin/audit-logs", icon: FileText, superOnly: true },
  { label: "Plans", path: "/admin/plans", icon: Crown, superOnly: true },
  { label: "Referrals", path: "/admin/referrals", icon: Gift },
  { label: "KYC", path: "/admin/kyc", icon: ShieldCheck },
  { label: "Wallet Settings", path: "/admin/wallets", icon: Wallet },
  { label: "API & Gateways", path: "/admin/api", icon: Settings, superOnly: true },
  { label: "Infrastructure", path: "/admin/system", icon: Settings, superOnly: true },
  { label: "Email & Notifications", path: "/admin/email", icon: Mail, superOnly: true },
  { label: "Security Logs", path: "/admin/security", icon: Lock, superOnly: true },
  { label: "Homepage Control", path: "/admin/homepage-control", icon: FileText, superOnly: true },
  { label: "Applications", path: "/admin/applications", icon: Users },
];

export default function AdminLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { role } = useAdminRole();

  const visibleNav = adminNavItems.filter((item) => {
    if (!role) return false;
    if (role === "super_admin") return true;
    if ((item as any).superOnly) return false;
    return canAccessPath(role, item.path);
  });

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border/30 bg-sidebar fixed top-0 bottom-0 left-0 z-40">
        <div className="p-4 border-b border-border/30">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back to App
          </Link>
          <div className="mt-3 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-sm">A</span>
            </div>
            <span className="font-display font-bold">Admin Panel</span>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {visibleNav.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link text-sm ${location.pathname === item.path ? "active" : ""}`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-border/30">
          <button className="nav-link text-sm w-full text-destructive">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-xs">A</span>
            </div>
            <span className="font-display font-bold text-sm">Admin</span>
          </div>
          <button onClick={() => setSidebarOpen(true)} className="p-2">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-sidebar border-r border-sidebar-border z-50 p-4 overflow-y-auto lg:hidden"
            >
              <div className="flex items-center justify-between mb-6">
                <span className="font-display font-bold">Admin</span>
                <button onClick={() => setSidebarOpen(false)}><X className="w-5 h-5" /></button>
              </div>
              <nav className="space-y-0.5">
                {visibleNav.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`nav-link text-sm ${location.pathname === item.path ? "active" : ""}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content — matches user dashboard padding */}
      <main className="flex-1 lg:ml-64 max-w-[1400px] w-full mx-auto px-4 py-6 pt-20 lg:pt-6">
        <Outlet />
      </main>
    </div>
  );
}
