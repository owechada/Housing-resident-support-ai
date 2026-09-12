import type {
  MessageRow,
  TicketEventRow,
  TicketRow,
} from "@/lib/database.types";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export type TicketDetail = TicketRow & {
  units: { label: string };
  residents: { full_name: string; is_self_registered: boolean } | null;
};

/** Messages are linked to a resident, not to a ticket, so a thread is capped. */
export const CONVERSATION_LIMIT = 60;

export async function fetchTicket(
  supabase: Client,
  reference: string,
): Promise<TicketDetail | null> {
  const { data, error } = await supabase
    .from("tickets")
    .select("*, units(label), residents(full_name, is_self_registered)")
    .eq("reference", reference)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Could not load ticket ${reference}: ${error.message}. If this says ` +
        `permission denied, db/rls.sql has not been run on this project.`,
    );
  }

  return data;
}

export async function fetchTicketEvents(
  supabase: Client,
  reference: string,
): Promise<TicketEventRow[]> {
  const { data, error } = await supabase
    .from("ticket_events")
    .select("*")
    .eq("ticket_reference", reference)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`Could not load the history for ${reference}: ${error.message}`);
  }

  return data ?? [];
}

/**
 * The resident's recent conversation. `messages` has no ticket reference, so
 * this is the thread around the report rather than provably only this ticket's
 * messages — the screen says as much rather than implying a tighter link.
 */
export async function fetchConversation(
  supabase: Client,
  residentId: string | null,
  limit = CONVERSATION_LIMIT,
): Promise<MessageRow[]> {
  if (!residentId) return [];

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("resident_id", residentId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Could not load the conversation: ${error.message}`);
  }

  // Newest first out of the database so the limit keeps the latest, then
  // flipped so the manager reads it in the order it happened.
  return (data ?? []).slice().reverse();
}
