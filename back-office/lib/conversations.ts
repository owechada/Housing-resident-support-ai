import type { MessageRow } from "@/lib/database.types";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * How many recent messages the conversation list reads. Grouping happens here
 * rather than in SQL because there is no per-resident aggregate view yet, and one
 * estate's recent traffic is small. If this cap is being hit routinely, the right
 * fix is a database view, not a bigger number.
 */
export const MESSAGE_SCAN_LIMIT = 500;

export type ConversationSummary = {
  residentId: string | null;
  residentName: string;
  unitLabel: string | null;
  isSelfRegistered: boolean;
  channels: string[];
  messageCount: number;
  residentMessageCount: number;
  photoCount: number;
  lastActivityAt: string;
  lastResidentMessage: string | null;
  ticketCount: number;
};

type MessageWithResident = MessageRow & {
  residents: {
    full_name: string;
    is_self_registered: boolean;
    units: { label: string } | null;
  } | null;
};

export const UNIDENTIFIED_KEY = "unidentified";

/**
 * One row per resident, newest conversation first, plus a single bucket for
 * messages from numbers that never resolved to a resident. Identity resolves in
 * the channel adapter, so that bucket should stay near-empty — if it does not,
 * something upstream is failing and the manager should be able to see it.
 */
export async function fetchConversationSummaries(
  supabase: Client,
): Promise<{ conversations: ConversationSummary[]; unidentified: MessageRow[] }> {
  const { data, error } = await supabase
    .from("messages")
    .select(
      "*, residents(full_name, is_self_registered, units(label))",
    )
    .order("created_at", { ascending: false })
    .limit(MESSAGE_SCAN_LIMIT);

  if (error) {
    throw new Error(
      `Could not load conversations: ${error.message}. If this says permission ` +
        `denied, db/rls.sql has not been run on this project.`,
    );
  }

  // A checked assignment, not a cast: the embed's shape is verified by tsc.
  const messages: MessageWithResident[] = data ?? [];
  const ticketCounts = await fetchTicketCountsByResident(supabase);

  const grouped = new Map<string, ConversationSummary>();
  const unidentified: MessageRow[] = [];

  for (const message of messages) {
    if (!message.resident_id) {
      unidentified.push(message);
      continue;
    }

    const existing = grouped.get(message.resident_id);
    const summary: ConversationSummary =
      existing ?? {
        residentId: message.resident_id,
        residentName: message.residents?.full_name ?? "Unknown resident",
        unitLabel: message.residents?.units?.label ?? null,
        isSelfRegistered: message.residents?.is_self_registered ?? false,
        channels: [],
        messageCount: 0,
        residentMessageCount: 0,
        photoCount: 0,
        // Messages arrive newest first, so the first one seen is the latest.
        lastActivityAt: message.created_at,
        lastResidentMessage: null,
        ticketCount: ticketCounts.get(message.resident_id) ?? 0,
      };

    summary.messageCount += 1;
    if (message.inbound_text) {
      summary.residentMessageCount += 1;
      summary.lastResidentMessage ??= message.inbound_text;
    }
    if (message.photo_url) summary.photoCount += 1;
    if (!summary.channels.includes(message.channel)) {
      summary.channels.push(message.channel);
    }

    grouped.set(message.resident_id, summary);
  }

  return {
    conversations: [...grouped.values()],
    unidentified,
  };
}

async function fetchTicketCountsByResident(
  supabase: Client,
): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("tickets")
    .select("resident_id")
    .not("resident_id", "is", null);

  const counts = new Map<string, number>();
  if (error || !data) return counts;

  for (const row of data) {
    if (!row.resident_id) continue;
    counts.set(row.resident_id, (counts.get(row.resident_id) ?? 0) + 1);
  }

  return counts;
}

export type ResidentProfile = {
  id: string;
  full_name: string;
  is_self_registered: boolean;
  units: { label: string } | null;
};

export async function fetchResident(
  supabase: Client,
  residentId: string,
): Promise<ResidentProfile | null> {
  const { data, error } = await supabase
    .from("residents")
    .select("id, full_name, is_self_registered, units(label)")
    .eq("id", residentId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load that resident: ${error.message}`);
  }

  return data;
}

export async function fetchResidentTickets(
  supabase: Client,
  residentId: string,
) {
  const { data, error } = await supabase
    .from("tickets")
    .select("reference, category, urgency, status, created_at")
    .eq("resident_id", residentId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Could not load their tickets: ${error.message}`);
  }

  return data ?? [];
}
