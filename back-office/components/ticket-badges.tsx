import { TriangleAlertIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { TicketStatus, TicketUrgency } from "@/lib/database.types";
import { STATUS_LABELS, URGENCY_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

/**
 * Emergencies get solid red and an icon rather than a tint, because the brief
 * for this queue is that they must be impossible to miss. Normal and low are
 * deliberately quiet — if everything shouts, nothing does.
 */
export function UrgencyBadge({ urgency }: { urgency: TicketUrgency }) {
  if (urgency === "emergency") {
    return (
      <Badge className="h-6 gap-1 border-red-700 bg-red-600 px-2 text-white">
        <TriangleAlertIcon aria-hidden="true" />
        {URGENCY_LABELS.emergency}
      </Badge>
    );
  }

  if (urgency === "high") {
    return (
      <Badge
        variant="outline"
        className="border-orange-400 bg-orange-50 text-orange-900"
      >
        {URGENCY_LABELS.high}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-muted-foreground">
      {URGENCY_LABELS[urgency]}
    </Badge>
  );
}

const STATUS_STYLES: Record<TicketStatus, string> = {
  // The agent was not confident. A human has to look, so it cannot read like "open".
  needs_review: "border-amber-400 bg-amber-100 text-amber-900",
  // The resident disputed a resolution. Also unfinished work.
  reopened: "border-violet-400 bg-violet-100 text-violet-900",
  open: "border-sky-400 bg-sky-50 text-sky-900",
  acknowledged: "border-sky-300 bg-sky-50 text-sky-900",
  assigned: "border-sky-300 bg-sky-50 text-sky-900",
  in_progress: "border-sky-400 bg-sky-100 text-sky-900",
  resolved: "border-emerald-400 bg-emerald-50 text-emerald-900",
  closed: "border-border bg-muted text-muted-foreground",
  cancelled: "border-border bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge variant="outline" className={cn(STATUS_STYLES[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
