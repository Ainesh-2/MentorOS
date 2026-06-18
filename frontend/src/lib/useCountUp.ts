import { useEffect, useRef, useState } from "react";

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Animate a number from 0 → target on first render (Section 1.6: "score values
 * count up on first render"). Honours prefers-reduced-motion by snapping.
 */
export function useCountUp(target: number, duration = 900, enabled = true): number {
  const [value, setValue] = useState(enabled && !prefersReduced() ? 0 : target);
  const raf = useRef<number>();

  useEffect(() => {
    if (!enabled || prefersReduced()) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + (target - from) * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [target, duration, enabled]);

  return value;
}
