import { motion } from "framer-motion";
import { Copy, Check, Users, Gift, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

export default function Referral() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("referral_code").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: referrals } = useQuery({
    queryKey: ["referrals", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("referrals").select("*").eq("referrer_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  // Fetch commissions with level breakdown
  const { data: commissions } = useQuery({
    queryKey: ["my-commissions", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("referral_commissions").select("*").eq("referrer_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const code = profile?.referral_code ?? "...";
  const totalEarnings = commissions?.reduce((sum, c) => sum + Number(c.commission_amount), 0) ?? 0;
  const l1Earnings = commissions?.filter((c: any) => (c.level || 1) === 1).reduce((s, c) => s + Number(c.commission_amount), 0) ?? 0;
  const l2Earnings = commissions?.filter((c: any) => (c.level || 0) === 2).reduce((s, c) => s + Number(c.commission_amount), 0) ?? 0;
  const l3Earnings = commissions?.filter((c: any) => (c.level || 0) === 3).reduce((s, c) => s + Number(c.commission_amount), 0) ?? 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(`${window.location.origin}/auth?ref=${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2 });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h1 className="font-display font-bold text-2xl">Referral Program</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total Referrals</span>
            <Users className="w-4 h-4 text-muted-foreground" />
          </div>
          <span className="text-2xl font-display font-bold">{referrals?.length ?? 0}</span>
        </div>
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total Earnings</span>
            <Gift className="w-4 h-4 text-muted-foreground" />
          </div>
          <span className="text-2xl font-display font-bold text-success">{fmt(totalEarnings)}</span>
        </div>
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">L1 Earnings</span>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </div>
          <span className="text-xl font-display font-bold text-primary">{fmt(l1Earnings)}</span>
        </div>
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">L2 + L3</span>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </div>
          <span className="text-xl font-display font-bold">{fmt(l2Earnings + l3Earnings)}</span>
        </div>
      </div>

      <div className="glass-card p-5 space-y-3">
        <p className="font-display font-semibold text-sm">Your Referral Link</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-secondary/50 px-3 py-2.5 rounded-lg text-sm font-mono text-foreground truncate">
            {window.location.origin}/auth?ref={code}
          </code>
          <button onClick={handleCopy} className="px-4 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {/* Commission History */}
      {commissions && commissions.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border/30">
            <h3 className="font-display font-semibold text-sm">Commission History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Level</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((c: any) => (
                  <tr key={c.id} className="border-b border-border/10 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${(c.level || 1) === 1 ? 'bg-primary/20 text-primary' : (c.level || 0) === 2 ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                        Level {c.level || 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-success font-semibold">{fmt(Number(c.commission_amount))}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Direct Referrals */}
      {referrals && referrals.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border/30">
            <h3 className="font-display font-semibold text-sm">Direct Referrals</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Referred User</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Joined</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Earned</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => (
                  <tr key={r.id} className="border-b border-border/10 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 font-medium font-mono text-xs">{r.referred_id.slice(0, 8)}...</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</td>
                    <td className="px-4 py-3 text-success font-semibold">{fmt(Number(r.total_commission))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}
