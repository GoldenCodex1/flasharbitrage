import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shield, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export default function SecurityControls() {
  const [showLogs, setShowLogs] = useState(false);

  const { data: logs } = useQuery({
    queryKey: ["wallet-audit-logs", showLogs],
    enabled: showLogs,
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_action_logs")
        .select("*")
        .in("section", ["wallet_settings", "deposit_settings", "withdrawal_settings", "liquidity_rules"])
        .order("created_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });

  return (
    <div className="glass-card p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-display font-semibold text-base sm:text-lg">Security & Change Control</h3>
            <p className="text-xs text-muted-foreground mt-0.5">All wallet and threshold changes are immutably logged.</p>
          </div>
        </div>
        <Button size="sm" variant="ghost" className="text-xs" onClick={() => setShowLogs(!showLogs)}>
          <History className="w-3.5 h-3.5 mr-1" /> {showLogs ? "Hide" : "View"} Change History
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="bg-secondary/30 rounded-xl p-3 border border-border/10">
          <p className="text-muted-foreground mb-1">Wallet Changes</p>
          <p className="text-sm">Require Super Admin + 2FA</p>
        </div>
        <div className="bg-secondary/30 rounded-xl p-3 border border-border/10">
          <p className="text-muted-foreground mb-1">Address Policy</p>
          <p className="text-sm">Immutable — edits create new wallet</p>
        </div>
        <div className="bg-secondary/30 rounded-xl p-3 border border-border/10">
          <p className="text-muted-foreground mb-1">Deletion Policy</p>
          <p className="text-sm">Blocked if transaction history exists</p>
        </div>
      </div>

      <AnimatePresence>
        {showLogs && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/20 pt-4 mt-2">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Recent Change History</h4>
              {(!logs || logs.length === 0) ? (
                <p className="text-xs text-muted-foreground">No changes recorded yet.</p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {logs.map((l) => (
                    <div key={l.id} className="flex flex-wrap items-start gap-3 text-xs bg-secondary/30 rounded-lg p-2.5">
                      <span className="text-muted-foreground whitespace-nowrap">
                        {new Date(l.created_at).toLocaleString()}
                      </span>
                      <span className="font-mono text-primary">{l.section}.{l.field_name}</span>
                      {l.old_value && <span className="text-destructive line-through">{l.old_value}</span>}
                      <span className="text-green-400">→ {l.new_value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
