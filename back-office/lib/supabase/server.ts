import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { supabaseConfig } from "@/lib/config";
import type { Database } from "@/lib/database.types";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * It carries the signed-in manager's cookies, so every query runs as that
 * person and row level security applies. A new client per request — never
 * share one across requests.
 */
export async function createClient() {
  // Read cookies first. This is what marks the page as request-time rendered,
  // and doing it before the config check means a missing environment variable
  // shows up as a readable error in the browser instead of breaking the build.
  const cookieStore = await cookies();
  const { url, anonKey } = supabaseConfig();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies. That is fine: proxy.ts
          // refreshes the session on every request, so the tokens written
          // there are the ones that reach the browser.
        }
      },
    },
  });
}
