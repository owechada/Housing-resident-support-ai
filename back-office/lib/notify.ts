import "server-only";

/**
 * The single path to a resident.
 *
 * The architecture rule this exists to keep: the back office reads Supabase
 * directly, but anything that reaches a resident goes through n8n, so the
 * outbound dispatcher stays the only thing that talks to WhatsApp, Telegram or
 * web chat. This app therefore never sends a message itself — it asks n8n to.
 *
 * The outbound workflow does not exist yet. Until N8N_STATUS_WEBHOOK_URL is set
 * this is a no-op that reports itself as unconfigured, so the manager is told
 * the resident has not been messaged rather than being left to assume they were.
 */
export type NotifyResult =
  | { outcome: "sent" }
  | { outcome: "not_configured" }
  | { outcome: "failed"; reason: string };

/**
 * Deliberately carries no free text. The dispatcher composes the wording from
 * the status, so a manager cannot type a repair date, time window or cost into
 * a message to a resident — a promise the estate might not keep. Internal notes
 * stay internal for the same reason.
 */
export async function notifyResidentOfStatus(input: {
  reference: string;
  status: string;
  actorId: string;
}): Promise<NotifyResult> {
  const url = process.env.N8N_STATUS_WEBHOOK_URL;
  if (!url) return { outcome: "not_configured" };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // Optional shared secret, so the webhook is not open to the internet.
        ...(process.env.N8N_WEBHOOK_SECRET
          ? { "x-webhook-secret": process.env.N8N_WEBHOOK_SECRET }
          : {}),
      },
      body: JSON.stringify(input),
      // A slow dispatcher must not hang the manager's screen.
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });

    if (!response.ok) {
      return { outcome: "failed", reason: `n8n replied ${response.status}` };
    }

    return { outcome: "sent" };
  } catch (error) {
    return {
      outcome: "failed",
      reason: error instanceof Error ? error.message : "unknown error",
    };
  }
}
