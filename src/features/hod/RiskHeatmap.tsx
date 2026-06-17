import type { RiskCategory, SemesterRisk } from "@/types";
import { RISK_META } from "@/lib/score";

/**
 * Department risk heatmap — semesters (rows) × risk band (columns). Cell shade
 * scales with the count, so dense pockets of risk are obvious at a glance.
 */

const BANDS: RiskCategory[] = ["green", "amber", "coral"];

export function RiskHeatmap({ data }: { data: SemesterRisk[] }) {
  const max = Math.max(1, ...data.flatMap((r) => BANDS.map((b) => r[b])));

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-separate border-spacing-1.5">
        <thead>
          <tr>
            <th className="px-2 py-1 text-left text-caption font-semibold uppercase tracking-wide text-ink-soft">
              Semester
            </th>
            {BANDS.map((b) => (
              <th
                key={b}
                className="px-2 py-1 text-center text-caption font-semibold uppercase tracking-wide"
                style={{ color: RISK_META[b].hex }}
              >
                {RISK_META[b].label}
              </th>
            ))}
            <th className="px-2 py-1 text-center text-caption font-semibold uppercase tracking-wide text-ink-soft">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const total = BANDS.reduce((sum, b) => sum + row[b], 0);
            return (
              <tr key={row.semester}>
                <td className="px-2 text-body font-medium text-ink">Sem {row.semester}</td>
                {BANDS.map((b) => {
                  const count = row[b];
                  const intensity = count === 0 ? 0 : 0.16 + 0.84 * (count / max);
                  return (
                    <td key={b} className="p-0">
                      <div
                        className="flex h-12 items-center justify-center rounded-md font-mono tnum text-body font-semibold transition-transform hover:scale-[1.03]"
                        style={{
                          background:
                            count === 0
                              ? "rgb(var(--ink-rgb) / 0.03)"
                              : `color-mix(in srgb, ${RISK_META[b].hex} ${Math.round(
                                  intensity * 100,
                                )}%, white)`,
                          color: intensity > 0.55 ? "white" : "var(--ink)",
                        }}
                        title={`Sem ${row.semester} · ${RISK_META[b].label}: ${count} student${count === 1 ? "" : "s"}`}
                      >
                        {count}
                      </div>
                    </td>
                  );
                })}
                <td className="px-2 text-center font-mono tnum text-body text-ink-soft">{total}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
