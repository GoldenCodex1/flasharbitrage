import { motion } from "framer-motion";
import { Activity } from "lucide-react";

export default function SystemStatusBar() {
  return (
    <div className="flex justify-center py-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card px-4 py-2 flex items-center gap-2.5 text-xs"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
        </span>
        <Activity className="w-3.5 h-3.5 text-success" />
        <span className="font-medium text-foreground">Arbitrage Engine: <span className="text-success">Active</span></span>
        <span className="text-muted-foreground">|</span>
        <span className="text-muted-foreground">Latency: 12ms</span>
      </motion.div>
    </div>
  );
}
