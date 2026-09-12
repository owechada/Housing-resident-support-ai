import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * A native <select>, on purpose. On a phone it opens the operating system's own
 * picker — a bigger target and a familiar gesture for someone doing this
 * one-handed in a corridor. A custom listbox would look tidier and work worse.
 *
 * h-11 is ~44px, the smallest comfortable touch target.
 */
export function NativeSelect({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-11 rounded-md border border-input bg-background px-3 text-sm",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
