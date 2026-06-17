import { useMemo } from "react";
import { cn } from "@/lib/utils";

/**
 * Two fixed layers behind all content (Section 1.5):
 *   1. Mesh blobs — large, heavily blurred azure/snow-deep shapes drifting slowly.
 *   2. Network pattern — a faint graph of mentor↔student relationships, abstracted,
 *      not a generic dot-grid.
 *
 * On dashboards the whole thing is dialed back so data wins; on the landing
 * page it runs at full strength.
 */

interface Node {
  x: number;
  y: number;
  r: number;
}

/** Deterministic pseudo-random graph so the texture is stable across renders. */
function buildGraph(seed: number, count: number) {
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  const nodes: Node[] = Array.from({ length: count }, () => ({
    x: rand() * 100,
    y: rand() * 100,
    r: 0.18 + rand() * 0.32,
  }));
  const edges: Array<[number, number]> = [];
  for (let i = 0; i < nodes.length; i++) {
    // Connect each node to its 1–2 nearest neighbours for a relationship-graph feel.
    const dists = nodes
      .map((n, j) => ({ j, d: Math.hypot(n.x - nodes[i].x, n.y - nodes[i].y) }))
      .filter((o) => o.j !== i)
      .sort((a, b) => a.d - b.d);
    const links = 1 + Math.round(rand());
    for (let k = 0; k < links; k++) {
      const j = dists[k].j;
      if (j > i) edges.push([i, j]);
    }
  }
  return { nodes, edges };
}

function NetworkPattern({ opacity }: { opacity: number }) {
  const { nodes, edges } = useMemo(() => buildGraph(73, 34), []);
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      style={{ opacity }}
      aria-hidden
    >
      <g stroke="var(--ink)" strokeWidth={0.12} fill="none">
        {edges.map(([a, b], i) => (
          <line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y} />
        ))}
      </g>
      <g fill="var(--ink)">
        {nodes.map((n, i) => (
          <circle key={i} cx={n.x} cy={n.y} r={n.r} />
        ))}
      </g>
    </svg>
  );
}

export function Background({ variant = "landing" }: { variant?: "landing" | "app" }) {
  const isApp = variant === "app";
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-snow" aria-hidden>
      {/* Mesh blobs */}
      <div
        className={cn(
          "absolute -left-32 -top-40 h-[34rem] w-[34rem] rounded-full blur-[90px] animate-blob-drift",
          isApp ? "opacity-40" : "opacity-80",
        )}
        style={{ background: "radial-gradient(circle at 30% 30%, var(--azure-200), transparent 70%)" }}
      />
      <div
        className={cn(
          "absolute -right-40 top-1/4 h-[30rem] w-[30rem] rounded-full blur-[100px] animate-blob-drift",
          isApp ? "opacity-30" : "opacity-70",
        )}
        style={{
          background: "radial-gradient(circle at 60% 40%, var(--snow-deep), transparent 72%)",
          animationDelay: "-7s",
        }}
      />
      <div
        className={cn(
          "absolute -bottom-48 left-1/3 h-[28rem] w-[28rem] rounded-full blur-[110px] animate-blob-drift",
          isApp ? "opacity-25" : "opacity-60",
        )}
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(45,111,224,0.28), transparent 70%)",
          animationDelay: "-13s",
        }}
      />

      {/* Relationship-graph texture */}
      <NetworkPattern opacity={isApp ? 0.025 : 0.04} />
    </div>
  );
}
