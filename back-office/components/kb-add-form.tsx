"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { KbFields } from "@/components/kb-fields";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { createEntry, type KbState } from "@/app/(manager)/knowledge/actions";

const initialState: KbState = null;

export function KbAddForm({ categories }: { categories: string[] }) {
  const [state, action, pending] = useActionState(createEntry, initialState);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the form after a save so the next answer starts from empty rather than
  // the manager deleting the last one by hand.
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" className="h-11" onClick={() => setOpen(true)}>
          Add an answer
        </Button>
        {state?.ok ? (
          <p role="status" className="text-sm text-emerald-700">
            {state.message}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-4 rounded-lg border p-4"
    >
      <h2 className="font-medium">Add an answer</h2>

      <KbFields idPrefix="new" categories={categories} />

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending} className="h-11">
          {pending ? "Saving…" : "Save answer"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-11"
          onClick={() => setOpen(false)}
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
  );
}
