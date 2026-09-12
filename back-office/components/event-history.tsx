import type { TicketEventRow } from "@/lib/database.types";
import { actorName, describeEvent, eventChanges, eventNote } from "@/lib/events";
import { absoluteTime, relativeAge } from "@/lib/labels";

/**
 * The audit trail, oldest first so it reads as the story of the ticket. Every
 * mutation in this app writes one of these rows, and nothing here deletes them.
 */
export function EventHistory({
  events,
  timeZone,
}: {
  events: TicketEventRow[];
  timeZone: string;
}) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing has happened to this ticket yet.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-3">
      {events.map((event) => {
        const note = eventNote(event);
        const changes = eventChanges(event);

        return (
          <li key={event.id} className="border-l-2 pl-3">
            <p className="text-sm">
              {describeEvent(event)}
              <span className="text-muted-foreground">
                {" · "}
                <time
                  dateTime={event.created_at}
                  title={absoluteTime(event.created_at, timeZone)}
                >
                  {relativeAge(event.created_at)}
                </time>
                {" · "}
                {actorName(event.actor_type)}
              </span>
            </p>

            {note ? (
              <p className="mt-1 rounded-md bg-muted px-2 py-1.5 text-sm whitespace-pre-wrap">
                {note}
              </p>
            ) : null}

            {changes.length > 0 ? (
              <ul className="mt-1 flex flex-col gap-0.5">
                {changes.map((change) => (
                  <li key={change.field} className="text-xs text-muted-foreground">
                    {change.field}: {change.from} → {change.to}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
