"use server";

import { revalidatePath } from "next/cache";

import { requireManager } from "@/lib/auth";
import {
  TICKET_CATEGORIES,
  TICKET_STATUSES,
  TICKET_URGENCIES,
  type Json,
  type TicketCategory,
  type TicketStatus,
  type TicketUpdate,
  type TicketUrgency,
} from "@/lib/database.types";
import { EVENT_TYPES } from "@/lib/events";
import { notifyResidentOfStatus } from "@/lib/notify";
import { fetchTicket } from "@/lib/ticket-detail";

export type ActionState = { ok: boolean; message: string } | null;

/** Statuses worth telling a resident about. Internal triage is not news. */
const RESIDENT_VISIBLE: TicketStatus[] = [
  "acknowledged",
  "assigned",
  "in_progress",
  "resolved",
  "closed",
  "cancelled",
  "reopened",
];

/** Editable free-text facts. Empty input means "still not known", i.e. null. */
const TEXT_FIELDS = [
  "location_in_unit",
  "description",
  "onset",
  "access_window",
] as const;

function trimmed(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text === "" ? null : text;
}

function displayValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value ? "yes" : "no";
  return String(value);
}

/**
 * Saves the Facts panel.
 *
 * Only changed fields are written, and each change is recorded field by field in
 * ticket_events. That record is the override signal the evaluation loop reads —
 * how often a manager had to correct what the assistant captured, by category.
 */
export async function saveFacts(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const reference = String(formData.get("reference") ?? "");
  if (!reference) return { ok: false, message: "Missing ticket reference." };

  const { manager, supabase } = await requireManager();
  const ticket = await fetchTicket(supabase, reference);
  if (!ticket) return { ok: false, message: "That ticket no longer exists." };

  const category = String(formData.get("category") ?? "");
  const urgency = String(formData.get("urgency") ?? "");

  if (!TICKET_CATEGORIES.includes(category as TicketCategory)) {
    return { ok: false, message: "Pick a category from the list." };
  }
  if (!TICKET_URGENCIES.includes(urgency as TicketUrgency)) {
    return { ok: false, message: "Pick an urgency from the list." };
  }

  const proposed: TicketUpdate = {
    category: category as TicketCategory,
    urgency: urgency as TicketUrgency,
    safety_flag: formData.get("safety_flag") === "on",
  };
  for (const field of TEXT_FIELDS) {
    proposed[field] = trimmed(formData, field);
  }

  const changes: Record<string, Json> = {};
  const update: TicketUpdate = {};

  for (const [field, next] of Object.entries(proposed)) {
    const current = ticket[field as keyof typeof ticket];
    if (current === next) continue;

    Object.assign(update, { [field]: next });
    changes[field] = {
      from: displayValue(current),
      to: displayValue(next),
    };
  }

  if (Object.keys(update).length === 0) {
    return { ok: true, message: "Nothing to save — no details changed." };
  }

  const { error } = await supabase
    .from("tickets")
    .update(update)
    .eq("reference", reference);

  if (error) return { ok: false, message: `Could not save: ${error.message}` };

  await recordEvent(supabase, {
    reference,
    actorId: manager.id,
    eventType: EVENT_TYPES.fieldsEdited,
    detail: { changes },
  });

  revalidatePath(`/tickets/${reference}`);
  revalidatePath("/");

  const count = Object.keys(changes).length;
  return {
    ok: true,
    message: `Saved ${count} ${count === 1 ? "change" : "changes"}.`,
  };
}

/**
 * Changes status, and closing goes through here too.
 *
 * closed_by is the signed-in manager. The enforce_human_close trigger rejects a
 * close without it, which is what guarantees no automated path can close a
 * ticket. Do not work around that by inventing an id.
 */
export async function changeStatus(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const reference = String(formData.get("reference") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!reference) return { ok: false, message: "Missing ticket reference." };
  if (!TICKET_STATUSES.includes(status as TicketStatus)) {
    return { ok: false, message: "Pick a status from the list." };
  }

  const next = status as TicketStatus;
  const { manager, supabase } = await requireManager();
  const ticket = await fetchTicket(supabase, reference);
  if (!ticket) return { ok: false, message: "That ticket no longer exists." };

  if (ticket.status === next) {
    return { ok: true, message: "That is already the status." };
  }

  const settling = next === "closed" || next === "cancelled";
  const update: TicketUpdate = {
    status: next,
    // Reopening a settled ticket clears the close, so the row stops claiming it
    // is finished. Who closed it survives in the event history.
    closed_by: settling ? manager.id : null,
    closed_at: settling ? new Date().toISOString() : null,
  };

  const { error } = await supabase
    .from("tickets")
    .update(update)
    .eq("reference", reference);

  if (error) {
    return {
      ok: false,
      message: `Could not change the status: ${error.message}`,
    };
  }

  await recordEvent(supabase, {
    reference,
    actorId: manager.id,
    eventType: EVENT_TYPES.statusChanged,
    detail: { from: ticket.status, to: next },
  });

  let message = "Status updated.";

  if (RESIDENT_VISIBLE.includes(next)) {
    const result = await notifyResidentOfStatus({
      reference,
      status: next,
      actorId: manager.id,
    });

    if (result.outcome === "sent") {
      await recordEvent(supabase, {
        reference,
        actorId: manager.id,
        eventType: EVENT_TYPES.residentNotified,
        detail: { status: next },
      });
      message = "Status updated and the resident has been told.";
    } else if (result.outcome === "failed") {
      await recordEvent(supabase, {
        reference,
        actorId: manager.id,
        eventType: EVENT_TYPES.residentNotifyFailed,
        detail: { status: next, reason: result.reason },
      });
      message =
        "Status updated, but the resident could not be told. Contact them another way.";
    } else {
      message =
        "Status updated. The resident has not been told — automatic updates are not switched on yet.";
    }
  }

  revalidatePath(`/tickets/${reference}`);
  revalidatePath("/");

  return { ok: true, message };
}

/** An internal note. Never sent to the resident. */
export async function addNote(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const reference = String(formData.get("reference") ?? "");
  const note = trimmed(formData, "note");

  if (!reference) return { ok: false, message: "Missing ticket reference." };
  if (!note) return { ok: false, message: "Write the note first." };

  const { manager, supabase } = await requireManager();

  const { error } = await recordEvent(supabase, {
    reference,
    actorId: manager.id,
    eventType: EVENT_TYPES.noteAdded,
    detail: { note },
  });

  if (error) {
    return { ok: false, message: `Could not save the note: ${error}` };
  }

  revalidatePath(`/tickets/${reference}`);
  return { ok: true, message: "Note added." };
}

/**
 * Every mutation writes one of these. The insert policy requires
 * actor_type = 'manager', so this app cannot forge an event as the assistant.
 */
async function recordEvent(
  supabase: Awaited<ReturnType<typeof requireManager>>["supabase"],
  input: {
    reference: string;
    actorId: string;
    eventType: string;
    detail: Record<string, Json>;
  },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("ticket_events").insert({
    ticket_reference: input.reference,
    actor_type: "manager",
    actor_id: input.actorId,
    event_type: input.eventType,
    detail: input.detail,
  });

  return { error: error?.message ?? null };
}
