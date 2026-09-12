import Link from "next/link";

import { requireManager } from "@/lib/auth";
import { CATEGORY_LABELS, STATUS_LABELS, fieldLabel } from "@/lib/labels";
import {
  fetchOverview,
  formatAge,
  formatPercent,
  type Rate,
} from "@/lib/overview";

export const metadata = {
  title: "Summary",
};

export default async function SummaryPage() {
  const { supabase } = await requireManager();
  const overview = await fetchOverview(supabase);

  if (overview.totalTickets === 0) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:py-8">
        <h1 className="text-xl font-semibold tracking-tight">Summary</h1>
        <div className="mt-6 rounded-lg border border-dashed px-4 py-10 text-center">
          <p className="font-medium">Nothing to summarise yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            These numbers describe how well the assistant is doing its job. They
            appear once residents start reporting problems.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:py-8">
      <h1 className="text-xl font-semibold tracking-tight">Summary</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        How well the assistant is handling reports, across{" "}
        {overview.totalTickets}{" "}
        {overview.totalTickets === 1 ? "ticket" : "tickets"}.
      </p>

      {overview.needsAttention > 0 ? (
        <Link
          href="/?attention=1"
          className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 transition-colors hover:bg-red-100"
        >
          <span className="text-sm font-medium text-red-900">
            {overview.needsAttention}{" "}
            {overview.needsAttention === 1 ? "ticket needs" : "tickets need"}{" "}
            attention now
          </span>
          <span className="text-sm text-red-900 underline underline-offset-4">
            Open them
          </span>
        </Link>
      ) : null}

      <section className="mt-6">
        <h2 className="text-base font-semibold">Is the assistant doing its job?</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Metric
            label="Reports complete first time"
            rate={overview.fieldCompleteness}
            explanation="Tickets where the assistant captured every detail, so nobody had to go back to the resident. This is the number that matters most."
            good="high"
          />
          <Metric
            label="Answered without a ticket"
            rate={overview.selfResolution}
            explanation="Questions the assistant settled from the knowledge base. A resident helped without creating work is a success, not a gap."
            good="high"
          />
          <Metric
            label="You had to step in"
            rate={overview.manualTouch}
            explanation="Tickets where a manager edited details, changed status or added a note. Some of this is normal — it is the trend that tells you something."
            good="low"
          />
          <Metric
            label="Came back after being resolved"
            rate={overview.reopened}
            explanation="Tickets a resident disputed after they were marked done. A rising number means jobs are being closed too early."
            good="low"
          />
        </div>
      </section>

      <section className="mt-8 grid gap-3 sm:grid-cols-2">
        <Panel title="Work in hand">
          <p className="text-3xl font-semibold">{overview.openTickets}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            tickets not yet closed
          </p>
          <p className="mt-3 text-sm">
            Typical age:{" "}
            <span className="font-medium">
              {formatAge(overview.medianOpenAgeHours)}
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Half of the open tickets are younger than this, half older.
          </p>
        </Panel>

        <Panel title="Where they are">
          <ul className="flex flex-col gap-1.5">
            {overview.statusCounts.map(({ status, count }) => (
              <li key={status} className="flex items-baseline justify-between gap-3">
                <span className="text-sm">{STATUS_LABELS[status]}</span>
                <span className="text-sm font-medium">{count}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      {overview.missingFieldCounts.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-base font-semibold">
            What the assistant keeps failing to ask
          </h2>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">
            The details most often missing when a ticket arrives. The most common
            one is where to improve the interview.
          </p>
          <Panel>
            <ul className="flex flex-col gap-2">
              {overview.missingFieldCounts.map(({ field, count }) => (
                <li key={field}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm">{fieldLabel(field)}</span>
                    <span className="text-sm font-medium">
                      {count} of {overview.totalTickets}
                    </span>
                  </div>
                  <Bar fraction={count / overview.totalTickets} tone="warn" />
                </li>
              ))}
            </ul>
          </Panel>
        </section>
      ) : (
        <p className="mt-8 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          No ticket is missing a detail. The interview is getting everything it
          asks for.
        </p>
      )}

      <section className="mt-8">
        <h2 className="text-base font-semibold">
          Which problems you correct most
        </h2>
        <p className="mt-1 mb-3 text-sm text-muted-foreground">
          How often you had to edit the assistant&apos;s details, by kind of
          problem. A high rate in one category usually means the assistant is
          misreading that kind of report.
        </p>
        <Panel>
          <ul className="flex flex-col gap-2">
            {overview.overridesByCategory.map((row) => (
              <li key={row.category}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm">{CATEGORY_LABELS[row.category]}</span>
                  <span className="text-sm font-medium">
                    {row.overridden} of {row.tickets} corrected
                  </span>
                </div>
                <Bar fraction={row.rate} tone="warn" />
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      {overview.truncated ? (
        <p className="mt-6 text-xs text-muted-foreground">
          Based on the most recent records only. Once there is this much history,
          these numbers belong in a database view rather than being counted here.
        </p>
      ) : null}
    </div>
  );
}

/**
 * A rate with the raw counts underneath. "78%" alone invites a manager to read
 * confidence into three tickets, so the denominator is always shown.
 */
function Metric({
  label,
  rate,
  explanation,
  good,
}: {
  label: string;
  rate: Rate;
  explanation: string;
  good: "high" | "low";
}) {
  const tone =
    rate.value === null
      ? "neutral"
      : good === "high"
        ? rate.value >= 0.8
          ? "good"
          : rate.value >= 0.5
            ? "warn"
            : "bad"
        : rate.value <= 0.2
          ? "good"
          : rate.value <= 0.5
            ? "warn"
            : "bad";

  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-1 text-3xl font-semibold">{formatPercent(rate.value)}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {rate.value === null
          ? "Not enough has happened yet to say"
          : `${rate.numerator} of ${rate.denominator}`}
      </p>
      {rate.value !== null ? <Bar fraction={rate.value} tone={tone} /> : null}
      <p className="mt-2 text-xs text-muted-foreground">{explanation}</p>
    </div>
  );
}

const BAR_TONES = {
  good: "bg-emerald-500",
  warn: "bg-amber-500",
  bad: "bg-red-500",
  neutral: "bg-muted-foreground",
} as const;

function Bar({
  fraction,
  tone,
}: {
  fraction: number;
  tone: keyof typeof BAR_TONES;
}) {
  const percent = Math.max(0, Math.min(100, Math.round(fraction * 100)));

  return (
    <div
      className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted"
      aria-hidden="true"
    >
      <div
        className={`h-full rounded-full ${BAR_TONES[tone]}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-4">
      {title ? <p className="mb-2 text-sm font-medium">{title}</p> : null}
      {children}
    </div>
  );
}
