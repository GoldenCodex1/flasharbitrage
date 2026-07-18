import { motion } from "framer-motion";
import { useMemo } from "react";

const COIN_SYMBOLS = ["₿", "Ξ", "◎", "$", "⬡"];

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  symbol: string;
  opacity: number;
}

export default function FloatingParticles() {
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 10 + Math.random() * 14,
      duration: 15 + Math.random() * 20,
      delay: Math.random() * 10,
      symbol: COIN_SYMBOLS[i % COIN_SYMBOLS.length],
      opacity: 0.04 + Math.random() * 0.06,
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute font-display text-primary select-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            fontSize: p.size,
            opacity: p.opacity,
          }}
          animate={{
            y: [0, -60, 0],
            x: [0, 20, -10, 0],
            rotate: [0, 15, -10, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        >
          {p.symbol}
        </motion.span>
      ))}
      {/* Animated gradient orbs */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full blur-[150px]"
        style={{ background: "hsl(217 91% 60% / 0.03)", left: "10%", top: "20%" }}
        animate={{ x: [0, 80, 0], y: [0, -40, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full blur-[120px]"
        style={{ background: "hsl(160 84% 39% / 0.03)", right: "5%", bottom: "30%" }}
        animate={{ x: [0, -60, 0], y: [0, 50, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
