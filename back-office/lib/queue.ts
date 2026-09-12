import {
  TICKET_STATUSES,
  TICKET_URGENCIES,
  type TicketCategory,
  type TicketStatus,
  type TicketUrgency,
  type PhotoStatus,
} from "@/lib/database.types";
import type { createClient } from "@/lib/supabase/server";

/**
 * How many tickets the queue loads. One estate, so this is generous — but an
 * unbounded query is a slow page waiting to happen. The page says so when it
 * hits the cap rather than silently truncating.
 */
export const QUEUE_LIMIT = 100;

const QUEUE_SELECT =
  "reference, category, urgency, status, created_at, photo_url, photo_status, review_reason, units(label)";

export type QueueTicket = {
  reference: string;
  category: TicketCategory;
  urgency: TicketUrgency;
  status: TicketStatus;
  created_at: string;
  photo_url: string | null;
  photo_status: PhotoStatus;
  review_reason: string | null;
  units: { label: string };
};

export type QueueFilters = {
  status: TicketStatus | null;
  urgency: TicketUrgency | null;
  /** Emergency, needs review, or reopened — the things that cannot wait. */
  attention: boolean;
};

export const EMPTY_FILTERS: QueueFilters = {
  status: null,
  urgency: null,
  attention: false,
};

export type SearchParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Filters live in the URL so a manager can bookmark "everything that needs
 * attention" and share it. Anything unrecognised is dropped rather than
 * trusted — these values go into a database query.
 */
export function parseQueueFilters(searchParams: SearchParams): QueueFilters {
  const status = one(searchParams.status);
  const urgency = one(searchParams.urgency);

  return {
    status: TICKET_STATUSES.includes(status as TicketStatus)
      ? (status as TicketStatus)
      : null,
    urgency: TICKET_URGENCIES.includes(urgency as TicketUrgency)
      ? (urgency as TicketUrgency)
      : null,
    attention: one(searchParams.attention) === "1",
  };
}

export function hasActiveFilters(filters: QueueFilters): boolean {
  return Boolean(filters.status || filters.urgency || filters.attention);
}

/** Rebuilds the query string, dropping anything at its default. */
export function filtersToQuery(filters: QueueFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.urgency) params.set("urgency", filters.urgency);
  if (filters.attention) params.set("attention", "1");

  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function fetchQueue(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filters: QueueFilters,
): Promise<QueueTicket[]> {
  let query = supabase
    .from("tickets")
    .select(QUEUE_SELECT)
    .order("created_at", { ascending: false })
    .limit(QUEUE_LIMIT);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.urgency) query = query.eq("urgency", filters.urgency);
  if (filters.attention) {
    query = query.or(
      "urgency.eq.emergency,status.eq.needs_review,status.eq.reopened",
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `Could not load the ticket queue: ${error.message}. If this says ` +
        `permission denied, db/rls.sql has not been run on this project.`,
    );
  }

  return data ?? [];
}

/**
 * Rows the manager should not have to hunt for. Kept in one place so the queue
 * highlight and the "needs attention" filter cannot drift apart.
 */
export function needsAttention(ticket: QueueTicket): boolean {
  return (
    ticket.urgency === "emergency" ||
    ticket.status === "needs_review" ||
    ticket.status === "reopened"
  );
}
