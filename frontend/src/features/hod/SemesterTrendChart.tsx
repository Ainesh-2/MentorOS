import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ScorePoint } from "@/types";

/** Department average Success Score across the last five terms. */
export function SemesterTrendChart({ trend }: { trend: ScorePoint[] }) {
  return (
    <div style={{ width: "100%", height: 240 }}>
      <ResponsiveContainer>
        <AreaChart data={trend} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--azure-500)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--azure-500)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(17,32,59,0.06)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: "var(--ink-soft)" }}
            axisLine={{ stroke: "rgba(17,32,59,0.12)" }}
            tickLine={false}
          />
          <YAxis
            domain={[40, 80]}
            tick={{ fontSize: 11, fill: "var(--ink-soft)", fontFamily: "JetBrains Mono" }}
            axisLine={false}
            tickLine={false}
          />
          {/* Risk-band reference lines for context */}
          <ReferenceLine y={70} stroke="var(--signal-green)" strokeDasharray="4 4" strokeOpacity={0.5} />
          <ReferenceLine y={50} stroke="var(--signal-coral)" strokeDasharray="4 4" strokeOpacity={0.5} />
          <Tooltip content={<TrendTooltip />} />
          <Area
            type="monotone"
            dataKey="total_score"
            stroke="var(--azure-500)"
            strokeWidth={2.5}
            fill="url(#trendFill)"
            dot={{ r: 3.5, fill: "var(--azure-500)", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "var(--azure-600)" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface TrendPayload {
  payload: ScorePoint;
}

function TrendTooltip({ active, payload }: { active?: boolean; payload?: TrendPayload[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="glass-quiet px-3 py-2 text-caption shadow-glass-quiet">
      <p className="font-medium text-ink">{d.label}</p>
      <p className="text-ink-soft">
        Avg score <span className="font-mono tnum text-ink">{d.total_score}</span>
      </p>
    </div>
  );
}
