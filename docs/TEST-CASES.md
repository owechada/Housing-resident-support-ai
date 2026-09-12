# Labelled Test Set — Resident Support AI

Twelve scored cases covering representative, edge and failure scenarios, plus a
separate adversarial set used on Day 4 to break the system deliberately.

**Headline metric:** field completeness rate — the proportion of created tickets
that carry every required slot (category, unit, description, urgency, onset,
access window, photo or an explicit refusal).

**Run discipline.** Every case starts from identical state. Run `eval/reset.sql`
for the test number before each case, or results are not comparable between the
Day 4 before-and-after runs. Record every run in `eval_runs` with the case ID,
the full transcript, the resulting ticket (or its absence), and pass/fail per
criterion.

**Scoring.** Each case is pass / partial / fail.
*Partial* means the outcome was correct but a criterion was missed — a ticket
with the right category but a missing onset, or a correct answer delivered in a
robotic register. Partial counts as a fail for the headline metric and is
tracked separately for tone.

**Seed dependency.** Cases reference units that must exist in the seeded estate:
`Flat 3, Hawthorn House`, `Flat 12, Hawthorn House`, `Flat 7, Rowan House`.
Phone numbers are `+44` format. Knowledge base must contain entries for bin
collection, communal heating, parking permits and fire alarm testing.

---

## Scored cases

### TC-01 — Bare greeting
**Type:** representative · **Channel:** WhatsApp · **State:** registered resident

**Input:** `hi`

**Expected:** one short, warm line inviting them to say what's up. Nothing else.

**Pass criteria**
- No list of categories offered, in any form
- No mention of "maintenance issue", "emergency", "general enquiry" as options
- One or two sentences, not a paragraph
- No ticket created, no tool called

**Watch for:** the menu regression. This is the first thing a grader types and
the failure mode the prompt was rewritten to kill. Re-check it after every
prompt edit.

---

### TC-02 — Clear maintenance report with photo
**Type:** representative · **Channel:** WhatsApp · **State:** registered resident

**Input sequence**
1. `The extractor fan in the bathroom has stopped working`
2. *(responds to photo request with an image)*
3. *(answers onset)* `about a week`
4. *(answers access)* `weekdays after 5`

**Expected:** silent classification as maintenance, photo requested as its own
message immediately after the issue and location are known, then onset, then
access. Ticket created with a reference returned.

**Pass criteria**
- Photo requested *before* onset and access questions
- Photo request is its own message, not bundled with another question
- `photo_url` on the ticket row is populated and the image loads
- All required slots present — field completeness
- Reference number returned to the resident in plain language
- Manager alert fires
- Four to five exchanges total, not ten

**Watch for:** the cross-execution photo bug. The URL must survive from the
upload turn to the ticket creation turn.

---

### TC-03 — Vague opener
**Type:** edge · **Channel:** WhatsApp · **State:** registered resident

**Input:** `something's wrong in my flat`

**Expected:** the agent asks what's happening, one question, conversationally.
It must not guess a category, must not offer a list, and must not create a
ticket until it knows what is actually broken.

**Pass criteria**
- Asks an open question rather than proposing options
- No ticket created from the opening message
- Reaches a usable description within three exchanges

---

### TC-04 — Knowledge base question, resolved without a ticket
**Type:** representative · **Channel:** WhatsApp · **State:** registered resident

**Input:** `which day do the bins get collected?`

**Expected:** a grounded answer from the knowledge base. `log_self_resolution`
called. **No ticket.**

**Pass criteria**
- Answer matches the seeded KB entry and invents nothing
- No ticket row created
- `self_resolutions` row written
- No photo requested — nothing physical to look at

**Watch for:** ticket-creation reflex. A resolved question is a success, and the
system must record it as one or the self-resolution metric reads as zero.

---

### TC-05 — Emergency
**Type:** representative · **Channel:** WhatsApp · **State:** registered resident

**Input:** `there's water coming through the kitchen ceiling and it's getting worse`

**Expected:** urgency recognised immediately. Minimal interview — this is the one
case where the agent does *not* work through the full slot list before acting.
Ticket created as urgent, manager alerted, resident told what to do now.

**Pass criteria**
- Urgency classified as emergency
- Ticket created within two exchanges
- Practical immediate advice given (stop tap, avoid the area) without
  pretending to dispatch anyone
- Manager alert fires
- Does not ask for an access window before escalating

---

### TC-06 — Damp and mould
**Type:** edge · **Channel:** WhatsApp · **State:** registered resident

**Input:** `there's black mould spreading on the bedroom wall behind the wardrobe`

**Expected:** classified as damp and mould in its own right, not folded into
general maintenance or structural. Photo requested. Ticket created.

**Pass criteria**
- Category is damp/mould specifically
- Photo requested early
- Treated as significant rather than routine

**Why this case exists:** a UK property manager operates under the Homes
(Fitness for Human Habitation) Act, and social landlords under Awaab's Law.
Correct categorisation here is the single clearest signal that the system
understands their world. SLA enforcement remains a non-goal.

---

### TC-07 — Photo refused
**Type:** edge · **Channel:** WhatsApp · **State:** registered resident

**Input sequence**
1. `the kitchen tap is dripping constantly`
2. *(to the photo request)* `cant right now im at work`

**Expected:** immediate acceptance, `photo_status` recorded as refused, interview
continues, ticket still created.

**Pass criteria**
- No second photo request, ever
- No guilt-tripping or re-framing of the ask
- `photo_status` is `refused`, not null
- Ticket still created with all other slots complete

---

### TC-08 — Unknown sender, self-registration, ticket
**Type:** representative · **Channel:** WhatsApp · **State:** unknown number

**Input sequence**
1. `hello the radiator in my living room is cold`
2. *(to the registration ask)* `Sarah Whitfield, Flat 7 Rowan House`
3. *(continues the interview)*

**Expected:** the sender is not turned away. Name and unit requested in one
message, `register_resident` called, resident flagged `is_self_registered`,
interview resumes without re-asking the name, ticket created with the returned
resident_id and unit_id.

**Pass criteria**
- No refusal or "I can't help you" at any point
- Name and unit asked together, once
- `residents` row created with `is_self_registered = true`
- `channel_identities` row links the number
- Ticket carries a real unit_id
- Back office shows the resident as unverified

---

### TC-09 — Unit not recognised
**Type:** failure-handling · **Channel:** WhatsApp · **State:** unknown number

**Input sequence**
1. `my shower isn't draining`
2. `Block D Flat 2`

**Expected:** `register_resident` returns `unit_not_found`. The agent calls
`list_units` and offers the real options rather than repeating the question or
accepting the bad value.

**Pass criteria**
- The invalid unit is not written to the database
- Real unit options are offered
- Recovery happens without the resident having to start over
- Tone stays helpful, not accusatory

---

### TC-10 — Two intents in one message
**Type:** edge · **Channel:** WhatsApp · **State:** registered resident

**Input:** `the heating's been off since yesterday and also how do I get a parking permit?`

**Expected:** both handled. The question answered from the knowledge base, the
issue taken into an interview. One ticket, one self-resolution.

**Pass criteria**
- Neither intent silently dropped
- Ticket covers the heating only, with the parking question not contaminating
  the description
- `self_resolutions` row written for the permit answer
- Does not answer both in one overloaded message

---

### TC-11 — Non-native speaker, fragmented English
**Type:** edge · **Channel:** WhatsApp · **State:** registered resident

**Input sequence**
1. `door no close good. is broken`
2. `front door. it no lock`

**Expected:** comprehension without condescension. The agent does not correct
the English, does not mirror broken grammar back, and does not ask the resident
to rephrase. It recognises a security-relevant issue and treats it with urgency.

**Pass criteria**
- Understood without a clarification request on the first message
- Reply uses short, simple sentences
- No mimicry of the resident's grammar
- A door that won't lock is escalated, not queued as routine

**Note:** this case replaces the Pidgin case from the pre-pivot test set. It
tests the same robustness against the actual resident population.

---

### TC-12 — Out of scope
**Type:** failure-handling · **Channel:** WhatsApp · **State:** registered resident

**Input:** `how much is my rent going up next year and can I view a bigger flat?`

**Expected:** a clear, friendly boundary. No invented figures, no invented
availability, no ticket. Points them at the manager for both.

**Pass criteria**
- No numbers invented
- No booking or viewing promised
- No ticket created
- The redirect is specific — who to contact — not a shrug

**Watch for:** hallucinated confidence. This is the case where a model is most
tempted to be helpful about things it cannot know.

---

## Day 4 adversarial set

Not scored for field completeness. Run after the twelve, to find failure cases
for the root-cause section. Three minimum are required by the brief; these six
give you a choice of the most interesting.

| ID | Break | What you're looking for |
|---|---|---|
| AD-01 | Photo with no text at all | Does it respond sensibly, or emit the "I didn't get any text" line? |
| AD-02 | Abandon mid-interview, return 90 minutes later with `sorry, back` | Does memory hold? Does it resume without re-asking answered slots? |
| AD-03 | Kill the model credential to force an API failure | Fallback reply, never silence. Does the resident get *something*? |
| AD-04 | 500-word rant containing one real issue | Does it extract the issue, or drown? |
| AD-05 | Emergency phrased calmly — `the smoke alarm has been chirping and there's a burning smell` | Urgency from content, not from tone |
| AD-06 | Same message sent three times rapidly | Duplicate tickets, or one? |

For each, record: what happened, the root cause in one line, the fix, and the
re-run result. That is the Day 4 deliverable.

---

## Coverage check

| Dimension | Cases |
|---|---|
| Representative | TC-01, TC-02, TC-04, TC-05, TC-08 |
| Edge | TC-03, TC-06, TC-07, TC-10, TC-11 |
| Failure handling | TC-09, TC-12, all AD |
| Ticket created | TC-02, TC-05, TC-06, TC-07, TC-08, TC-10 |
| Resolved without ticket | TC-04, TC-10 (partial), TC-12 |
| Registration path | TC-08, TC-09 |
| Photo path | TC-02 (supplied), TC-06 (supplied), TC-07 (refused), TC-04 (correctly not asked) |
| Tone only | TC-01, TC-03, TC-11 |

**Gap knowingly left:** all twelve run on WhatsApp. Run TC-02 and TC-08 on
Telegram and on the hosted chat as well — that is the channel-agnostic claim,
and it is cheap to evidence.