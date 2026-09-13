"use server";

import { revalidatePath } from "next/cache";

import { requireManager } from "@/lib/auth";
import { fetchEstateId } from "@/lib/knowledge-base";

export type KbState = { ok: boolean; message: string } | null;

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function validate(question: string, answer: string): string | null {
  if (!question) return "Write the question a resident would ask.";
  if (!answer) return "Write the answer the assistant should give.";
  if (question.length > 300) {
    return "That question is very long. Keep it to the words a resident would actually use.";
  }
  return null;
}

/**
 * Adds an entry. Once this exists, the assistant answers that question itself
 * and stops raising tickets for it — which is the whole point of the screen.
 */
export async function createEntry(
  _previous: KbState,
  formData: FormData,
): Promise<KbState> {
  const question = text(formData, "question");
  const answer = text(formData, "answer");
  const category = text(formData, "category") || null;

  const problem = validate(question, answer);
  if (problem) return { ok: false, message: problem };

  const { supabase } = await requireManager();
  const estateId = await fetchEstateId(supabase);

  const { error } = await supabase.from("knowledge_base").insert({
    estate_id: estateId,
    question,
    answer,
    category,
    is_active: true,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { ok: false, message: `Could not save it: ${error.message}` };
  }

  revalidatePath("/knowledge");
  return { ok: true, message: "Added. The assistant can answer this now." };
}

export async function updateEntry(
  _previous: KbState,
  formData: FormData,
): Promise<KbState> {
  const id = text(formData, "id");
  const question = text(formData, "question");
  const answer = text(formData, "answer");
  const category = text(formData, "category") || null;

  if (!id) return { ok: false, message: "Missing entry." };

  const problem = validate(question, answer);
  if (problem) return { ok: false, message: problem };

  const { supabase } = await requireManager();

  const { error } = await supabase
    .from("knowledge_base")
    .update({
      question,
      answer,
      category,
      // No trigger maintains this column, so it is set by hand on every write.
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { ok: false, message: `Could not save it: ${error.message}` };
  }

  revalidatePath("/knowledge");
  return { ok: true, message: "Saved." };
}

/** Switches an entry on or off without losing the wording. */
export async function setEntryActive(formData: FormData): Promise<void> {
  const id = text(formData, "id");
  const active = formData.get("active") === "true";
  if (!id) return;

  const { supabase } = await requireManager();

  await supabase
    .from("knowledge_base")
    .update({ is_active: active, updated_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/knowledge");
}

/**
 * Deletes an entry outright. Unlike a ticket, there is nothing to preserve here:
 * an answer that was wrong should stop existing rather than sit in the table
 * waiting to be switched back on by mistake.
 */
export async function deleteEntry(formData: FormData): Promise<void> {
  const id = text(formData, "id");
  if (!id) return;

  const { supabase } = await requireManager();
  await supabase.from("knowledge_base").delete().eq("id", id);

  revalidatePath("/knowledge");
}
