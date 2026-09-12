import { createClient } from "@/lib/supabase/server";

export type Manager = {
  id: string;
  email: string;
};

/**
 * Call this at the top of every page, action and route handler that reads or
 * writes estate data. Returns the manager together with a client already
 * carrying their session, so queries run as them and row level security applies.
 *
 * proxy.ts has already established the demo session by the time this runs, so
 * reaching the error below means the demo account itself is misconfigured, not
 * that someone is unauthenticated. Saying so beats a redirect loop.
 *
 * Pages call this for themselves rather than leaning on the layout: a layout
 * does not re-render on every navigation, so a layout-only check is not a check.
 */
export async function requireManager(): Promise<{
  manager: Manager;
  supabase: Awaited<ReturnType<typeof createClient>>;
}> {
  const supabase = await createClient();

  // Verifies the token with Supabase rather than trusting the cookie.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error(
      "Could not sign in as the demo manager. Check that DEMO_MANAGER_EMAIL " +
        "and DEMO_MANAGER_PASSWORD match a confirmed user under Supabase " +
        "Authentication -> Users. See docs/SETUP.md section 6.2.",
    );
  }

  return { manager: { id: user.id, email: user.email ?? "" }, supabase };
}
