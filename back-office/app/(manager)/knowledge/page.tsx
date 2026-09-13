import { KbAddForm } from "@/components/kb-add-form";
import { KbEntryCard } from "@/components/kb-entry-card";
import { requireManager } from "@/lib/auth";
import { estateTimeZone } from "@/lib/config";
import { existingCategories, fetchKnowledgeBase } from "@/lib/knowledge-base";

export const metadata = {
  title: "Knowledge base",
};

export default async function KnowledgePage() {
  const { supabase } = await requireManager();
  const entries = await fetchKnowledgeBase(supabase);
  const categories = existingCategories(entries);
  const timeZone = estateTimeZone();

  const active = entries.filter((entry) => entry.is_active).length;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">
      <h1 className="text-xl font-semibold tracking-tight">Knowledge base</h1>
      <p className="mt-1 max-w-prose text-sm text-muted-foreground">
        The answers the assistant gives without raising a ticket. This is your
        main lever over what the system does: if residents keep asking
        something, put the answer here and it stops becoming work for you.
      </p>

      {/*
        Setup note, not a permanent feature. The agent's search_knowledge_base
        tool filters on estate_id but not on is_active, so switching an entry off
        does not yet hide it. Delete this block once the tool sends
        is_active=eq.true.
      */}
      <div className="mt-4 rounded-md border border-amber-400 bg-amber-50 p-3">
        <p className="text-sm font-medium text-amber-900">Setup still needed</p>
        <p className="mt-1 text-sm text-amber-900">
          Switching an answer off does not stop the assistant using it yet — the
          workflow needs one more setting. Until that is done, delete an answer
          you want the assistant to stop giving, rather than switching it off.
        </p>
      </div>

      <div className="mt-6">
        <KbAddForm categories={categories} />
      </div>

      {entries.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed px-4 py-10 text-center">
          <p className="font-medium">No answers yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Start with the three questions you answer most — bin days, parking,
            heating hours. Every answer you add here is a ticket the assistant no
            longer needs to create.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-6 text-sm text-muted-foreground">
            {active} {active === 1 ? "answer" : "answers"} in use
            {entries.length > active
              ? `, ${entries.length - active} switched off`
              : ""}
          </p>

          <ul className="mt-2 overflow-hidden rounded-lg border">
            {entries.map((entry) => (
              <KbEntryCard
                key={entry.id}
                entry={entry}
                categories={categories}
                timeZone={timeZone}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
