import { describe, expect, it } from "vitest";

import { attentionFilter, attentionReason, needsAttention } from "@/lib/attention";
import { TICKET_STATUSES, TICKET_URGENCIES } from "@/lib/database.types";

 const EVERY_TICKET = TICKET_URGENCIES.flatMap((urgency) =>
  TICKET_STATUSES.map((status) => ({ urgency, status })),
);

describe("needsAttention", () => {
  
  it.each(EVERY_TICKET)("$urgency / $status", (ticket) => {
    const expected =
      ticket.urgency === "emergency" ||
      ticket.status === "needs_review" ||
      ticket.status === "reopened";

    expect(needsAttention(ticket)).toBe(expected);
  });
});

describe("attentionReason", () => {
  it("puts an emergency ahead of any status", () => {
    expect(attentionReason({ urgency: "emergency", status: "needs_review" })).toBe(
      "emergency",
    );
    expect(attentionReason({ urgency: "emergency", status: "reopened" })).toBe(
      "emergency",
    );
  });

  it("names a ticket waiting for review", () => {
    expect(attentionReason({ urgency: "high", status: "needs_review" })).toBe("review");
  });

  it("names a reopened ticket", () => {
    expect(attentionReason({ urgency: "low", status: "reopened" })).toBe("reopened");
  });

  it("gives a reason exactly when the ticket needs attention", () => {
    for (const ticket of EVERY_TICKET) {
      expect(
        attentionReason(ticket) !== null,
        `${ticket.urgency} / ${ticket.status}`,
      ).toBe(needsAttention(ticket));
    }
  });
});

describe("attentionFilter", () => {
  it("is the exact filter the queue sent before it was generated", () => {
    expect(attentionFilter()).toBe(
      "urgency.eq.emergency,status.eq.needs_review,status.eq.reopened",
    );
  });

 it("selects the same tickets as needsAttention", () => {
    const conditions = attentionFilter()
      .split(",")
      .map((condition) => condition.split("."));

    for (const ticket of EVERY_TICKET) {
      const selected = conditions.some(
        ([column, operator, value]) =>
          operator === "eq" && ticket[column as keyof typeof ticket] === value,
      );

      expect(selected, `${ticket.urgency} / ${ticket.status}`).toBe(
        needsAttention(ticket),
      );
    }
  });
});
