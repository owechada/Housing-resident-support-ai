"use client";

import { useActionState, useState } from "react";

import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TICKET_STATUSES, type TicketStatus } from "@/lib/database.types";
import { STATUS_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

import {
  addNote,
  changeStatus,
  type ActionState,
} from "@/app/(manager)/tickets/[reference]/actions";

const initialState: ActionState = null;

/** Closing is the one thing a human must do, so it gets its own deliberate step. */
const CLOSING_STATUSES: TicketStatus[] = ["closed", "cancelled"];

export function TicketActions({
  reference,
  status,
}: {
  reference: string;
  status: TicketStatus;
}) {
  return (
    <div className="flex flex-col gap-6">
      <StatusForm reference={reference} status={status} />
      <NoteForm reference={reference} />
      <CloseForm reference={reference} status={status} />
    </div>
  );
}

function StatusForm({
  reference,
  status,
}: {
  reference: string;
  status: TicketStatus;
}) {
  const [state, action, pending] = useActionState(changeStatus, initialState);

  return (
    <form action={action} className="flex flex-col gap-2">
      <Label htmlFor="status">Status</Label>

      <div className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="reference" value={reference} />
        <NativeSelect
          id="status"
          name="status"
          defaultValue={status}
          className="min-w-[11rem]"
        >
          {TICKET_STATUSES.filter(
            (option) => !CLOSING_STATUSES.includes(option),
          ).map((option) => (
            <option key={option} value={option}>
              {STATUS_LABELS[option]}
            </option>
          ))}
        </NativeSelect>

        <Button type="submit" disabled={pending} className="h-11">
          {pending ? "Updating…" : "Update status"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        The resident is told automatically. No date or cost is ever promised on
        your behalf.
      </p>

      <Feedback state={state} />
    </form>
  );
}

function NoteForm({ reference }: { reference: string }) {
  const [state, action, pending] = useActionState(addNote, initialState);

  return (
    <form action={action} className="flex flex-col gap-2">
      <Label htmlFor="note">Add a note</Label>
      <input type="hidden" name="reference" value={reference} />
      <Textarea
        id="note"
        name="note"
        rows={3}
        placeholder="What you found, who you called, what happens next."
      />
      <p className="text-xs text-muted-foreground">
        For your records only. The resident never sees this.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          variant="outline"
          disabled={pending}
          className="h-11"
        >
          {pending ? "Saving…" : "Add note"}
        </Button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

/**
 * Two taps to close, because it is the end of the line and nothing automated can
 * undo it. The confirm step names the consequence rather than asking "are you sure".
 */
function CloseForm({
  reference,
  status,
}: {
  reference: string;
  status: TicketStatus;
}) {
  const [state, action, pending] = useActionState(changeStatus, initialState);
  const [confirming, setConfirming] = useState(false);

  const alreadySettled = CLOSING_STATUSES.includes(status);

  if (alreadySettled) {
    return (
      <div className="rounded-md border border-dashed p-3">
        <p className="text-sm text-muted-foreground">
          This ticket is {STATUS_LABELS[status].toLowerCase()}. Set a status
          above to reopen it.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-2 border-t pt-5">
      <input type="hidden" name="reference" value={reference} />

      {confirming ? (
        <>
          <p className="text-sm">
            Closing records you as the person who closed it, and tells the
            resident the job is done.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="submit"
              name="status"
              value="closed"
              variant="destructive"
              disabled={pending}
              className="h-11"
            >
              {pending ? "Closing…" : "Yes, close it"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-11"
              onClick={() => setConfirming(false)}
            >
              Keep it open
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => setConfirming(true)}
          >
            Close this ticket
          </Button>
          <Button
            type="submit"
            name="status"
            value="cancelled"
            variant="ghost"
            disabled={pending}
            className="h-11 text-muted-foreground"
          >
            Cancel it instead
          </Button>
        </div>
      )}

      <Feedback state={state} />
    </form>
  );
}

function Feedback({ state }: { state: ActionState }) {
  if (!state) return null;

  return (
    <p
      role="status"
      className={cn(
        "text-sm",
        state.ok ? "text-emerald-700" : "text-destructive",
      )}
    >
      {state.message}
    </p>
  );
}
