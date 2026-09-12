import Link from "next/link";

import { Conversation } from "@/components/conversation";
import { Badge } from "@/components/ui/badge";
import { requireManager } from "@/lib/auth";
import { estateTimeZone } from "@/lib/config";
import { absoluteTime, relativeAge } from "@/lib/labels";
import {
  MESSAGE_SCAN_LIMIT,
  fetchConversationSummaries,
  type ConversationSummary,
} from "@/lib/conversations";

export const metadata = {
  title: "Conversations",
};

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  web_chat: "Web chat",
};

export default async function MessagesPage() {
  const { supabase } = await requireManager();
  const { conversations, unidentified } = await fetchConversationSummaries(supabase);
  const timeZone = estateTimeZone();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
      <h1 className="text-xl font-semibold tracking-tight">Conversations</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Everyone who has messaged the assistant, most recent first. Reading a
        conversation does not change anything — replies still go out through the
        assistant.
      </p>

      {conversations.length === 0 && unidentified.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed px-4 py-10 text-center">
          <p className="font-medium">Nobody has messaged yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Conversations appear here as soon as a resident writes to the
            assistant on WhatsApp, Telegram or web chat.
          </p>
        </div>
      ) : null}

      {conversations.length > 0 ? (
        <ul className="mt-6 overflow-hidden rounded-lg border">
          {conversations.map((conversation) => (
            <ConversationRow
              key={conversation.residentId}
              conversation={conversation}
              timeZone={timeZone}
            />
          ))}
        </ul>
      ) : null}

      {unidentified.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-base font-semibold">Not linked to a resident</h2>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">
            {unidentified.length}{" "}
            {unidentified.length === 1 ? "message" : "messages"} from a number or
            account that did not match anyone on the estate. Identity is meant to
            resolve before the assistant replies, so anything here is worth a
            look.
          </p>
          <div className="rounded-lg border p-4">
            <Conversation
              messages={unidentified.slice(0, 10).reverse()}
              timeZone={timeZone}
            />
          </div>
        </section>
      ) : null}

      <p className="mt-6 text-xs text-muted-foreground">
        Based on the {MESSAGE_SCAN_LIMIT} most recent messages.
      </p>
    </div>
  );
}

function ConversationRow({
  conversation,
  timeZone,
}: {
  conversation: ConversationSummary;
  timeZone: string;
}) {
  return (
    <li>
      <Link
        href={`/messages/${conversation.residentId}`}
        className="block border-b px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/60"
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium">{conversation.residentName}</span>
          {conversation.isSelfRegistered ? (
            <Badge
              variant="outline"
              className="border-amber-400 bg-amber-50 text-amber-900"
            >
              Unverified
            </Badge>
          ) : null}
          <span className="text-sm text-muted-foreground">
            {conversation.unitLabel ?? "Unit unknown"}
          </span>
        </div>

        {conversation.lastResidentMessage ? (
          <p className="mt-1 line-clamp-2 text-sm">
            &ldquo;{conversation.lastResidentMessage}&rdquo;
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Only replies from the assistant so far.
          </p>
        )}

        <p className="mt-1.5 text-xs text-muted-foreground">
          {conversation.channels
            .map((channel) => CHANNEL_LABELS[channel] ?? channel)
            .join(", ")}
          {" · "}
          {conversation.messageCount}{" "}
          {conversation.messageCount === 1 ? "message" : "messages"}
          {conversation.photoCount > 0
            ? ` · ${conversation.photoCount} photo${conversation.photoCount === 1 ? "" : "s"}`
            : ""}
          {" · "}
          {conversation.ticketCount === 0
            ? "no tickets raised"
            : `${conversation.ticketCount} ticket${conversation.ticketCount === 1 ? "" : "s"}`}
          {" · last "}
          <time
            dateTime={conversation.lastActivityAt}
            title={absoluteTime(conversation.lastActivityAt, timeZone)}
          >
            {relativeAge(conversation.lastActivityAt)}
          </time>
        </p>
      </Link>
    </li>
  );
}
