import Image from "next/image";

import type { MessageRow } from "@/lib/database.types";
import { absoluteTime } from "@/lib/labels";
import { cn } from "@/lib/utils";

/**
 * The exchange as it happened, oldest first. Inbound and outbound are visually
 * distinct — a manager scanning this needs to tell at a glance what the resident
 * said from what the assistant said back.
 *
 * One row can carry both an inbound and an outbound text, which is how the core
 * records a turn, so each is rendered separately rather than assuming one per row.
 */
export function Conversation({
  messages,
  timeZone,
}: {
  messages: MessageRow[];
  timeZone: string;
}) {
  if (messages.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No conversation recorded for this resident.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-4">
      {messages.map((message) => (
        <li key={message.id} className="flex flex-col gap-2">
          {message.inbound_text ? (
            <Bubble
              from="resident"
              text={message.inbound_text}
              at={message.created_at}
              timeZone={timeZone}
            />
          ) : null}

          {message.photo_url ? (
            <figure className="max-w-[min(18rem,80%)] self-start">
              <a
                href={message.photo_url}
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                <Image
                  src={message.photo_url}
                  alt="Photo sent by the resident"
                  width={288}
                  height={288}
                  className="h-auto w-full rounded-lg border"
                />
              </a>
              <figcaption className="mt-1 text-xs text-muted-foreground">
                Photo from the resident — opens full size
              </figcaption>
            </figure>
          ) : null}

          {message.outbound_text ? (
            <Bubble
              from="assistant"
              text={message.outbound_text}
              at={message.created_at}
              timeZone={timeZone}
            />
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function Bubble({
  from,
  text,
  at,
  timeZone,
}: {
  from: "resident" | "assistant";
  text: string;
  at: string;
  timeZone: string;
}) {
  const isResident = from === "resident";

  return (
    <div
      className={cn(
        "max-w-[min(36rem,85%)] rounded-lg border px-3 py-2",
        isResident
          ? "self-start bg-muted"
          : "self-end border-sky-200 bg-sky-50",
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">
        {isResident ? "Resident" : "Assistant"}
        {" · "}
        <time dateTime={at}>{absoluteTime(at, timeZone)}</time>
      </p>
      <p className="mt-1 text-sm whitespace-pre-wrap">{text}</p>
    </div>
  );
}
