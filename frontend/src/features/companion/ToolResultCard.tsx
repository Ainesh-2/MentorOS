import { CalendarCheck, Gauge, Video } from "lucide-react";
import type { ToolResult } from "@/api/companion";
import { RISK_META } from "@/lib/score";
import { RiskBadge } from "@/components/primitives";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { formatDate, formatTime } from "@/lib/utils";

/**
 * Renders a Companion tool-call result distinctly from a plain text reply, so
 * the UI already speaks the tool-use shape a real model would emit
 * (get_my_score, schedule_meeting). See @/api/companion.
 */
export function ToolResultCard({ result }: { result: ToolResult }) {
  if (result.tool === "get_my_score") {
    const risk = RISK_META[result.breakdown.risk_category];
    return (
      <div className="mt-2 rounded-md border border-azure-200 bg-white/70 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-caption font-medium text-azure-600">
            <Gauge size={14} /> Success Score
          </span>
          <div className="flex items-center gap-2">
            <span className="font-mono tnum text-[20px] font-semibold text-ink">
              {Math.round(result.breakdown.total_score)}
            </span>
            <RiskBadge category={result.breakdown.risk_category} showDot={false} />
          </div>
        </div>
        <ScoreBreakdown breakdown={result.breakdown} compact />
        <p className="mt-2 text-[11px]" style={{ color: risk.hex }}>
          {risk.blurb}
        </p>
      </div>
    );
  }

  // schedule_meeting
  return (
    <div className="mt-2 rounded-md border border-azure-200 bg-white/70 p-3">
      <span className="flex items-center gap-1.5 text-caption font-medium text-azure-600">
        <CalendarCheck size={14} /> Meeting requested
      </span>
      <div className="mt-2 flex items-center gap-2 text-caption text-ink">
        <span className="font-mono tnum">
          {formatDate(result.scheduled_for)} · {formatTime(result.scheduled_for)}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-azure-200/50 px-2 py-0.5 text-[11px] capitalize text-azure-600">
          {result.mode === "video" && <Video size={11} />}
          {result.mode}
        </span>
      </div>
      <p className="mt-1.5 text-[11px] text-ink-soft">
        Sent to {result.mentorName}. They'll confirm the final time.
      </p>
    </div>
  );
}
