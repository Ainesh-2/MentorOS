import { Fragment, useMemo, useState } from "react";
import {
  CalendarPlus,
  ChevronDown,
  ClipboardCheck,
  Search,
  Users,
} from "lucide-react";
import type { RiskCategory, RosterEntry } from "@/types";
import { RISK_META } from "@/lib/score";
import { Avatar, Badge, Button, EmptyState, RiskBadge } from "@/components/primitives";
import { SignalDisc } from "@/components/SignalDisc";
import { cn, formatDate, daysAgoLabel } from "@/lib/utils";

type SortKey = "name" | "score" | "attendance" | "risk";
type RiskFilter = "all" | RiskCategory;

const RISK_RANK: Record<RiskCategory, number> = { coral: 0, amber: 1, green: 2 };

export function RosterTable({
  rows,
  onSchedule,
  onLog,
}: {
  rows: RosterEntry[];
  onSchedule: (entry: RosterEntry) => void;
  onLog: (entry: RosterEntry) => void;
}) {
  const [query, setQuery] = useState("");
  const [risk, setRisk] = useState<RiskFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [expanded, setExpanded] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<RiskFilter, number> = { all: rows.length, green: 0, amber: 0, coral: 0 };
    for (const r of rows) c[r.student.score.risk_category]++;
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows.filter((r) => {
      if (risk !== "all" && r.student.score.risk_category !== risk) return false;
      if (!q) return true;
      return (
        r.student.name.toLowerCase().includes(q) ||
        r.student.roll_no.toLowerCase().includes(q)
      );
    });
    out = [...out].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.student.name.localeCompare(b.student.name);
          break;
        case "score":
          cmp = a.student.score.total_score - b.student.score.total_score;
          break;
        case "attendance":
          cmp = a.student.signals.attendance_pct - b.student.signals.attendance_pct;
          break;
        case "risk":
          cmp = RISK_RANK[a.student.score.risk_category] - RISK_RANK[b.student.score.risk_category];
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return out;
  }, [rows, query, risk, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : key === "score" ? "asc" : "desc");
    }
  }

  const SortHeader = ({ label, k, className }: { label: string; k: SortKey; className?: string }) => (
    <th className={cn("px-3 py-2.5 text-left", className)}>
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className={cn(
          "inline-flex items-center gap-1 text-caption font-semibold uppercase tracking-wide transition-colors",
          sortKey === k ? "text-ink" : "text-ink-soft hover:text-ink",
        )}
      >
        {label}
        <ChevronDown
          size={13}
          className={cn(
            "transition-transform",
            sortKey === k ? "opacity-100" : "opacity-30",
            sortKey === k && sortDir === "asc" && "rotate-180",
          )}
        />
      </button>
    </th>
  );

  const FILTERS: Array<{ key: RiskFilter; label: string }> = [
    { key: "all", label: "All" },
    { key: "coral", label: RISK_META.coral.label },
    { key: "amber", label: RISK_META.amber.label },
    { key: "green", label: RISK_META.green.label },
  ];

  return (
    <div className="glass-quiet overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-ink/8 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-72">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or roll number"
            aria-label="Search roster"
            className="h-10 w-full rounded-sm border border-ink/8 bg-white/70 pl-9 pr-3 text-body text-ink placeholder:text-ink-soft/60 focus:border-azure-500 focus:outline-none focus:ring-2 focus:ring-azure-200"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setRisk(f.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-caption transition-colors",
                risk === f.key
                  ? "border-azure-500 bg-azure-200/60 font-medium text-azure-600"
                  : "border-ink/8 bg-white/60 text-ink-soft hover:text-ink",
              )}
            >
              {f.key !== "all" && (
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: RISK_META[f.key].hex }}
                />
              )}
              {f.label}
              <span className="font-mono tnum text-[11px] opacity-70">{counts[f.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Users size={22} />}
          title="No students match your filters"
          body="Try clearing the search or switching the risk filter."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse">
            <thead>
              <tr className="border-b border-ink/8 bg-white/30">
                <th className="w-8" />
                <SortHeader label="Student" k="name" />
                <th className="px-3 py-2.5 text-center text-caption font-semibold uppercase tracking-wide text-ink-soft">
                  Signal
                </th>
                <SortHeader label="Score" k="score" />
                <SortHeader label="Status" k="risk" />
                <SortHeader label="Attend." k="attendance" className="hidden md:table-cell" />
                <th className="hidden px-3 py-2.5 text-left text-caption font-semibold uppercase tracking-wide text-ink-soft lg:table-cell">
                  Next meeting
                </th>
                <th className="px-3 py-2.5 text-right text-caption font-semibold uppercase tracking-wide text-ink-soft">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((entry) => {
                const s = entry.student;
                const isOpen = expanded === s.id;
                return (
                  <Fragment key={s.id}>
                    <tr
                      className={cn(
                        "border-b border-ink/8 transition-colors hover:bg-azure-200/20",
                        isOpen && "bg-azure-200/20",
                      )}
                    >
                      <td className="pl-3">
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpen ? null : s.id)}
                          aria-label={isOpen ? "Collapse row" : "Expand row"}
                          aria-expanded={isOpen}
                          className="rounded-sm p-1 text-ink-soft hover:bg-ink/4"
                        >
                          <ChevronDown size={16} className={cn("transition-transform", isOpen && "rotate-180")} />
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={s.name} hue={s.avatar_hue} size="sm" />
                          <div className="min-w-0">
                            <div className="truncate text-body font-medium text-ink">{s.name}</div>
                            <div className="font-mono tnum text-[11px] text-ink-soft">
                              {s.roll_no} · Sem {s.semester}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-center">
                          <SignalDisc breakdown={s.score} size="sm" countUp={false} />
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-mono tnum text-[18px] font-semibold text-ink">
                          {Math.round(s.score.total_score)}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <RiskBadge category={s.score.risk_category} />
                      </td>
                      <td className="hidden px-3 py-3 md:table-cell">
                        <span className="font-mono tnum text-body text-ink">
                          {Math.round(s.signals.attendance_pct)}%
                        </span>
                      </td>
                      <td className="hidden px-3 py-3 lg:table-cell">
                        {entry.next_meeting ? (
                          <span className="text-caption text-ink">
                            {formatDate(entry.next_meeting.scheduled_for)}
                          </span>
                        ) : (
                          <span className="text-caption text-ink-soft">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onSchedule(entry)}
                            iconLeft={<CalendarPlus size={15} />}
                          >
                            <span className="hidden sm:inline">Schedule</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => onLog(entry)}
                            iconLeft={<ClipboardCheck size={15} />}
                          >
                            <span className="hidden sm:inline">Log</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {isOpen && <DetailRow entry={entry} />}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DetailRow({ entry }: { entry: RosterEntry }) {
  const last = entry.last_meeting;
  return (
    <tr className="border-b border-ink/8 bg-white/40">
      <td />
      <td colSpan={7} className="px-3 py-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="mb-1 text-caption font-semibold uppercase tracking-wide text-ink-soft">
              Components
            </p>
            <ul className="space-y-0.5 text-caption text-ink">
              <li className="flex justify-between"><span>Attendance</span><span className="font-mono tnum">{Math.round(entry.student.score.attendance_component)}</span></li>
              <li className="flex justify-between"><span>Academic</span><span className="font-mono tnum">{Math.round(entry.student.score.academic_component)}</span></li>
              <li className="flex justify-between"><span>Engagement</span><span className="font-mono tnum">{Math.round(entry.student.score.engagement_component)}</span></li>
              <li className="flex justify-between"><span>Placement</span><span className="font-mono tnum">{Math.round(entry.student.score.placement_component)}</span></li>
            </ul>
          </div>
          <div className="sm:col-span-2">
            <p className="mb-1 text-caption font-semibold uppercase tracking-wide text-ink-soft">
              Last meeting
            </p>
            {last?.log ? (
              <div className="text-caption text-ink">
                <p className="text-ink-soft">{daysAgoLabel(last.scheduled_for)}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {last.log.topics.map((t) => (
                    <Badge key={t} tone="azure">{t}</Badge>
                  ))}
                </div>
                {entry.open_action_items > 0 && (
                  <p className="mt-2 text-signal-amber">
                    {entry.open_action_items} open action item{entry.open_action_items > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-caption text-ink-soft">
                No meetings logged yet — schedule the first one to start a record.
              </p>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}
