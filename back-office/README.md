# Back office

Where the property manager works the ticket queue. Next.js App Router,
Supabase, Tailwind + shadcn/ui, deployed to Vercel.

Full setup is in [`../docs/SETUP.md`](../docs/SETUP.md), section 6.

```bash
cp .env.local.example .env.local   # fill in the values
npm install
npm run dev
```

## There is no login screen

This is a demo and anyone should be able to try it. [`proxy.ts`](proxy.ts)
signs each visitor in as one shared manager account, so a grader opening the
link lands straight on the queue.

Said plainly: **anyone with the URL can read and act on the whole queue.** That
is the intent. What it is not is an unauthenticated app — the session created is
a real one, which is why the two guarantees below still hold. Restoring a login
form means deleting `demoManagerConfig()` and adding one page back.

| Layer | File | What it does |
|---|---|---|
| Session | `proxy.ts` | Refreshes the session, or signs the visitor in as the demo manager if they have none. |
| Verified check | `lib/auth.ts` | `requireManager()` validates the token with Supabase. Called at the top of every page and action that touches estate data. |
| Row level security | `../db/rls.sql` | Decides what that manager can actually read and write. Unchanged by the demo setup. |

The app only ever uses the **anon** key. The service_role key bypasses row level
security and belongs solely to n8n. The demo password is server-side only and
never reaches the browser.

## Two rules the code holds to

**The agent opens tickets; only a person closes them.** `tickets` is typed
`Insert: never` in [lib/database.types.ts](lib/database.types.ts) and has no
insert policy, so the back office cannot open one. Closing passes the session's
user id as `closed_by`, which the `enforce_human_close` trigger requires — the
demo account is a real Supabase user precisely so this keeps working. Do not
work around that trigger.

**Writes that reach a resident go through n8n**, so the outbound dispatcher stays
the single path to a resident. Manager-only changes may write to Supabase directly.

## Build order

1. Supabase client and session — **done**
2. Queue at `/` — **done**
3. Ticket detail at `/tickets/[reference]` — **done**
4. Conversations at `/messages` and `/messages/[resident]` — **done**
5. Summary at `/summary` — **done**
6. Deploy to Vercel

Deliberately not built, and not to be stubbed in: knowledge base editing,
settings, review queue, homeowner and demo roles, landing page, contractor
assignment.

## Screens

| Route | What it is for |
|---|---|
| `/` | The work queue. Emergencies and anything needing review are marked so they cannot be scrolled past. |
| `/tickets/[reference]` | One ticket: facts you can correct, the photo and conversation as evidence, the actions, and the full history. |
| `/messages` | Everyone who has messaged the assistant, with a per-resident summary. Read-only. |
| `/messages/[resident]` | One resident's thread and the tickets it produced. |
| `/summary` | Whether the assistant is doing its job — completeness, self-resolution, how often you had to step in, and which details it keeps failing to capture. |
