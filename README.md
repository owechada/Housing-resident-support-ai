# Housing Resident Support AI
 
## The problem
 
Something breaks in a resident's flat, for instance say the boiler stops working. They ring
the estate office. If it's past 5pm on a friday, or the weekend, or the one person who
handles repairs is already on a call, nobody picks up. The report just doesn't
happen.
 
If someone does answer, they write down what they heard: "boiler not working,
Flat 12." That's not enough to send anyone out. You'd need to know how long it's
been off, whether there's still hot water, when the resident can let an engineer
in, and ideally see a photo. None of that was asked.
 
So the manager rings the resident back to ask. Often more than once. Between the
resident noticing the problem and anyone being in a position to fix it, days can
pass and almost none of that time is the repair itself. It's just the
back-and-forth to collect five or six facts the resident already knew when they
first picked up the phone.
 
## What this does
 
It moves that interview to the moment the resident reports the problem, and does
it for them.
 
The resident sends a WhatsApp or Telegram message, like they'd message anyone.
The agent already knows who they are and which flat they're in, so it doesn't
ask. If it's a question it can answer bin day, parking permits, heating hours
 it just answers, and no ticket is created.
 
If something needs fixing, it asks the questions the manager would have asked:
what's wrong, where in the flat, how long it's been like that, when someone can
come round, and a photo. It checks the photo actually shows the problem if
it's too dark or shows the wrong thing, it says so kindly and asks for another.
 
By the end of that conversation there's a proper ticket in the back office:
categorised, prioritised, with every field filled in and the photo attached. The
manager opens it and can act immediately. No callback.
 
When they update it, the resident hears back in the same chat. There's no portal
to log into and no password to forget. And if the resident replies to say it
isn't actually fixed, that reopens the ticket.
 
---

## Try it out

| WhatsApp | Telegram |
|:--:|:--:|
| <img src="docs/img/qr-whatsapp.png" width="180" alt="Chat on WhatsApp"> | <img src="docs/img/qr-telegram.png" width="180" alt="Chat on Telegram"> |
| [wa.me](https://wa.me/2349110574691?text=Hi) | [t.me](https://t.me/atlantizzz_bot) |


<img src="evaluation-pack/img/tc-02.PNG" width="200">

Say something is broken and answer what it asks.


- Manager's view (Back-Office): https://backoffice-resident-ai.vercel.app — opens straight into the queue, auto sign-in - demo


<img src="docs/img/back-office.png" width="500">

---

## Design rules

**Nothing becomes a ticket mid-interview.** Ticket creation is a tool the agent
calls once the required fields are complete. Abandoned conversations leave no
mess.

**Only a human closes a ticket.** Enforced by a database trigger, not a prompt.

**Questions answered are successes.** Bin days, parking permits, heating hours
resolve without a ticket and are logged as self-resolutions.

**Unknown senders are registered, not refused.** The flat number is a required
field, not a permission gate. Self-registered residents are flagged unverified.

**Photos must be usable.** Every image is checked against what was described.
Too dark, too far, or wrong subject is rejected and another asked for.

---

## Architecture

<img src="docs/img/architecture.png" width="500">

Each adapter normalises to one envelope: `{ channel, channel_user_id, text,
media[], timestamp }`. Nothing downstream knows the channel. Adding Telegram
took one adapter and one send node.

| Layer | Stack |
|---|---|
| Orchestration | n8n — core workflow + ticket sub-workflow |
| Agent | OpenAI, Postgres-backed conversation memory |
| Vision | GPT-4o, usable/reject verdict per photo |
| Data | Supabase — Postgres, storage, auth, RLS |
| Back office | Simple web ui for manager to miror Supabase |

---

## Reproduce it

**1. Database.** In the Supabase SQL editor, nothing highlighted, run in order:

```
db/schema.sql   --  tables, human-close trigger, register_resident()
db/seed.sql     --  estate, units, residents, knowledge base entries
db/rls.sql      --  row level security
```

Then create a public storage bucket named `ticket-photos` on the Supabase project.


**2. Workflows.** Import sub-workflow first:

```
n8n-workflows/resident-support-ai-create-ticket.json
n8n-workflows/resident-support-ai-core.json
```

Attach credentials where flagged: Supabase, OpenAI, WhatsApp, Telegram,
Postgres (pooler, **port 6543**), SMTP. Set your values in the **Settings**
node — every environment value lives there. Activate both, then point the
WhatsApp webhook at the trigger's production URL.

**3. Back office.** add the .env variable from the env.example

**Verify:** message the bot, report a leaking tap, send a photo. A ticket
appears in the back office within seconds.

---

## Testing

Thirteen labelled cases in `evaluation-pack/02-test-cases.md`, with results in
`evaluation-pack/03-results-from-test-cases.md`.

Headline metric: **field completeness rate** — tickets carrying every field a
manager needs to act without asking anything further.

---

## Current state

Running: three channels, identity and self-registration, knowledge base
answers, full interview with photo verification, ticket creation with
confidence scoring and review queue, manager email alerts, retries on every
network call.

Also running: the back office — queue, ticket detail, conversations, knowledge
base and summary, deployed and linked at the top of this page.

In progress: manager-triggered status updates and the reopen path, and the
thirteen-case evaluation run.

## Known limits

- One estate. Multi-estate is a data change, not a feature.
- Self-registration is unverified. Production would check the resident roll.
  Deliberate: refusing unknown senders fails the person with the actual leak.
- No SLA tracking, vendor dispatch, or cost estimation. The system's job ends
  when a complete ticket reaches a human.
- Manager alerts are email only. Silent SMTP failure means no alert.
- Telegram's typing indicator lasts 5 seconds; a slow reply outlasts it.

## Repo

```
n8n-workflows/    n8n exports — core + ticket sub-workflow
db/               schema, seed, row level security
back-office/      manager interface (Next.js)
evaluation-pack/  case study, test cases, results, iteration plan
docs/             runbook, images
```