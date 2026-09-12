import Link from "next/link";
import { notFound } from "next/navigation";

import { Conversation } from "@/components/conversation";
import { StatusBadge, UrgencyBadge } from "@/components/ticket-badges";
import { Badge } from "@/components/ui/badge";
import { requireManager } from "@/lib/auth";
import { estateTimeZone } from "@/lib/config";
import { fetchResident, fetchResidentTickets } from "@/lib/conversations";
import { CATEGORY_LABELS, relativeAge } from "@/lib/labels";
import { fetchConversation } from "@/lib/ticket-detail";

type Props = { params: Promise<{ resident: string }> };

export async function generateMetadata({ params }: Props) {
  const { resident } = await params;
  const { supabase } = await requireManager();
  const profile = await fetchResident(supabase, resident).catch(() => null);
  return { title: profile?.full_name ?? "Conversation" };
}

export default async function ResidentConversationPage({ params }: Props) {
  const { resident: residentId } = await params;
  const { supabase } = await requireManager();

  const profile = await fetchResident(supabase, residentId);
  if (!profile) notFound();

  const [messages, tickets] = await Promise.all([
    fetchConversation(supabase, profile.id, 200),
    fetchResidentTickets(supabase, profile.id),
  ]);

  const timeZone = estateTimeZone();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">
      <Link
        href="/messages"
        className="text-sm text-muted-foreground underline underline-offset-4"
      >
        Back to conversations
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-lg font-semibold">{profile.full_name}</h1>
        {profile.is_self_registered ? (
          <Badge
            variant="outline"
            className="border-amber-400 bg-amber-50 text-amber-900"
            title="This resident signed themselves up in chat. Nobody has confirmed they live at this address."
          >
            Unverified resident
          </Badge>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {profile.units?.label ?? "Unit unknown"}
      </p>

      {tickets.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-base font-semibold">
            Tickets from this resident
          </h2>
          <ul className="mt-2 overflow-hidden rounded-lg border">
            {tickets.map((ticket) => (
              <li key={ticket.reference}>
                <Link
                  href={`/tickets/${ticket.reference}`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2.5 transition-colors last:border-b-0 hover:bg-muted/60"
                >
                  <span className="font-mono text-sm">{ticket.reference}</span>
                  <UrgencyBadge urgency={ticket.urgency} />
                  <StatusBadge status={ticket.status} />
                  <span className="text-sm text-muted-foreground">
                    {CATEGORY_LABELS[ticket.category]} ·{" "}
                    {relativeAge(ticket.created_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="mt-6 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          No tickets from this resident. If their questions were answered
          without one, that counts as a success — see the summary.
        </p>
      )}

      <section className="mt-8">
        <h2 className="text-base font-semibold">Conversation</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Oldest first. You cannot reply from here — messages to residents go out
          through the assistant, so there is only one path to them.
        </p>
        <Conversation messages={messages} timeZone={timeZone} />
      </section>
    </div>
  );
}
