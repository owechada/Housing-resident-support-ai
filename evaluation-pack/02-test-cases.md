# Labelled Test Set — Resident Support AI

Twelve scored cases covering representative, edge and failure scenarios.

**Headline metric:** field completeness rate — the proportion of created tickets
that carry every required slot (category, unit, description, urgency, onset,
access window, photo or an explicit refusal).



**Scoring.** Each case is pass / partial / fail.
*Partial* means the outcome was correct but a criterion was missed — a ticket
with the right category but a missing onset, or a correct answer delivered in a
robotic register. Partial counts as a fail for the headline metric and is
tracked separately for tone.



### TC-01 — Bare greeting
**Type:** representative · **Channel:** WhatsApp · **State:** registered resident

**Input:** `hi`

**Expected:** one short, warm line inviting them to say what's up. Nothing else.

**Pass criteria**
- No list of categories offered, in any form
- No mention of "maintenance issue", "emergency", "general enquiry" as options
- One or two sentences, not a paragraph
- No ticket created, no tool called

---

### TC-02 — Clear maintenance report with photo
**Type:** representative · **Channel:** WhatsApp · **State:** registered resident

**Input sequence**
1. `The extractor fan in the bathroom has stopped working`
2. *(responds to photo request with an image after the issue and location are known)*


**Expected:** silent classification as maintenance, photo requested as its own
message immediately after the issue and location are known, then onset, then
access. Ticket created with a reference returned.

 ---

### TC-03 — Vague opener
**Type:** edge · **Channel:** WhatsApp · **State:** registered resident

**Input:** `something's wrong in my flat`

**Expected:** the agent asks what's happening, one question, conversationally.
It must not guess a category, must not offer a list, and must not create a
ticket until it knows what is actually broken.



---

### TC-04 — Knowledge base question, resolved without a ticket
**Type:** representative · **Channel:** WhatsApp · **State:** registered resident

**Input:** `which day do the bins get collected?`

**Expected:** a grounded answer from the knowledge base. `log_self_resolution`
called. **No ticket.**



---
### TC-05 — Emergency
**Type:** representative · **Channel:** WhatsApp · **State:** registered resident

**Input:** `there's water coming through the kitchen ceiling and it's getting worse`

**Expected:** urgency recognised immediately. Minimal interview — this is the one
case where the agent does *not* work through the full slot list before acting.
Ticket created as urgent, manager alerted, resident told what to do now.

 

---

### TC-06 — Damp and mould
**Type:** edge · **Channel:** WhatsApp · **State:** registered resident

**Input:** `there's black mould spreading on the bedroom wall behind the wardrobe`

**Expected:** classified as damp and mould in its own right, not folded into
general maintenance or structural. Photo requested. Ticket created.

**Why this case exists:** a UK property manager (which this system was developed for) operates under the Homes
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

---

### TC-09 — Unit not recognised
**Type:** failure-handling · **Channel:** WhatsApp · **State:** unknown number

**Input sequence**
1. `my shower isn't draining`
2. `Block D Flat 2`

**Expected:** `register_resident` returns `unit_not_found`. The agent calls
`list_units` and offers the real options rather than repeating the question or
accepting the bad value.

---

### TC-10 — Two intents in one message
**Type:** edge · **Channel:** WhatsApp · **State:** registered resident

**Input:** `the heating's been off since yesterday and also how do I get a parking permit?`

**Expected:** both handled. The question answered from the knowledge base, the
issue taken into an interview. One ticket, one self-resolution.


---

### TC-11 — Non-native speaker, fragmented English
**Type:** edge · **Channel:** WhatsApp · **State:** registered resident

**Input sequence**
1. `door no close good. is broken`
2. `front door. it no lock`

**Expected:** comprehension without condescension. The agent does not correct
the English, does not mirror broken grammar back, and does not ask the resident
to rephrase. It recognises a security-relevant issue and treats it with urgency.
 

---

### TC-12 — Out of scope
**Type:** failure-handling · **Channel:** WhatsApp · **State:** registered resident

**Input:** `how much is my rent going up next year and can I view a bigger flat?`

**Expected:** a clear, friendly boundary. No invented figures, no invented
availability, no ticket. Points them at the manager for both.

---
 ### TC-13 — Photo does not show the problem
**Type:** edge · **Channel:** WhatsApp · **State:** registered resident
 
**Input sequence**
1. `the extractor fan in the bathroom has stopped working`
2. *(to the photo request, sends a photo of the ceiling — not the fan)*
3. *(sends a usable photo of the fan)*
4. *(completes the interview)*
**Expected:** the first photo is checked against what was described, judged
unusable, and rejected. The agent says what to photograph instead, using the
reason, and waits. No ticket until a usable photo arrives.