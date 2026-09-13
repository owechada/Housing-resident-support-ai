import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * The three fields of an entry, shared by the add and edit forms so the wording
 * a manager reads is identical in both.
 */
export function KbFields({
  idPrefix,
  categories,
  defaults,
}: {
  idPrefix: string;
  categories: string[];
  defaults?: { question: string; answer: string; category: string | null };
}) {
  const listId = `${idPrefix}-categories`;

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-question`}>
          What does the resident ask?
        </Label>
        <Input
          id={`${idPrefix}-question`}
          name="question"
          defaultValue={defaults?.question ?? ""}
          placeholder="What day are the bins collected?"
          className="h-11"
          required
        />
        <p className="text-xs text-muted-foreground">
          Use the words a resident would actually use, not a formal title.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-answer`}>What should the assistant say?</Label>
        <Textarea
          id={`${idPrefix}-answer`}
          name="answer"
          defaultValue={defaults?.answer ?? ""}
          rows={4}
          placeholder="General waste is collected on Tuesday mornings. Recycling is Friday."
          required
        />
        <p className="text-xs text-muted-foreground">
          Write it as the answer itself. Do not promise a date, a cost, or that
          someone is on their way.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-category`}>Group it under (optional)</Label>
        <Input
          id={`${idPrefix}-category`}
          name="category"
          defaultValue={defaults?.category ?? ""}
          placeholder="Waste, Parking, Heating…"
          className="h-11"
          list={listId}
        />
        <datalist id={listId}>
          {categories.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
      </div>
    </>
  );
}
