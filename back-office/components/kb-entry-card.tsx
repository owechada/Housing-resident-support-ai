"use client";

import { useActionState, useState } from "react";

import { KbFields } from "@/components/kb-fields";
import { KbSubmitButton } from "@/components/kb-submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { KnowledgeEntry } from "@/lib/knowledge-base";
import { absoluteTime } from "@/lib/labels";
import { cn } from "@/lib/utils";

import {
  deleteEntry,
  setEntryActive,
  updateEntry,
  type KbState,
} from "@/app/(manager)/knowledge/actions";

const initialState: KbState = null;

export function KbEntryCard({
  entry,
  categories,
  timeZone,
}: {
  entry: KnowledgeEntry;
  categories: string[];
  timeZone: string;
}) {
  const [state, action, pending] = useActionState(updateEntry, initialState);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (editing) {
    return (
      <li className="border-b p-4 last:border-b-0">
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={entry.id} />

          <KbFields
            idPrefix={`entry-${entry.id}`}
            categories={categories}
            defaults={{
              question: entry.question,
              answer: entry.answer,
              category: entry.category,
            }}
          />

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending} className="h-11">
              {pending ? "Saving…" : "Save changes"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-11"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
            {state ? (
              <p
                role="status"
                className={cn(
                  "text-sm",
                  state.ok ? "text-emerald-700" : "text-destructive",
                )}
              >
                {state.message}
              </p>
            ) : null}
          </div>
        </form>
      </li>
    );
  }

  return (
    <li
      className={cn(
        "border-b p-4 last:border-b-0",
        !entry.is_active && "bg-muted/40",
      )}
    >
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <p className={cn("font-medium", !entry.is_active && "text-muted-foreground")}>
          {entry.question}
        </p>
        {entry.category ? (
          <Badge variant="outline" className="text-muted-foreground">
            {entry.category}
          </Badge>
        ) : null}
        {!entry.is_active ? (
          <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
            Switched off
          </Badge>
        ) : null}
      </div>

      <p className="mt-1.5 text-sm whitespace-pre-wrap">{entry.answer}</p>

      <p className="mt-2 text-xs text-muted-foreground">
        Last changed{" "}
        <time dateTime={entry.updated_at}>
          {absoluteTime(entry.updated_at, timeZone)}
        </time>
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setEditing(true)}
        >
          Edit
        </Button>

        <form action={setEntryActive}>
          <input type="hidden" name="id" value={entry.id} />
          <input
            type="hidden"
            name="active"
            value={entry.is_active ? "false" : "true"}
          />
          <KbSubmitButton
            variant="ghost"
            className="h-9 text-muted-foreground"
            pendingLabel="…"
          >
            {entry.is_active ? "Switch off" : "Switch on"}
          </KbSubmitButton>
        </form>

        {confirmingDelete ? (
          <form action={deleteEntry} className="flex items-center gap-2">
            <input type="hidden" name="id" value={entry.id} />
            <span className="text-sm">Delete for good?</span>
            <KbSubmitButton
              variant="destructive"
              className="h-9"
              pendingLabel="Deleting…"
            >
              Yes, delete
            </KbSubmitButton>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirmingDelete(false)}
            >
              Keep it
            </Button>
          </form>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setConfirmingDelete(true)}
          >
            Delete
          </Button>
        )}
      </div>
    </li>
  );
}
