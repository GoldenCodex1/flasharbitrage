import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

type Entry = Tables<"trade_entries"> & {
  trades: Tables<"trades"> | null;
  transaction_ref?: string | null;
};

interface Props {
  entry: Entry;
}

const STAGE_DURATIONS = [4500, 4500, 4500]; // ms — funds moving, trade executing, asset transferring
const STAGE_LABELS = ["Funds moving to exchange", "Trade executing", "Asset transferring"];
const FINAL_LABELS = ["Profit realized", "Funds returning"];

function shortRef(ref?: string | null) {
  if (!ref) return "—";
  return `${ref.slice(0, 8)}…${ref.slice(-6)}`;
}

export default function TradeLifecycleRow({ entry }: Props) {
  const trade = entry.trades;
  const roi = trade ? Number(trade.roi_percent) : 0;
  const totalProfit = Number(entry.amount) * (roi / 100);
  const durationMs = (trade ? Number(trade.duration_hours) : 1) * 3600 * 1000;
  const startMs = new Date(entry.started_at).getTime();
  const endMs = startMs + durationMs;

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (entry.status !== "active") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [entry.status]);

  // Determine current stage label & progress
  const elapsedSinceStart = now - startMs;
  const stagePhaseTotal = STAGE_DURATIONS.reduce((a, b) => a + b, 0);

  const { statusText, progress, currentProfit, finalPhase } = useMemo(() => {
    if (entry.status === "completed" || entry.status === "settled") {
      return {
        statusText: "Completed",
        progress: 100,
        currentProfit: Number(entry.profit ?? totalProfit),
        finalPhase: false,
      };
    }
    // Initial animation phase
    if (elapsedSinceStart < stagePhaseTotal) {
      let acc = 0;
      let label = STAGE_LABELS[0];
      for (let i = 0; i < STAGE_DURATIONS.length; i++) {
        acc += STAGE_DURATIONS[i];
        if (elapsedSinceStart < acc) {
          label = STAGE_LABELS[i];
          break;
        }
      }
      return { statusText: label, progress: 0, currentProfit: 0, finalPhase: false };
    }
    // Live progress
    const liveElapsed = Math.min(now - startMs, durationMs);
    const pct = Math.max(0, Math.min(1, liveElapsed / durationMs));
    if (pct >= 1) {
      // Final completion phase (visual only — backend settles separately)
      const overshoot = (now - endMs) / 1000;
      const label = overshoot < 3 ? FINAL_LABELS[0] : overshoot < 11 ? FINAL_LABELS[1] : "Completed";
      return {
        statusText: label,
        progress: 100,
        currentProfit: totalProfit,
        finalPhase: true,
      };
    }
    return {
      statusText: "Profit growing",
      progress: pct * 100,
      currentProfit: totalProfit * pct,
      finalPhase: false,
    };
  }, [entry.status, entry.profit, elapsedSinceStart, now, startMs, endMs, durationMs, stagePhaseTotal, totalProfit]);

  const isDone = entry.status === "completed" || entry.status === "settled";

  return (
    <tr className="border-b border-border/10 hover:bg-secondary/30 transition-colors align-top">
      <td className="px-4 py-3">
        <div className="font-medium font-display">{trade?.title ?? "Unknown"}</div>
        {entry.transaction_ref && (
          <Link
            to={`/tx/${entry.transaction_ref}`}
            title="Internal transaction reference"
            className="inline-block mt-1 text-[10px] font-mono text-primary/80 hover:text-primary truncate max-w-[140px]"
          >
            {shortRef(entry.transaction_ref)}
          </Link>
        )}
      </td>
      <td className="px-4 py-3">${Number(entry.amount).toLocaleString()}</td>
      <td className="px-4 py-3">
        <div className="text-success font-semibold">
          +${currentProfit.toFixed(2)}
        </div>
        <div className="text-[10px] text-muted-foreground">of ${totalProfit.toFixed(2)} ({roi}%)</div>
      </td>
      <td className="px-4 py-3 min-w-[180px]">
        <div className="flex items-center gap-2 mb-1.5">
          <motion.span
            key={statusText}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-[11px] font-medium ${isDone ? "text-success" : "text-primary"}`}
          >
            {statusText}
          </motion.span>
          {!isDone && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
            </span>
          )}
        </div>
        <div className="h-1.5 w-full bg-secondary/50 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-success"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        <div className="text-[10px] text-muted-foreground mt-1">{progress.toFixed(1)}%</div>
      </td>
    </tr>
  );
}
