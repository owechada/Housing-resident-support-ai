# Case study

## The bottleneck

The bottleneck is not the repair — it is the gap between a resident noticing a
problem and the manager having enough information to act on it. Reports arrive
as a phone call or a loose message with no flat number, onset, access window or
photo, so the manager conducts the interview themselves across one or two
callbacks, and anything reported after hours is not logged until someone
remembers it. The delay is entirely administrative: collecting five or six
facts the resident already knew when they first picked up the phone.


## What I built

A complete intake system for estate repairs across WhatsApp, Telegram and web
chat. The agent identifies the resident and their unit, answers routine
questions from a knowledge base, interviews for anything needing repair,
verifies the photo is usable, and creates a structured routed ticket.

The manager gets four screens and no training: a work queue where emergencies
and anything the agent was unsure of are marked so they cannot be scrolled
past; a ticket page carrying the facts, the photo, the conversation and the
full history, with every field correctable; the conversations as they happened;
and a summary of whether the agent is actually doing its job. Only a human
closes a ticket.

## Decisions I would defend

**Open access over verified-only.** Unknown senders are registered in
conversation rather than refused. Refusing them is safer on paper and fails the
person with an actual leak. Self-registered residents are flagged unverified so
the trade-off sits in front of the manager rather than being hidden behind a
rejection. Production would verify against the estate's resident roll.

**Strict photo verification.** Every image is judged against what the resident
described, and rejected if a photo not related to the reported issue.

**Questions answered are successes, not absences.** Self-resolutions are logged
in their own table. A system optimised only on ticket quality quietly turns
every answerable question into work for the manager.

**Human-close enforced in the database.**  The back support agent cannot close
a ticket only the manager (The human) in the loop can do that.

**The gate is code, not judgement.** The agent decides *when* a report is
complete. Deterministic code in the ticket sub-workflow decides *where it
lands*: it re-checks the required fields itself, and a missing field or
confidence below 0.7 sets the status to `needs_review` rather than `open`.
Trusting the model to police its own completeness would put an incomplete
ticket in the manager's queue looking finished.



**No login screen on the demo.** 
The back-office is a a basic web-ui created to give the manager (The human) in the loop the control they need.
