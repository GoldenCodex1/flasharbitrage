import { useEffect, useRef, useState } from "react";

export function useCountUp(target: number, duration = 2000, startOnView = true) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!startOnView) {
      animate();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          animate();
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  function animate() {
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  return { value, ref };
}
