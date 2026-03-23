import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import SiteLogo from "@/components/SiteLogo";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Briefcase,
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  Users,
  User,
  Menu,
  X,
  Shield,
  ChevronDown,
  LogOut,
  Settings,
  Bot,
  Receipt,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NotificationBell from "@/components/NotificationBell";

const userNavItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Portfolio", path: "/portfolio", icon: Briefcase },
  { label: "Deposit", path: "/deposit", icon: ArrowDownToLine },
  { label: "Withdraw", path: "/withdraw", icon: ArrowUpFromLine },
  { label: "Auto Bot", path: "/auto-bot", icon: Bot },
  { label: "Trades", path: "/trades", icon: History },
  { label: "Transactions", path: "/transactions", icon: Receipt },
  { label: "Referral", path: "/referral", icon: Users },
  { label: "Profile", path: "/profile", icon: User },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 border-b border-border/50 backdrop-blur-xl bg-background/80">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-4 h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-sm">A</span>
            </div>
            <span className="font-display font-bold text-lg text-foreground">
              Arb<span className="text-primary">AI</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {userNavItems.map((item) => (
              <Link key={item.path} to={item.path} className={`nav-link text-xs px-2.5 py-2 ${location.pathname === item.path ? "active" : ""}`}>
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <NotificationBell />

            {isAdmin && (
              <Link to="/admin" className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
                <Shield className="w-3.5 h-3.5" /> Admin
              </Link>
            )}

            <div className="relative">
              <button onClick={() => setAvatarOpen(!avatarOpen)} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-secondary transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
              </button>

              <AnimatePresence>
                {avatarOpen && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="absolute right-0 top-12 w-48 glass-card p-2 z-50">
                    <Link to="/profile" className="nav-link text-sm" onClick={() => setAvatarOpen(false)}>
                      <Settings className="w-4 h-4" /> Settings
                    </Link>
                    <button onClick={handleLogout} className="nav-link text-sm w-full text-destructive">
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button className="lg:hidden p-2 rounded-lg hover:bg-secondary transition-colors" onClick={() => setMobileOpen(true)}>
              <Menu className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" onClick={() => setMobileOpen(false)} />
            <motion.aside initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25 }} className="fixed right-0 top-0 bottom-0 w-72 bg-sidebar border-l border-sidebar-border z-50 p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-8">
                <span className="font-display font-bold text-lg">Menu</span>
                <button onClick={() => setMobileOpen(false)}><X className="w-5 h-5" /></button>
              </div>
              <nav className="flex flex-col gap-1">
                {userNavItems.map((item) => (
                  <Link key={item.path} to={item.path} className={`nav-link ${location.pathname === item.path ? "active" : ""}`} onClick={() => setMobileOpen(false)}>
                    <item.icon className="w-5 h-5" /> {item.label}
                  </Link>
                ))}
                {isAdmin && (
                  <>
                    <div className="glow-line my-4" />
                    <Link to="/admin" className="nav-link" onClick={() => setMobileOpen(false)}>
                      <Shield className="w-5 h-5" /> Admin Panel
                    </Link>
                  </>
                )}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
