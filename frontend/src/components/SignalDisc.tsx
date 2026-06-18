import { motion } from "framer-motion";
import type { ScoreBreakdown } from "@/types";
import {
  COMPONENT_META,
  RISK_META,
  componentValue,
} from "@/lib/score";
import { useCountUp } from "@/lib/useCountUp";
import { cn } from "@/lib/utils";

/**
 * The Signal Disc — the product's signature element. A four-axis radar
 * (Attendance · Academic · Engagement · Placement) filled proportionally in
 * azure, inside a glass-strong disc, with the composite score centered and the
 * ring tinted by risk category. One component, three sizes (Section 1.7).
 */

type Size = "sm" | "md" | "lg";

interface SizeConfig {
  /** Footprint incl. any outside labels. */
  box: number;
  /** The glass disc diameter. */
  disc: number;
  ring: number;
  glass: boolean;
  showScore: boolean;
  labels: "none" | "svg" | "html";
  scoreClass: string;
}

const SIZES: Record<Size, SizeConfig> = {
  sm: { box: 46, disc: 46, ring: 6, glass: false, showScore: false, labels: "none", scoreClass: "" },
  md: {
    box: 196,
    disc: 196,
    ring: 4.5,
    glass: true,
    showScore: true,
    labels: "svg",
    scoreClass: "font-mono tnum text-[36px] leading-none",
  },
  lg: {
    box: 360,
    disc: 280,
    ring: 5.5,
    glass: true,
    showScore: true,
    labels: "html",
    scoreClass: "font-display font-semibold text-[60px] leading-none",
  },
};

// Geometry in a fixed 200×200 viewBox; the SVG scales to the disc size.
const C = 100;
const R_PLOT = 58;
const R_RING = 90;
const GRID_LEVELS = [0.34, 0.67, 1];

const AXES = COMPONENT_META.map((meta, i) => {
  const angle = -Math.PI / 2 + (i * Math.PI) / 2; // top, right, bottom, left
  return { ...meta, angle, cos: Math.cos(angle), sin: Math.sin(angle) };
});

function polar(value01: number, cos: number, sin: number) {
  const r = value01 * R_PLOT;
  return { x: C + r * cos, y: C + r * sin };
}

function polygonPoints(values01: number[]): string {
  return AXES.map((ax, i) => {
    const p = polar(values01[i], ax.cos, ax.sin);
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(" ");
}

export interface SignalDiscProps {
  breakdown: ScoreBreakdown;
  size?: Size;
  /** Sequential axis draw-in + resolve (landing hero only). */
  animated?: boolean;
  /** Count the centered score up on mount. Defaults to true where shown. */
  countUp?: boolean;
  className?: string;
}

export function SignalDisc({
  breakdown,
  size = "md",
  animated = false,
  countUp = true,
  className,
}: SignalDiscProps) {
  const cfg = SIZES[size];
  const risk = RISK_META[breakdown.risk_category];
  const values01 = AXES.map((ax) => componentValue(breakdown, ax.key) / 100);
  const displayed = useCountUp(breakdown.total_score, 1000, cfg.showScore && countUp);
  const isSm = size === "sm";

  return (
    <div
      className={cn("relative", className)}
      style={{ width: cfg.box, height: cfg.box }}
      role="img"
      aria-label={`Success score ${Math.round(breakdown.total_score)} of 100 — ${risk.label}. Attendance ${Math.round(breakdown.attendance_component)}, Academic ${Math.round(breakdown.academic_component)}, Engagement ${Math.round(breakdown.engagement_component)}, Placement ${Math.round(breakdown.placement_component)}.`}
    >
      {cfg.labels === "html" && <HtmlLabels breakdown={breakdown} />}

      {/* Centered glass disc + radar */}
      <div
        className={cn(
          "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full",
          cfg.glass && "glass-strong",
        )}
        style={{ width: cfg.disc, height: cfg.disc }}
      >
        <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full overflow-visible">
          {/* Grid diamonds — omitted on the tiny thumbnail to stay legible */}
          {!isSm &&
            GRID_LEVELS.map((lvl, i) => (
              <polygon
                key={i}
                points={polygonPoints(AXES.map(() => lvl))}
                fill="none"
                stroke="var(--azure-200)"
                strokeWidth={0.8}
                opacity={0.7}
              />
            ))}

          {/* Spokes */}
          {!isSm &&
            AXES.map((ax, i) => {
              const tip = polar(1, ax.cos, ax.sin);
              return (
                <motion.line
                  key={ax.key}
                  x1={C}
                  y1={C}
                  x2={tip.x}
                  y2={tip.y}
                  stroke="var(--azure-200)"
                  strokeWidth={0.8}
                  initial={animated ? { pathLength: 0, opacity: 0 } : false}
                  animate={animated ? { pathLength: 1, opacity: 1 } : undefined}
                  transition={{ delay: 0.15 + i * 0.16, duration: 0.5, ease: "easeOut" }}
                />
              );
            })}

          {/* Value polygon */}
          <motion.polygon
            points={polygonPoints(values01)}
            fill="var(--azure-500)"
            fillOpacity={isSm ? 0.3 : 0.22}
            stroke="var(--azure-500)"
            strokeWidth={isSm ? 3 : 1.6}
            strokeLinejoin="round"
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
            initial={animated ? { scale: 0.2, opacity: 0 } : false}
            animate={animated ? { scale: 1, opacity: 1 } : undefined}
            transition={{ delay: 0.15 + AXES.length * 0.16, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />

          {/* Vertex dots */}
          {size !== "sm" &&
            AXES.map((ax, i) => {
              const p = polar(values01[i], ax.cos, ax.sin);
              return <circle key={ax.key} cx={p.x} cy={p.y} r={1.8} fill="var(--azure-500)" />;
            })}

          {/* Risk ring */}
          <motion.circle
            cx={C}
            cy={C}
            r={R_RING}
            fill="none"
            stroke={risk.hex}
            strokeWidth={cfg.ring}
            strokeLinecap="round"
            initial={animated ? { pathLength: 0, opacity: 0 } : false}
            animate={animated ? { pathLength: 1, opacity: 1 } : undefined}
            transition={{ delay: 0.15 + AXES.length * 0.16 + 0.45, duration: 0.8, ease: "easeInOut" }}
          />

          {/* SVG short labels (md) */}
          {cfg.labels === "svg" &&
            AXES.map((ax) => {
              const p = polar((R_RING - 16) / R_PLOT, ax.cos, ax.sin);
              return (
                <text
                  key={ax.key}
                  x={p.x}
                  y={p.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-ink-soft"
                  style={{ fontSize: 9, fontWeight: 600 }}
                >
                  {ax.short}
                </text>
              );
            })}
        </svg>

        {/* Centered score */}
        {cfg.showScore && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center"
            initial={animated ? { opacity: 0 } : false}
            animate={animated ? { opacity: 1 } : undefined}
            transition={{ delay: 0.15 + AXES.length * 0.16 + 0.2, duration: 0.5 }}
          >
            <span className={cn("text-ink", cfg.scoreClass)}>{Math.round(displayed)}</span>
            <span
              className="mt-1 text-caption font-medium uppercase tracking-wide"
              style={{ color: risk.hex }}
            >
              {risk.label}
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function HtmlLabels({ breakdown }: { breakdown: ScoreBreakdown }) {
  const pos: Record<string, string> = {
    attendance: "left-1/2 top-0 -translate-x-1/2 text-center",
    academic: "right-0 top-1/2 -translate-y-1/2 text-right",
    engagement: "left-1/2 bottom-0 -translate-x-1/2 text-center",
    placement: "left-0 top-1/2 -translate-y-1/2 text-left",
  };
  return (
    <>
      {COMPONENT_META.map((m) => (
        <div key={m.key} className={cn("absolute w-24", pos[m.key])}>
          <div className="text-caption font-medium text-ink">{m.label}</div>
          <div className="font-mono tnum text-[15px] font-semibold text-azure-600">
            {Math.round(componentValue(breakdown, m.key))}
          </div>
        </div>
      ))}
    </>
  );
}
