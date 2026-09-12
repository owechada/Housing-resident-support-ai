"use client";

import { useActionState } from "react";

import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  TICKET_CATEGORIES,
  TICKET_URGENCIES,
  type TicketCategory,
  type TicketUrgency,
} from "@/lib/database.types";
import { CATEGORY_LABELS, URGENCY_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

import { saveFacts, type ActionState } from "@/app/(manager)/tickets/[reference]/actions";

const initialState: ActionState = null;

export function TicketFactsForm({
  reference,
  facts,
  missingFields,
}: {
  reference: string;
  facts: {
    category: TicketCategory;
    urgency: TicketUrgency;
    location_in_unit: string | null;
    description: string | null;
    onset: string | null;
    access_window: string | null;
    safety_flag: boolean;
  };
  /** Field names the assistant could not fill. Shown as gaps, never hidden. */
  missingFields: string[];
}) {
  const [state, action, pending] = useActionState(saveFacts, initialState);
  const missing = new Set(missingFields);

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="reference" value={reference} />

      <div className="grid gap-5 sm:grid-cols-2">
        <FactField label="Kind of problem" htmlFor="category" missing={missing.has("category")}>
          <NativeSelect
            id="category"
            name="category"
            defaultValue={facts.category}
            className="w-full"
          >
            {TICKET_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {CATEGORY_LABELS[category]}
              </option>
            ))}
          </NativeSelect>
        </FactField>

        <FactField label="Urgency" htmlFor="urgency" missing={missing.has("urgency")}>
          <NativeSelect
            id="urgency"
            name="urgency"
            defaultValue={facts.urgency}
            className="w-full"
          >
            {TICKET_URGENCIES.map((urgency) => (
              <option key={urgency} value={urgency}>
                {URGENCY_LABELS[urgency]}
              </option>
            ))}
          </NativeSelect>
        </FactField>

        <FactField
          label="Where in the home"
          htmlFor="location_in_unit"
          missing={missing.has("location_in_unit")}
        >
          <Input
            id="location_in_unit"
            name="location_in_unit"
            defaultValue={facts.location_in_unit ?? ""}
            placeholder="Kitchen, bathroom, hallway…"
            className="h-11"
          />
        </FactField>

        <FactField label="When it started" htmlFor="onset" missing={missing.has("onset")}>
          <Input
            id="onset"
            name="onset"
            defaultValue={facts.onset ?? ""}
            placeholder="Yesterday evening, about a week ago…"
            className="h-11"
          />
        </FactField>
      </div>

      <FactField
        label="What is wrong"
        htmlFor="description"
        missing={missing.has("description")}
      >
        <Textarea
          id="description"
          name="description"
          defaultValue={facts.description ?? ""}
          rows={4}
          placeholder="What the resident reported, in enough detail to act on."
        />
      </FactField>

      <FactField
        label="When someone can come round"
        htmlFor="access_window"
        missing={missing.has("access_window")}
      >
        <Input
          id="access_window"
          name="access_window"
          defaultValue={facts.access_window ?? ""}
          placeholder="Weekday mornings, after 6pm…"
          className="h-11"
        />
      </FactField>

      <div
        className={cn(
          "flex items-start gap-3 rounded-md border p-3",
          missing.has("safety_flag") && "border-amber-400 bg-amber-50",
        )}
      >
        <input
          type="checkbox"
          id="safety_flag"
          name="safety_flag"
          defaultChecked={facts.safety_flag}
          className="mt-0.5 size-5 accent-red-600"
        />
        <div>
          <Label htmlFor="safety_flag" className="font-medium">
            Someone could be hurt if this is left
          </Label>
          <p className="text-sm text-muted-foreground">
            Gas, electrics, flooding, a door that will not lock.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending} className="h-11">
          {pending ? "Saving…" : "Save details"}
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

      <p className="text-xs text-muted-foreground">
        Every edit is recorded against this ticket, including what changed.
      </p>
    </form>
  );
}

/**
 * A field the assistant could not fill stays visible and is marked as a gap.
 * Hiding it would let an incomplete ticket look finished.
 */
function FactField({
  label,
  htmlFor,
  missing,
  children,
}: {
  label: string;
  htmlFor: string;
  missing: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={htmlFor}>{label}</Label>
        {missing ? (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900">
            The assistant did not get this
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}
