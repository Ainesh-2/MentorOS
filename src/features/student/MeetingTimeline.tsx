import {
  CalendarClock,
  CheckCircle2,
  Circle,
  MapPin,
  Phone,
  Video,
} from "lucide-react";
import type { Meeting } from "@/types";
import { Badge, EmptyState } from "@/components/primitives";
import { formatDate, formatTime, daysAgoLabel } from "@/lib/utils";

const MODE_ICON = {
  video: Video,
  phone: Phone,
  "in-person": MapPin,
} as const;

export function MeetingTimeline({ meetings }: { meetings: Meeting[] }) {
  if (meetings.length === 0) {
    return (
      <EmptyState
        icon={<CalendarClock size={22} />}
        title="No meetings logged yet"
        body="When you meet your mentor, the notes and action items will appear here as a running history."
      />
    );
  }

  return (
    <ol className="relative flex flex-col">
      {meetings.map((m, i) => {
        const isLast = i === meetings.length - 1;
        const scheduled = m.status === "scheduled";
        const ModeIcon = MODE_ICON[m.mode];
        return (
          <li key={m.id} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Spine */}
            {!isLast && (
              <span className="absolute left-[11px] top-7 h-full w-px bg-ink/8" aria-hidden />
            )}
            {/* Node */}
            <span
              className={`relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                scheduled
                  ? "border-azure-500 bg-snow"
                  : "border-signal-green bg-[rgba(47,143,107,0.12)]"
              }`}
            >
              {scheduled ? (
                <CalendarClock size={12} className="text-azure-500" />
              ) : (
                <CheckCircle2 size={13} className="text-signal-green" />
              )}
            </span>

            {/* Body */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono tnum text-caption font-medium text-ink">
                  {formatDate(m.scheduled_for)} · {formatTime(m.scheduled_for)}
                </span>
                {scheduled ? (
                  <Badge tone="azure" dot>Upcoming</Badge>
                ) : (
                  <span className="text-caption text-ink-soft">{daysAgoLabel(m.scheduled_for)}</span>
                )}
                <span className="inline-flex items-center gap-1 text-caption capitalize text-ink-soft">
                  <ModeIcon size={13} /> {m.mode}
                </span>
              </div>

              {m.log ? (
                <div className="mt-2">
                  <div className="flex flex-wrap gap-1.5">
                    {m.log.topics.map((t) => (
                      <Badge key={t} tone="azure">{t}</Badge>
                    ))}
                  </div>
                  {m.log.summary && (
                    <p className="mt-2 text-caption text-ink-soft">{m.log.summary}</p>
                  )}
                  {m.log.action_items.length > 0 && (
                    <ul className="mt-2.5 space-y-1.5">
                      {m.log.action_items.map((a) => (
                        <li key={a.id} className="flex items-start gap-2 text-caption">
                          {a.done ? (
                            <CheckCircle2 size={15} className="mt-px shrink-0 text-signal-green" />
                          ) : (
                            <Circle size={15} className="mt-px shrink-0 text-ink-soft/50" />
                          )}
                          <span className={a.done ? "text-ink-soft line-through" : "text-ink"}>
                            {a.text}
                          </span>
                          <span className="ml-auto shrink-0 rounded-full bg-ink/4 px-2 py-0.5 text-[11px] capitalize text-ink-soft">
                            {a.owner}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {m.log.next_meeting_date && (
                    <p className="mt-2 text-caption text-ink-soft">
                      Follow-up set for{" "}
                      <span className="font-mono tnum text-ink">
                        {formatDate(m.log.next_meeting_date)}
                      </span>
                      .
                    </p>
                  )}
                </div>
              ) : (
                scheduled && (
                  <p className="mt-1.5 text-caption text-ink-soft">
                    Your mentor will confirm the final time. Notes will appear here afterwards.
                  </p>
                )
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
