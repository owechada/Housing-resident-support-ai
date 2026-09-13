import Link from "next/link";

import { Badge } from "@/components/ui/badge";

const NAV = [
  { href: "/", label: "Queue" },
  { href: "/messages", label: "Conversations" },
  { href: "/knowledge", label: "Knowledge base" },
  { href: "/summary", label: "Summary" },
] as const;

export function AppHeader({ email }: { email: string }) {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          Resident Support
        </Link>

        <nav aria-label="Main" className="flex items-center gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {/* Every visitor shares one manager account, so say so rather than
              implying these actions are attributable to a named person. */}
          <Badge variant="secondary">Demo</Badge>
          <span
            className="hidden text-sm text-muted-foreground sm:inline"
            title={email}
          >
            {email}
          </span>
        </div>
      </div>
    </header>
  );
}
