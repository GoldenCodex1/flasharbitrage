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

const STAGE_DURATIONS = [3000, 3000]; // ms — Balance Deducted, Trade Executed (instant-feel intro)
const INTRO_LABELS = ["Balance Deducted", "Trade Executed"];

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
    if (entry.status === "completed" || entry.status === "settled") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [entry.status]);

  const elapsedSinceStart = now - startMs;
  const introTotal = STAGE_DURATIONS.reduce((a, b) => a + b, 0);

  const { statusText, progress, currentProfit } = useMemo(() => {
    const isSettled = entry.status === "completed" || entry.status === "settled";

    if (isSettled) {
      return {
        statusText: "Settlement Completed",
        progress: 100,
        currentProfit: Number(entry.profit ?? totalProfit),
      };
    }

    // Brief intro animation (purely visual) — never marks trade complete
    if (elapsedSinceStart < introTotal) {
      const label = elapsedSinceStart < STAGE_DURATIONS[0] ? INTRO_LABELS[0] : INTRO_LABELS[1];
      return { statusText: label, progress: 0, currentProfit: 0 };
    }

    // Time-based progress, strictly clamped < 100% until backend settles
    const liveElapsed = Math.max(0, now - startMs);
    const rawPct = durationMs > 0 ? liveElapsed / durationMs : 0;
    const pct = Math.min(99.9, rawPct * 100);
    const profitPct = Math.min(1, rawPct);

    if (now >= endMs) {
      // Duration elapsed but backend hasn't settled yet — awaiting settlement
      return {
        statusText: "Awaiting settlement",
        progress: 99.9,
        currentProfit: totalProfit,
      };
    }

    return {
      statusText: "Trade in progress",
      progress: pct,
      currentProfit: totalProfit * profitPct,
    };
  }, [entry.status, entry.profit, elapsedSinceStart, now, startMs, endMs, durationMs, introTotal, totalProfit]);

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
