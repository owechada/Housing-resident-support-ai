import type { ReactNode } from "react";

import { AppHeader } from "@/components/app-header";
import { requireManager } from "@/lib/auth";

/**
 * Everything under this group needs a signed-in manager. The pages check for
 * themselves too — a layout does not re-render on every navigation, so a
 * layout-only check is not a check.
 */
export default async function ManagerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { manager } = await requireManager();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader email={manager.email} />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
