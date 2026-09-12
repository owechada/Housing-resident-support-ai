import type { ActorType, Json, TicketEventRow, TicketStatus } from "@/lib/database.types";
import { STATUS_LABELS, fieldLabel } from "@/lib/labels";

/**
 * Event types written by this app. The agent only ever writes `created`, so the
 * rest of the vocabulary is defined here.
 *
 * `fields_edited` is the override signal: it records a manager correcting what
 * the assistant captured, which is what the evaluation loop measures per
 * category. Do not drop these to tidy the table.
 */
export const EVENT_TYPES = {
  statusChanged: "status_changed",
  fieldsEdited: "fields_edited",
  noteAdded: "note_added",
  residentNotified: "resident_notified",
  residentNotifyFailed: "resident_notify_failed",
} as const;

function asRecord(value: Json): Record<string, Json> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Json>)
    : {};
}

function text(value: Json | undefined): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function statusLabel(value: Json | undefined): string {
  const raw = text(value);
  if (!raw) return "unknown";
  return STATUS_LABELS[raw as TicketStatus] ?? raw;
}

const ACTOR_NAMES: Record<ActorType, string> = {
  agent: "Assistant",
  manager: "Manager",
  resident: "Resident",
  system: "System",
};

export function actorName(actorType: ActorType): string {
  return ACTOR_NAMES[actorType] ?? actorType;
}

/**
 * One sentence a manager can read without knowing the schema.
 */
export function describeEvent(event: TicketEventRow): string {
  const detail = asRecord(event.detail);

  switch (event.event_type) {
    case "created": {
      const status = text(detail.status);
      if (status === "needs_review") {
        return "Assistant created this ticket and flagged it for a human to check";
      }
      return "Assistant created this ticket from the resident's report";
    }

    case EVENT_TYPES.statusChanged: {
      const to = statusLabel(detail.to);
      if (to === statusLabel("closed")) {
        return `Closed, from ${statusLabel(detail.from)}`;
      }
      return `Status changed from ${statusLabel(detail.from)} to ${to}`;
    }

    case EVENT_TYPES.fieldsEdited: {
      const changes = asRecord(detail.changes);
      const names = Object.keys(changes).map(fieldLabel);
      if (names.length === 0) return "Details edited";
      return `Details edited: ${names.join(", ").toLowerCase()}`;
    }

    case EVENT_TYPES.noteAdded:
      return "Note added";

    case EVENT_TYPES.residentNotified:
      return "Resident told about this change";

    case EVENT_TYPES.residentNotifyFailed:
      return "Could not tell the resident — no message was sent";

    default:
      return event.event_type.replace(/_/g, " ");
  }
}

/** The note body, for events that carry one. */
export function eventNote(event: TicketEventRow): string | null {
  return text(asRecord(event.detail).note);
}

/** Field-by-field before and after, for an edit event. */
export function eventChanges(
  event: TicketEventRow,
): { field: string; from: string; to: string }[] {
  const changes = asRecord(asRecord(event.detail).changes);

  return Object.entries(changes).map(([field, value]) => {
    const pair = asRecord(value);
    return {
      field: fieldLabel(field),
      from: text(pair.from) ?? "empty",
      to: text(pair.to) ?? "empty",
    };
  });
}
