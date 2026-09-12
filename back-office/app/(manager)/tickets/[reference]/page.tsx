import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Conversation } from "@/components/conversation";
import { EventHistory } from "@/components/event-history";
import { StatusBadge, UrgencyBadge } from "@/components/ticket-badges";
import { TicketActions } from "@/components/ticket-actions";
import { TicketFactsForm } from "@/components/ticket-facts-form";
import { Badge } from "@/components/ui/badge";
import { requireManager } from "@/lib/auth";
import { estateTimeZone } from "@/lib/config";
import {
  PHOTO_STATUS_LABELS,
  absoluteTime,
  missingFieldNames,
  relativeAge,
} from "@/lib/labels";
import {
  fetchConversation,
  fetchTicket,
  fetchTicketEvents,
  type TicketDetail,
} from "@/lib/ticket-detail";

type Props = { params: Promise<{ reference: string }> };

export async function generateMetadata({ params }: Props) {
  const { reference } = await params;
  return { title: reference };
}

export default async function TicketPage({ params }: Props) {
  const { reference } = await params;
  const { supabase } = await requireManager();

  const ticket = await fetchTicket(supabase, reference);
  if (!ticket) notFound();

  const [events, messages] = await Promise.all([
    fetchTicketEvents(supabase, ticket.reference),
    fetchConversation(supabase, ticket.resident_id),
  ]);

  const timeZone = estateTimeZone();
  const missing = missingFieldNames(ticket.missing_fields);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
      <Link
        href="/"
        className="text-sm text-muted-foreground underline underline-offset-4"
      >
        Back to the queue
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="font-mono text-lg font-semibold">{ticket.reference}</h1>
        <UrgencyBadge urgency={ticket.urgency} />
        <StatusBadge status={ticket.status} />
        {ticket.residents?.is_self_registered ? (
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
        {ticket.units.label}
        {ticket.residents ? ` · ${ticket.residents.full_name}` : ""}
        {" · reported "}
        <time
          dateTime={ticket.created_at}
          title={absoluteTime(ticket.created_at, timeZone)}
        >
          {relativeAge(ticket.created_at)}
        </time>
      </p>

      {ticket.status === "needs_review" ? (
        <div className="mt-4 rounded-md border border-amber-400 bg-amber-50 p-3">
          <p className="font-medium text-amber-900">
            The assistant was not confident about this one
          </p>
          <p className="mt-1 text-sm text-amber-900">
            {ticket.review_reason ??
              "No reason was recorded. Check the details below against the conversation."}
          </p>
        </div>
      ) : null}

      {missing.length > 0 ? (
        <p className="mt-4 text-sm text-amber-900">
          {missing.length} {missing.length === 1 ? "detail was" : "details were"}{" "}
          never captured. They are marked below.
        </p>
      ) : null}

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-8">
          <Section title="Facts" description="Correct anything the assistant got wrong.">
            <TicketFactsForm
              reference={ticket.reference}
              facts={{
                category: ticket.category,
                urgency: ticket.urgency,
                location_in_unit: ticket.location_in_unit,
                description: ticket.description,
                onset: ticket.onset,
                access_window: ticket.access_window,
                safety_flag: ticket.safety_flag,
              }}
              missingFields={missing}
            />
            <ReadOnlyFacts ticket={ticket} timeZone={timeZone} />
          </Section>

          <Section title="Evidence" description="What the resident sent and said.">
            <Photo ticket={ticket} />
            <div className="mt-6">
              <h3 className="text-sm font-medium">Conversation</h3>
              <p className="mb-3 text-xs text-muted-foreground">
                This resident&apos;s recent messages. Messages are recorded
                against the resident rather than the ticket, so earlier
                conversations may appear here too.
              </p>
              <Conversation messages={messages} timeZone={timeZone} />
            </div>
          </Section>
        </div>

        <aside>
          <Section title="Actions" description="Only a person can close a ticket.">
            <TicketActions reference={ticket.reference} status={ticket.status} />
          </Section>
        </aside>
      </div>

      <Section
        title="History"
        description="Everything that has happened, and who did it."
        className="mt-8"
      >
        <EventHistory events={events} timeZone={timeZone} />
      </Section>
    </div>
  );
}

function Section({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={className}>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mb-4 text-sm text-muted-foreground">{description}</p>
      {children}
    </section>
  );
}

/**
 * Facts a manager should see but must not rewrite: the reference the resident was
 * given, how the report arrived, and how sure the assistant was.
 */
function ReadOnlyFacts({
  ticket,
  timeZone,
}: {
  ticket: TicketDetail;
  timeZone: string;
}) {
  const channelLabels: Record<string, string> = {
    whatsapp: "WhatsApp",
    telegram: "Telegram",
    web_chat: "Web chat",
  };

  const rows: [string, string][] = [
    ["Reported through", channelLabels[ticket.channel] ?? ticket.channel],
    ["Reported at", absoluteTime(ticket.created_at, timeZone)],
    [
      "Assistant's confidence",
      ticket.confidence === null
        ? "Not recorded"
        : `${Math.round(ticket.confidence * 100)}%`,
    ],
    ["Photo", PHOTO_STATUS_LABELS[ticket.photo_status]],
  ];

  if (ticket.closed_at) {
    rows.push(["Closed at", absoluteTime(ticket.closed_at, timeZone)]);
  }

  return (
    <dl className="mt-6 grid gap-x-6 gap-y-2 border-t pt-4 text-sm sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4 sm:block">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="font-medium sm:mt-0.5">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Words, not an empty box, when there is no photo to show. */
function Photo({ ticket }: { ticket: TicketDetail }) {
  if (ticket.photo_url) {
    return (
      <figure>
        <a href={ticket.photo_url} target="_blank" rel="noreferrer">
          <Image
            src={ticket.photo_url}
            alt="Photo of the reported problem, sent by the resident"
            width={640}
            height={640}
            className="h-auto w-full max-w-xl rounded-lg border"
          />
        </a>
        <figcaption className="mt-2 text-xs text-muted-foreground">
          Tap the photo to see it full size.
        </figcaption>
      </figure>
    );
  }

  if (ticket.photo_status === "refused") {
    return (
      <p className="rounded-md border border-dashed p-3 text-sm">
        The assistant asked for a photo and the resident chose not to send one.
        That was recorded rather than left blank, so this is not a gap in the
        report.
      </p>
    );
  }

  return (
    <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
      No photo came with this report.
    </p>
  );
}
