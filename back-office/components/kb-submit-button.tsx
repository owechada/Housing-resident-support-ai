"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

/**
 * A submit button that knows its own form is busy. Sits inside the form it
 * submits, which is what useFormStatus reports on.
 */
export function KbSubmitButton({
  children,
  pendingLabel,
  variant = "outline",
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary";
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      disabled={pending}
      className={className}
    >
      {pending ? (pendingLabel ?? "Working…") : children}
    </Button>
  );
}
