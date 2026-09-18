import type { TicketRow } from "@/lib/database.types";

type AttentionColumn = "urgency" | "status";

/** One condition that puts a ticket in front of the estate manager. */
export type AttentionRule = {
  [C in AttentionColumn]: { column: C; value: TicketRow[C]; reason: string };
}[AttentionColumn];

/** Highest priority first. The first rule a ticket matches gives its reason. */
export const ATTENTION_RULES = [
  { column: "urgency", value: "emergency", reason: "emergency" },
  { column: "status", value: "needs_review", reason: "review" },
  { column: "status", value: "reopened", reason: "reopened" },
] as const satisfies readonly AttentionRule[];

export type AttentionReason = (typeof ATTENTION_RULES)[number]["reason"];

type AttentionFields = Pick<TicketRow, AttentionColumn>;

function matches(ticket: AttentionFields, rule: AttentionRule): boolean {
  return ticket[rule.column] === rule.value;
}

export function needsAttention(ticket: AttentionFields): boolean {
  return ATTENTION_RULES.some((rule) => matches(ticket, rule));
}

export function attentionReason(ticket: AttentionFields): AttentionReason | null {
  return ATTENTION_RULES.find((rule) => matches(ticket, rule))?.reason ?? null;
}

/** The same rules as a PostgREST `.or()` filter. */
export function attentionFilter(): string {
  return ATTENTION_RULES.map((rule) => `${rule.column}.eq.${rule.value}`).join(",");
}
