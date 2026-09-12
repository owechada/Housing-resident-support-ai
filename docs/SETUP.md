# Resident Support AI — v1 setup

Two workflows, one schema. Everything configurable lives in environment
variables or the database; nothing is hardcoded in the workflow.

## 1. Database

Run `schema.sql` in the Supabase SQL editor. Then create a **public** storage
bucket named `ticket-photos`.

Seed one estate, one unit, one resident, and a channel identity row for your
own WhatsApp number and Telegram ID, or nothing will resolve:

```sql
insert into units (estate_id, label)
  values ((select id from estates limit 1), 'Block C, Flat 4');

insert into residents (estate_id, unit_id, full_name)
  values ((select id from estates limit 1),
          (select id from units limit 1),
          'Test Resident');

insert into channel_identities (resident_id, channel, channel_user_id) values
  ((select id from residents limit 1), 'whatsapp', '2348012345678'),
  ((select id from residents limit 1), 'telegram', '123456789'),
  ((select id from residents limit 1), 'web_chat', 'demo-resident-1');
```

The `web_chat` identity is what persona demo links carry, so a grader opening
`.../chat?resident_ref=demo-resident-1` is already a resident and never gets
asked who they are.

## 2. n8n environment variables

Set these on the n8n instance, not in the nodes:

```
ESTATE_ID=<uuid from estates>
ESTATE_NAME=Demo Estate
SUPABASE_URL=https://<project>.supabase.co
WA_PHONE_NUMBER_ID=<from Meta>
MANAGER_EMAIL=manager@example.com
NOTIFY_FROM_EMAIL=noreply@yourdomain
BACK_OFFICE_URL=https://<your-vercel-app>
```

## 3. Credentials

Create these in n8n, then replace the `REPLACE_*_CRED` placeholders when
importing (n8n will prompt you per node):

| Placeholder | Credential type | Notes |
|---|---|---|
| `REPLACE_SUPABASE_CRED` | Header Auth | Name `apikey`, value = service role key. Add a second header `Authorization: Bearer <service key>` |
| `REPLACE_ANTHROPIC_CRED` | Anthropic API | Used by both the agent model and the vision call |
| `REPLACE_WA_CRED` | WhatsApp Business Cloud | |
| `REPLACE_TG_CRED` | Telegram | Bot token from BotFather |
| `REPLACE_PG_CRED` | Postgres | Supabase connection string, for chat memory |
| `REPLACE_SMTP_CRED` | SMTP | Manager notification email |

## 4. Import order

1. Import `resident-support-ai-create-ticket.json` first. Save it and copy its
   workflow ID.
2. Import `resident-support-ai-core.json`.
3. Open the `create_ticket` tool node and replace `REPLACE_SUBWORKFLOW_ID`
   with the ID from step 1.
4. Activate both.

## 5. Verify in this order

Do not skip to the end. Each step depends on the previous one.

1. **Hosted chat, text only.** Open the chat URL with `?resident_ref=demo-resident-1`
   and send "what is the wifi password". Should hit the knowledge base and
   return without creating a ticket.
2. **Hosted chat, interview.** Send "my AC is not working". It should ask which
   room and since when rather than creating a ticket immediately.
3. **Hosted chat, photo.** Attach an image. Check the `ticket-photos` bucket and
   confirm the vision analysis shows up in the agent's reasoning.
4. **Ticket creation.** Complete an interview. Confirm a row in `tickets`, a row
   in `ticket_events`, and an email in the manager inbox.
5. **Telegram.** Send `/start` to the bot first, then repeat step 2. Same
   behaviour, same slots, same routing.
6. **WhatsApp.** Same again. This is the one most likely to need fiddling.

## 6. Back office

The manager's queue. Next.js on Vercel, reading Supabase directly with the
**anon** key. The service_role key must never reach this app.

### 6.1 Row level security

Run `db/rls.sql` in the SQL editor, after `schema.sql`.

It is safe to re-run — every policy is dropped and recreated. Re-run it after
pulling changes; the summary screen needs a read policy on `self_resolutions`
that earlier versions of the file did not grant.

Do this before deploying, not after. The anon key ships inside the browser
bundle, so until those policies exist anyone who opens the page can read every
resident's maintenance history through the REST API. The file switches RLS on
for every table and then grants a signed-in manager read access to tickets,
events, messages, residents, units and self_resolutions, plus update on tickets
and insert on ticket_events. Nothing else.

The agent is unaffected: it writes with the service_role key, which bypasses RLS.

### 6.2 Create the demo manager account

There is no login screen. This is a demo, so `proxy.ts` signs every visitor in
as one shared manager account and they land straight on the queue.

In the Supabase dashboard: Authentication -> Users -> Add user. Set an email and
password, and tick "Auto Confirm User" so the account can sign in without an
email round trip. Put those two values in `DEMO_MANAGER_EMAIL` and
`DEMO_MANAGER_PASSWORD`.

**Leave public sign-ups off:** Authentication -> Sign In / Providers -> Email ->
disable "Allow new users to sign up". The demo account is the only one that
should exist, and anyone who can sign in is treated as a manager.

Be clear-eyed about what this means: anyone with the URL can read every
resident's name, unit and conversation, and can act on tickets. Two things are
still true, and they are the reason this is a demo door rather than a hole:

- The session is a real Supabase session, so row level security still governs
  every read and write, and `closed_by` still gets a genuine user id. The
  `enforce_human_close` trigger keeps working.
- The demo password is server-side only. It has no `NEXT_PUBLIC_` prefix, so it
  never reaches the browser bundle.

Seed the estate with demo data rather than a real one, and rotate the password
after the submission is judged.

### 6.3 Run it locally

```bash
cd back-office
cp .env.local.example .env.local   # then fill in the values
npm install
npm run dev
```

The Supabase URL and anon key come from Settings -> API.

`ESTATE_TIMEZONE` is optional and defaults to `Europe/London`. It only affects
how timestamps are printed, so a manager reading "14:32" sees their own clock
rather than the server's.

### 6.4 Telling residents about status changes

Not wired up yet, and the screens say so rather than pretending otherwise.

When a manager changes a ticket's status, the back office does not message the
resident itself — it posts to an n8n webhook, so the outbound dispatcher stays the
only thing that talks to WhatsApp, Telegram or web chat. Set
`N8N_STATUS_WEBHOOK_URL` (and optionally `N8N_WEBHOOK_SECRET`, sent as
`x-webhook-secret`) once that workflow exists.

Until then, a status change tells the manager in plain words that the resident has
not been told, and records that in the ticket's history. The payload deliberately
carries no free text, so no one can promise a repair date or a cost through it.
Internal notes are internal and are never sent.

## Known constraints

- **Chat streaming must stay off.** File uploads from the hosted chat fail when
  `responseMode` is streaming. The workflow ships with `lastNode`; leave it.
- **WhatsApp 24-hour window.** Free-form outbound only works within 24 hours of
  the resident's last message. Later status updates need an approved template.
  Test this on Day 2, not Day 4.
- **Telegram requires `/start`.** Bots cannot initiate. Note it in the runbook
  as an onboarding step.
- **Every chat message is one execution.** Relevant to the cost-per-request metric.
- **Set CORS origins and authentication on the chat trigger** before sharing the
  link. That endpoint writes real tickets.

## What is deliberately not here yet

v1 is the inbound half: resident → interview → gated ticket → manager email.

Not yet built: the outbound status loop back to the resident, and the reopen
path when a resident disputes a resolution.

The back office screens are built: queue, ticket detail, conversations and
summary. Still to do there: deploying it to Vercel.

Deliberate deferrals in the back office, each because the rubric rewards a
smaller thing done properly: knowledge base editing, settings, the review queue
as its own screen, the homeowner role, and contractor assignment.
