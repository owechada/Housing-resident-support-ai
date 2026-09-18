import Image from "next/image";
import Link from "next/link";
import { ImageOffIcon } from "lucide-react";

import { StatusBadge, UrgencyBadge } from "@/components/ticket-badges";
import { attentionReason, type AttentionReason } from "@/lib/attention";
import { CATEGORY_LABELS, absoluteTime, relativeAge } from "@/lib/labels";
import type { QueueTicket } from "@/lib/queue";
import { cn } from "@/lib/utils";

const ATTENTION_ACCENTS: Record<AttentionReason, string> = {
  emergency: "border-l-red-600 bg-red-50/60",
  review: "border-l-amber-500 bg-amber-50/50",
  reopened: "border-l-violet-500 bg-violet-50/50",
};

/**
 * The accent stripe is the thing a manager reads first while scanning, so it
 * carries urgency before status: an emergency stays red even once someone has
 * started on it.
 */
function accentFor(ticket: QueueTicket): string {
  const reason = attentionReason(ticket);
  if (reason) return ATTENTION_ACCENTS[reason];
  if (ticket.status === "closed" || ticket.status === "cancelled") {
    return "border-l-transparent";
  }
  return "border-l-sky-400";
}

export function TicketRow({
  ticket,
  timeZone,
}: {
  ticket: QueueTicket;
  timeZone: string;
}) {
  const unitLabel = ticket.units.label;
  const settled = ticket.status === "closed" || ticket.status === "cancelled";

  return (
    <li>
      <Link
        href={`/tickets/${ticket.reference}`}
        className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <article
          className={cn(
            "flex gap-3 border-b border-l-4 px-3 py-3 transition-colors hover:bg-muted/60 sm:px-4",
            accentFor(ticket),
            settled && "opacity-70",
          )}
        >
          <Thumbnail ticket={ticket} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-mono text-sm font-medium">
                {ticket.reference}
              </span>
              <UrgencyBadge urgency={ticket.urgency} />
              <StatusBadge status={ticket.status} />
            </div>

            <p className="mt-1.5 truncate font-medium">{unitLabel}</p>

            <p className="mt-0.5 text-sm text-muted-foreground">
              {CATEGORY_LABELS[ticket.category]}
              {" · "}
              <time
                dateTime={ticket.created_at}
                title={absoluteTime(ticket.created_at, timeZone)}
              >
                {relativeAge(ticket.created_at)}
              </time>
            </p>

            {ticket.status === "needs_review" && ticket.review_reason ? (
              <p className="mt-2 text-sm text-amber-900">
                Needs a look: {ticket.review_reason}
              </p>
            ) : null}
          </div>
        </article>
      </Link>
    </li>
  );
}

/**
 * A fixed slot either way, so "which of these has evidence?" is answerable by
 * running an eye down the column instead of reading every row.
 */
function Thumbnail({ ticket }: { ticket: QueueTicket }) {
  if (ticket.photo_url) {
    return (
      <Image
        src={ticket.photo_url}
        alt="Photo from the resident"
        width={56}
        height={56}
        className="size-14 shrink-0 rounded-md border object-cover"
      />
    );
  }

  return (
    <div
      className="flex size-14 shrink-0 items-center justify-center rounded-md border border-dashed text-muted-foreground"
      aria-hidden="true"
    >
      <ImageOffIcon className="size-4" />
      <span className="sr-only">No photo</span>
    </div>
  );
}
