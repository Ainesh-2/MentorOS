import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MentorLoad } from "@/types";
import { RISK_META } from "@/lib/score";

/** Stacked horizontal bars — each mentor's mentees split by risk band. */
export function MentorWorkloadChart({ loads }: { loads: MentorLoad[] }) {
  const data = loads.map((l) => ({
    name: l.mentor.name.replace(/^(Dr\.|Prof\.)\s/, ""),
    coral: l.risk_counts.coral,
    amber: l.risk_counts.amber,
    green: l.risk_counts.green,
    avg: l.avg_score,
    mentees: l.mentee_count,
  }));

  return (
    <div style={{ width: "100%", height: 56 + data.length * 48 }}>
      <ResponsiveContainer>
        <BarChart layout="vertical" data={data} margin={{ top: 4, right: 16, bottom: 4, left: 8 }} barCategoryGap={14}>
          <CartesianGrid horizontal={false} stroke="rgba(17,32,59,0.06)" />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "var(--ink-soft)", fontFamily: "JetBrains Mono" }}
            axisLine={{ stroke: "rgba(17,32,59,0.12)" }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={{ fontSize: 12, fill: "var(--ink)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip cursor={{ fill: "rgba(45,111,224,0.06)" }} content={<WorkloadTooltip />} />
          <Bar dataKey="coral" stackId="a" fill={RISK_META.coral.hex} radius={[4, 0, 0, 4]} maxBarSize={26}>
            {data.map((_, i) => (
              <Cell key={i} />
            ))}
          </Bar>
          <Bar dataKey="amber" stackId="a" fill={RISK_META.amber.hex} maxBarSize={26} />
          <Bar dataKey="green" stackId="a" fill={RISK_META.green.hex} radius={[0, 4, 4, 0]} maxBarSize={26} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface TooltipPayload {
  payload: { name: string; coral: number; amber: number; green: number; avg: number; mentees: number };
}

function WorkloadTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="glass-quiet px-3 py-2 text-caption shadow-glass-quiet">
      <p className="mb-1 font-medium text-ink">{d.name}</p>
      <p className="text-ink-soft">
        <span className="font-mono tnum text-ink">{d.mentees}</span> mentees · avg{" "}
        <span className="font-mono tnum text-ink">{d.avg}</span>
      </p>
      <ul className="mt-1 space-y-0.5">
        <li className="flex items-center gap-1.5" style={{ color: RISK_META.coral.hex }}>
          <Dot c={RISK_META.coral.hex} /> At risk <b className="font-mono tnum ml-auto">{d.coral}</b>
        </li>
        <li className="flex items-center gap-1.5" style={{ color: RISK_META.amber.hex }}>
          <Dot c={RISK_META.amber.hex} /> Monitor <b className="font-mono tnum ml-auto">{d.amber}</b>
        </li>
        <li className="flex items-center gap-1.5" style={{ color: RISK_META.green.hex }}>
          <Dot c={RISK_META.green.hex} /> On track <b className="font-mono tnum ml-auto">{d.green}</b>
        </li>
      </ul>
    </div>
  );
}

const Dot = ({ c }: { c: string }) => (
  <span className="inline-block h-2 w-2 rounded-full" style={{ background: c }} />
);
