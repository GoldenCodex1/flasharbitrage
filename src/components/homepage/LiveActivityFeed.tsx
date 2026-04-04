import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Users, Zap } from "lucide-react";

const NAMES = ["James K.", "Sarah M.", "Alex T.", "Maria L.", "David R.", "Chen W.", "Anna P.", "Omar H.", "Lisa N.", "Raj S."];
const PAIRS = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT"];
const ACTIONS = ["earned", "joined", "profit"];

interface Activity {
  id: number;
  name: string;
  action: string;
  detail: string;
  icon: typeof TrendingUp;
}

let counter = 0;

function generateActivity(): Activity {
  const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];
  const pair = PAIRS[Math.floor(Math.random() * PAIRS.length)];
  const amount = (5 + Math.random() * 95).toFixed(2);

  const map: Record<string, { detail: string; icon: typeof TrendingUp }> = {
    earned: { detail: `+$${amount} from ${pair}`, icon: TrendingUp },
    joined: { detail: `joined ${pair} trade`, icon: Users },
    profit: { detail: `+$${amount} profit settled`, icon: Zap },
  };

  return { id: counter++, name, action, ...map[action] };
}

export default function LiveActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [visible, setVisible] = useState(true);

  const addActivity = useCallback(() => {
    setActivities((prev) => [generateActivity(), ...prev].slice(0, 3));
  }, []);

  useEffect(() => {
    addActivity();
    const interval = setInterval(addActivity, 5000);
    return () => clearInterval(interval);
  }, [addActivity]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40 max-w-[280px] hidden md:block">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Live Activity</span>
        <button onClick={() => setVisible(false)} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">✕</button>
      </div>
      <div className="space-y-1.5">
        <AnimatePresence mode="popLayout">
          {activities.map((a) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="glass-card px-3 py-2 flex items-center gap-2"
            >
              <a.icon className="w-3.5 h-3.5 text-success shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-medium truncate">
                  <span className="text-foreground">{a.name}</span>{" "}
                  <span className="text-muted-foreground">{a.detail}</span>
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
