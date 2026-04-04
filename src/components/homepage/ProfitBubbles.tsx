import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Bubble {
  id: number;
  text: string;
  x: number;
}

const PAIRS = ["BTC", "ETH", "SOL", "BNB", "XRP"];
let bubbleId = 0;

export default function ProfitBubbles() {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  const spawn = useCallback(() => {
    const amount = (3 + Math.random() * 45).toFixed(2);
    const pair = PAIRS[Math.floor(Math.random() * PAIRS.length)];
    const texts = [`+$${amount}`, `+$${amount} ${pair}`, `$${amount} earned`];
    const bubble: Bubble = {
      id: bubbleId++,
      text: texts[Math.floor(Math.random() * texts.length)],
      x: 15 + Math.random() * 70,
    };
    setBubbles((prev) => [...prev, bubble]);
    setTimeout(() => {
      setBubbles((prev) => prev.filter((b) => b.id !== bubble.id));
    }, 3500);
  }, []);

  useEffect(() => {
    const interval = setInterval(spawn, 4000 + Math.random() * 3000);
    spawn();
    return () => clearInterval(interval);
  }, [spawn]);

  return (
    <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden" aria-hidden>
      <AnimatePresence>
        {bubbles.map((b) => (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: [0, 1, 1, 0], y: -120 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 3.5, ease: "easeOut" }}
            className="absolute bottom-[20%] text-success font-display font-bold text-sm"
            style={{ left: `${b.x}%` }}
          >
            {b.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
