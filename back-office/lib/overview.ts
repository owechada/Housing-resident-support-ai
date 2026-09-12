import type { TicketCategory, TicketStatus } from "@/lib/database.types";
import { missingFieldNames } from "@/lib/labels";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * Caps on what the summary reads. Aggregation happens in this process because
 * the estate is one estate and the row counts are small. If these caps start
 * being hit, move the arithmetic into a Postgres view rather than raising them —
 * a summary computed from a truncated sample would quietly lie.
 */
export const TICKET_SCAN_LIMIT = 2000;
export const EVENT_SCAN_LIMIT = 5000;

export type Rate = {
  /** null when there is nothing to divide by — shown as "not enough data yet". */
  value: number | null;
  numerator: number;
  denominator: number;
};

export type Overview = {
  truncated: boolean;
  totalTickets: number;
  openTickets: number;
  needsAttention: number;
  /** The headline: tickets the assistant captured completely. */
  fieldCompleteness: Rate;
  selfResolution: Rate;
  reopened: Rate;
  manualTouch: Rate;
  medianOpenAgeHours: number | null;
  statusCounts: { status: TicketStatus; count: number }[];
  missingFieldCounts: { field: string; count: number }[];
  overridesByCategory: {
    category: TicketCategory;
    tickets: number;
    overridden: number;
    rate: number;
  }[];
};

function rate(numerator: number, denominator: number): Rate {
  return {
    value: denominator === 0 ? null : numerator / denominator,
    numerator,
    denominator,
  };
}

export async function fetchOverview(supabase: Client): Promise<Overview> {
  const [tickets, events, selfResolutions] = await Promise.all([
    fetchTickets(supabase),
    fetchEvents(supabase),
    countSelfResolutions(supabase),
  ]);

  const total = tickets.length;

  // Which tickets a manager had to get involved with, and how.
  const touchedByManager = new Set<string>();
  const overriddenTickets = new Set<string>();
  const everReopened = new Set<string>();

  for (const event of events) {
    if (event.actor_type === "manager") {
      touchedByManager.add(event.ticket_reference);
    }
    if (event.event_type === "fields_edited") {
      overriddenTickets.add(event.ticket_reference);
    }
    if (event.event_type === "status_changed" && event.to === "reopened") {
      everReopened.add(event.ticket_reference);
    }
  }

  // A ticket sitting in `reopened` right now counts even if no event recorded it,
  // so a ticket reopened by some other path is not missed.
  for (const ticket of tickets) {
    if (ticket.status === "reopened") everReopened.add(ticket.reference);
  }

  const complete = tickets.filter(
    (ticket) => missingFieldNames(ticket.missing_fields).length === 0,
  ).length;

  const unsettled = tickets.filter(
    (ticket) => ticket.status !== "closed" && ticket.status !== "cancelled",
  );

  const statusCounts = new Map<TicketStatus, number>();
  const missingFieldCounts = new Map<string, number>();
  const byCategory = new Map<TicketCategory, { tickets: number; overridden: number }>();

  for (const ticket of tickets) {
    statusCounts.set(ticket.status, (statusCounts.get(ticket.status) ?? 0) + 1);

    for (const field of missingFieldNames(ticket.missing_fields)) {
      missingFieldCounts.set(field, (missingFieldCounts.get(field) ?? 0) + 1);
    }

    const entry = byCategory.get(ticket.category) ?? { tickets: 0, overridden: 0 };
    entry.tickets += 1;
    if (overriddenTickets.has(ticket.reference)) entry.overridden += 1;
    byCategory.set(ticket.category, entry);
  }

  const needsAttention = tickets.filter(
    (ticket) =>
      ticket.urgency === "emergency" ||
      ticket.status === "needs_review" ||
      ticket.status === "reopened",
  ).length;

  return {
    truncated: total >= TICKET_SCAN_LIMIT || events.length >= EVENT_SCAN_LIMIT,
    totalTickets: total,
    openTickets: unsettled.length,
    needsAttention,
    fieldCompleteness: rate(complete, total),
    selfResolution: rate(selfResolutions, selfResolutions + total),
    reopened: rate(everReopened.size, total),
    manualTouch: rate(touchedByManager.size, total),
    medianOpenAgeHours: medianAgeHours(unsettled.map((t) => t.created_at)),
    statusCounts: [...statusCounts.entries()]
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
    missingFieldCounts: [...missingFieldCounts.entries()]
      .map(([field, count]) => ({ field, count }))
      .sort((a, b) => b.count - a.count),
    overridesByCategory: [...byCategory.entries()]
      .map(([category, entry]) => ({
        category,
        tickets: entry.tickets,
        overridden: entry.overridden,
        rate: entry.tickets === 0 ? 0 : entry.overridden / entry.tickets,
      }))
      .sort((a, b) => b.rate - a.rate || b.tickets - a.tickets),
  };
}

async function fetchTickets(supabase: Client) {
  const { data, error } = await supabase
    .from("tickets")
    .select("reference, category, status, urgency, missing_fields, created_at")
    .order("created_at", { ascending: false })
    .limit(TICKET_SCAN_LIMIT);

  if (error) {
    throw new Error(
      `Could not build the summary: ${error.message}. If this says permission ` +
        `denied, db/rls.sql has not been run on this project.`,
    );
  }

  return data ?? [];
}

async function fetchEvents(supabase: Client) {
  const { data, error } = await supabase
    .from("ticket_events")
    .select("ticket_reference, actor_type, event_type, detail")
    .order("created_at", { ascending: false })
    .limit(EVENT_SCAN_LIMIT);

  if (error) {
    throw new Error(`Could not read the ticket history: ${error.message}`);
  }

  return (data ?? []).map((event) => {
    const detail =
      event.detail && typeof event.detail === "object" && !Array.isArray(event.detail)
        ? event.detail
        : {};
    const to = (detail as Record<string, unknown>).to;

    return {
      ticket_reference: event.ticket_reference,
      actor_type: event.actor_type,
      event_type: event.event_type,
      to: typeof to === "string" ? to : null,
    };
  });
}

async function countSelfResolutions(supabase: Client): Promise<number> {
  const { count, error } = await supabase
    .from("self_resolutions")
    .select("id", { count: "exact", head: true });

  // Missing read access here should not take the whole page down; the screen
  // says the number is unavailable instead.
  if (error) return 0;
  return count ?? 0;
}

function medianAgeHours(timestamps: string[]): number | null {
  if (timestamps.length === 0) return null;

  const now = Date.now();
  const ages = timestamps
    .map((iso) => (now - new Date(iso).getTime()) / 3_600_000)
    .sort((a, b) => a - b);

  const middle = Math.floor(ages.length / 2);
  return ages.length % 2 === 0
    ? (ages[middle - 1] + ages[middle]) / 2
    : ages[middle];
}

export function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return `${Math.round(value * 100)}%`;
}

export function formatAge(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 1) return "under an hour";
  if (hours < 48) {
    const rounded = Math.round(hours);
    return `${rounded} ${rounded === 1 ? "hour" : "hours"}`;
  }
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"}`;
}
