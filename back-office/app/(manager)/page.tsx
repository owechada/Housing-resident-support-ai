import Link from "next/link";

import { QueueFilterBar } from "@/components/queue-filter-bar";
import { TicketRow } from "@/components/ticket-row";
import { requireManager } from "@/lib/auth";
import { estateTimeZone } from "@/lib/config";
import { STATUS_LABELS, URGENCY_LABELS } from "@/lib/labels";
import {
  QUEUE_LIMIT,
  fetchQueue,
  hasActiveFilters,
  parseQueueFilters,
  type QueueFilters,
  type SearchParams,
} from "@/lib/queue";

export const metadata = {
  title: "Ticket queue",
};

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { supabase } = await requireManager();
  const filters = parseQueueFilters(await searchParams);
  const tickets = await fetchQueue(supabase, filters);
  const timeZone = estateTimeZone();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">
      <h1 className="text-xl font-semibold tracking-tight">Ticket queue</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Newest first. Tap a ticket to see the full report and act on it.
      </p>

      <div className="mt-5">
        <QueueFilterBar filters={filters} />
      </div>

      {tickets.length > 0 ? (
        <>
          <p className="mt-6 text-sm text-muted-foreground" aria-live="polite">
            {tickets.length === 1 ? "1 ticket" : `${tickets.length} tickets`}
            {hasActiveFilters(filters) ? " matching these filters" : ""}
          </p>

          <ul className="mt-2 overflow-hidden rounded-lg border">
            {tickets.map((ticket) => (
              <TicketRow
                key={ticket.reference}
                ticket={ticket}
                timeZone={timeZone}
              />
            ))}
          </ul>

          {tickets.length === QUEUE_LIMIT ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Showing the {QUEUE_LIMIT} newest. Use the filters to find older
              ones.
            </p>
          ) : null}
        </>
      ) : (
        <EmptyState filters={filters} />
      )}
    </div>
  );
}

/** Empty states say what to do next. "No results" tells a manager nothing. */
function EmptyState({ filters }: { filters: QueueFilters }) {
  if (hasActiveFilters(filters)) {
    const active = [
      filters.attention ? "needs attention" : null,
      filters.status ? `status ${STATUS_LABELS[filters.status]}` : null,
      filters.urgency ? `urgency ${URGENCY_LABELS[filters.urgency]}` : null,
    ].filter(Boolean);

    return (
      <div className="mt-6 rounded-lg border border-dashed px-4 py-10 text-center">
        <p className="font-medium">Nothing matches what you asked for</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          You are filtering by {active.join(" and ")}. Widen it, or clear the
          filters to see the whole queue.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm font-medium underline underline-offset-4"
        >
          Show all tickets
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-lg border border-dashed px-4 py-10 text-center">
      <p className="font-medium">No tickets yet</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Tickets appear here on their own, as soon as a resident finishes
        reporting a problem to the assistant on WhatsApp, Telegram or web chat.
        There is nothing to do until one arrives.
      </p>
    </div>
  );
}
