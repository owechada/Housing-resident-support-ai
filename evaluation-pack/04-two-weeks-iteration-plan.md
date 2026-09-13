# Next two-week iteration plan

Ordered by what the manager loses if it is missing, not by what is interesting
to build.

## Week 1 — close the loops that are open

**1. Manager-triggered status updates.** *(2 days)*
The system currently goes quiet after the ticket is created. The resident has
no idea whether anyone read it, which is the exact anxiety the phone call
produced. Status changes in the back office push a plain-language message back
on the channel the report came from.

**2. Resident reopen path.** *(1 day)*
A resident can reply to a "resolved" update to say it is not fixed, which
reopens the ticket and records the dispute. Without this, "resolved" means
"the manager thinks so", and the reopen rate cannot be measured.

**3. Second alert channel.** *(half day)*
Telegram alert to the manager alongside email. Email alerts now fail silently
by design — a ticket can exist with nobody told. One credential already
configured, and it gives the demo a visibly instant alert.

**4. Operational config in the database.** *(1 day)*
Alert address, confidence threshold and routing move from the workflow into the
`config` table with a settings screen. Until this ships, every operational
change needs a developer, which is the dependency the brief exists to test.

**5. Run the full evaluation.** *(half day)*
Twelve cases from identical state, fix what fails, re-run. Produces the
before-and-after the case study is missing.

## Week 2 — make it defensible

**6. Verify self-registration.** *(2 days)*
Match new registrations against the estate's resident roll, or a manager-issued
code. Keeps open access while removing the unverified caveat. The single
biggest gap between this and something a real estate would run.

**7. Homeowner read-only role.** *(1 day)*
RLS policies plus a filtered view, so an owner sees their own units and nothing
else. Proves the permission model does more than hide buttons.

**8. Knowledge base from real questions.** *(1 day)*
Replace the seeded entries with what residents actually ask, taken from the
first week of live conversations. The knowledge base is the manager's main
lever and it is currently my invention, not their data.

**9. Model A/B.** *(1 day)*
The agent runs on a small model and drifts toward formal register under prompt
pressure. Run the twelve cases against a larger model, compare tone and field
completeness, and document the rationale either way.

**10. Week-two review.** *(half day)*
Read every conversation from the fortnight — not a sample. Categorise failures,
fix the top two, re-run the regression.

