import { STATUS_LABELS, STATUS_ICONS, type PackageStatus } from "./StatusBadge";
import { formatDateTime } from "@/lib/formatDateTime";

interface StatusEvent {
  id: string;
  toStatus: PackageStatus;
  changedAt: string | Date;
}

export function StatusHistoryTimeline({ events }: { events: StatusEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-slate-400">No status updates recorded yet.</p>
    );
  }

  return (
    <ol className="space-y-0">
      {events.map((event, i) => {
        const isLast = i === events.length - 1;
        const isLatest = i === 0;
        return (
          <li key={event.id} className="relative flex gap-3 pb-6 last:pb-0">
            {!isLast && (
              <span className="absolute left-[11px] top-6 h-full w-px bg-slate-200" />
            )}
            <span
              className={`z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white ${
                isLatest ? "bg-teal-600" : "bg-slate-300"
              }`}
            >
              {STATUS_ICONS[event.toStatus]}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-medium text-slate-900">
                {STATUS_LABELS[event.toStatus]}
              </p>
              <p className="text-xs text-slate-400">{formatDateTime(event.changedAt)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
