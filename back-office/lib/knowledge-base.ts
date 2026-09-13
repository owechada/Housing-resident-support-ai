import type { KnowledgeBaseRow } from "@/lib/database.types";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export type KnowledgeEntry = KnowledgeBaseRow;

/**
 * The estate a new entry belongs to.
 *
 * One estate, so this is a lookup rather than a choice. Reading it here means the
 * operator never has to paste a uuid they have no way to check — and if the
 * seed has not been run, they get a sentence saying so instead of a constraint
 * violation from Postgres.
 */
export async function fetchEstateId(supabase: Client): Promise<string> {
  const { data, error } = await supabase.from("estates").select("id").limit(2);

  if (error) {
    throw new Error(
      `Could not read the estate: ${error.message}. If this says permission ` +
        `denied, db/rls.sql has not been run on this project.`,
    );
  }

  if (!data || data.length === 0) {
    throw new Error(
      "No estate exists yet. Run db/schema.sql, which creates the one estate " +
        "this system manages.",
    );
  }

  if (data.length > 1) {
    throw new Error(
      "More than one estate exists. This back office manages a single estate; " +
        "adding a second is a data change with a screen to go with it.",
    );
  }

  return data[0].id;
}

export async function fetchKnowledgeBase(
  supabase: Client,
): Promise<KnowledgeEntry[]> {
  const { data, error } = await supabase
    .from("knowledge_base")
    .select("*")
    // Switched-off entries sink to the bottom; most recently touched first.
    .order("is_active", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(
      `Could not load the knowledge base: ${error.message}. If this says ` +
        `permission denied, db/rls.sql has not been run on this project.`,
    );
  }

  return data ?? [];
}

/** Existing categories, for the suggestion list on the form. */
export function existingCategories(entries: KnowledgeEntry[]): string[] {
  const seen = new Set<string>();
  for (const entry of entries) {
    if (entry.category) seen.add(entry.category);
  }
  return [...seen].sort();
}
