"use client";

import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";

import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import {
  TICKET_STATUSES,
  TICKET_URGENCIES,
  type TicketStatus,
  type TicketUrgency,
} from "@/lib/database.types";
import { STATUS_LABELS, URGENCY_LABELS } from "@/lib/labels";
import {
  EMPTY_FILTERS,
  filtersToQuery,
  hasActiveFilters,
  type QueueFilters,
} from "@/lib/queue";

export function QueueFilterBar({ filters }: { filters: QueueFilters }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // push, not replace: the back button should undo a filter change.
  function apply(next: QueueFilters) {
    startTransition(() => {
      router.push(`/${filtersToQuery(next)}`);
    });
  }

  return (
    <div
      className="flex flex-wrap items-end gap-3"
      aria-busy={pending || undefined}
    >
      <Field label="Status" htmlFor="filter-status">
        <NativeSelect
          id="filter-status"
          className="min-w-[9rem]"
          value={filters.status ?? ""}
          onChange={(event) =>
            apply({
              ...filters,
              status: (event.target.value || null) as TicketStatus | null,
            })
          }
        >
          <option value="">Any status</option>
          {TICKET_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <Field label="Urgency" htmlFor="filter-urgency">
        <NativeSelect
          id="filter-urgency"
          className="min-w-[9rem]"
          value={filters.urgency ?? ""}
          onChange={(event) =>
            apply({
              ...filters,
              urgency: (event.target.value || null) as TicketUrgency | null,
            })
          }
        >
          <option value="">Any urgency</option>
          {TICKET_URGENCIES.map((urgency) => (
            <option key={urgency} value={urgency}>
              {URGENCY_LABELS[urgency]}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <Button
        type="button"
        variant={filters.attention ? "default" : "outline"}
        aria-pressed={filters.attention}
        className="h-11"
        onClick={() => apply({ ...filters, attention: !filters.attention })}
      >
        Needs attention
      </Button>

      {hasActiveFilters(filters) ? (
        <Button
          type="button"
          variant="ghost"
          className="h-11"
          onClick={() => apply(EMPTY_FILTERS)}
        >
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium text-muted-foreground"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
