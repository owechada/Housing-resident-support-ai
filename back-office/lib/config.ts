/**
 * Configuration, read in one place so a missing variable fails with a sentence
 * the person deploying can act on rather than a null reference.
 *
 * Property access is written out literally on purpose: Next.js only inlines
 * NEXT_PUBLIC_* variables into the bundle when it can see the literal name.
 */
export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Copy back-office/.env.local.example to " +
        ".env.local and set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY from Supabase Settings -> API. " +
        "On Vercel, set them under Project Settings -> Environment Variables.",
    );
  }

  return { url, anonKey };
}

/**
 * The shared account every visitor is signed in as.
 *
 * This is a demo: there is no login screen, so proxy.ts signs each visitor in
 * as this one manager. Deliberately NOT NEXT_PUBLIC — the password is used
 * server-side only and never reaches the browser. What the visitor gets is an
 * ordinary Supabase session cookie, so row level security and the
 * enforce_human_close trigger work exactly as they would for a real manager.
 *
 * The consequence, stated plainly: anyone with the URL can read and act on the
 * whole queue. That is the intent here. Putting a login screen back means
 * restoring one form and dropping this function.
 */
export function demoManagerConfig() {
  const email = process.env.DEMO_MANAGER_EMAIL;
  const password = process.env.DEMO_MANAGER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "The demo manager account is not configured. Set DEMO_MANAGER_EMAIL and " +
        "DEMO_MANAGER_PASSWORD to the account you created under Supabase " +
        "Authentication -> Users. See docs/SETUP.md section 6.2.",
    );
  }

  return { email, password };
}

/**
 * Timezone used to print timestamps. Managers read "14:32" as local time, so
 * rendering in UTC on a server somewhere else would quietly mislead them.
 * Matches the estate's `timezone` column; overridable without a code change.
 */
export function estateTimeZone() {
  return process.env.ESTATE_TIMEZONE || "Europe/London";
}
