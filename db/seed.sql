-- db/seed.sql
--
-- Run AFTER db/schema.sql. Idempotent — safe to re-run.
-- Seed data for Hawthorn Court, the demo estate.
--
-- Click into empty space so nothing is highlighted before pressing Run. With a
-- selection active the Supabase editor executes only the selection.
--
-- Replace the two phone numbers marked <<< before running.

begin;

-- ---------------------------------------------------------------------------
-- Estate (keeps the id already hard-coded in the n8n Load Config node)
-- ---------------------------------------------------------------------------
insert into estates (id, name, timezone)
values ('ceb74076-8ce6-4690-9b99-60e4a581286b', 'Hawthorn Court', 'Europe/London')
on conflict (id) do update
  set name = excluded.name, timezone = excluded.timezone;

-- ---------------------------------------------------------------------------
-- Units. The three referenced by the test cases, plus enough others that
-- list_units returns a realistic set rather than a suspiciously short one.
-- ---------------------------------------------------------------------------
insert into units (estate_id, label) values
  ('ceb74076-8ce6-4690-9b99-60e4a581286b', 'Flat 1, Hawthorn House'),
  ('ceb74076-8ce6-4690-9b99-60e4a581286b', 'Flat 3, Hawthorn House'),
  ('ceb74076-8ce6-4690-9b99-60e4a581286b', 'Flat 8, Hawthorn House'),
  ('ceb74076-8ce6-4690-9b99-60e4a581286b', 'Flat 12, Hawthorn House'),
  ('ceb74076-8ce6-4690-9b99-60e4a581286b', 'Flat 2, Rowan House'),
  ('ceb74076-8ce6-4690-9b99-60e4a581286b', 'Flat 7, Rowan House'),
  ('ceb74076-8ce6-4690-9b99-60e4a581286b', 'Flat 9, Rowan House'),
  ('ceb74076-8ce6-4690-9b99-60e4a581286b', 'Flat 4, Alder House'),
  ('ceb74076-8ce6-4690-9b99-60e4a581286b', 'Flat 6, Alder House')
on conflict (estate_id, label) do nothing;

insert into residents (estate_id, unit_id, full_name, is_self_registered)
select 'ceb74076-8ce6-4690-9b99-60e4a581286b', u.id, 'James Okafor', false
  from units u
 where u.label = 'Flat 12, Hawthorn House'
   and not exists (select 1 from residents r where r.full_name = 'James Okafor');

insert into channel_identities (resident_id, channel, channel_user_id)
select r.id, 'whatsapp', '2348175783390'      -- <<< your test WhatsApp number
  from residents r where r.full_name = 'James Okafor'
on conflict (channel, channel_user_id) do nothing;

-- A second seeded resident, so the back office queue is not a single name and
-- homeowner RLS has something to be tested against.
insert into residents (estate_id, unit_id, full_name, is_self_registered)
select 'ceb74076-8ce6-4690-9b99-60e4a581286b', u.id, 'Priya Raman', false
  from units u
 where u.label = 'Flat 3, Hawthorn House'
   and not exists (select 1 from residents r where r.full_name = 'Priya Raman');

insert into channel_identities (resident_id, channel, channel_user_id)
select r.id, 'telegram', '000000000'          -- <<< your Telegram user id
  from residents r where r.full_name = 'Priya Raman'
on conflict (channel, channel_user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Knowledge base
--
-- Two design rules behind this list:
--
-- 1. Answers are SPECIFIC. "Wednesday" and "£40 a year" can be checked against
--    the agent's reply. "Contact the office for details" cannot, and would make
--    TC-04 unscoreable.
--
-- 2. There is deliberately NOTHING here about rent, rent increases, tenancy
--    renewals, viewings or available flats. TC-12 tests that the agent declines
--    cleanly instead of inventing an answer — if the knowledge base covered
--    those, the case would prove nothing.
-- ---------------------------------------------------------------------------
insert into knowledge_base (estate_id, question, answer, category) values

-- Waste and recycling  (TC-04)
('ceb74076-8ce6-4690-9b99-60e4a581286b',
 'Which day are the bins collected?',
 'General waste and recycling are collected every Wednesday morning. Please put bags in the communal bin store by 8pm on Tuesday. Garden waste is collected on the first Wednesday of the month only.',
 'waste'),

('ceb74076-8ce6-4690-9b99-60e4a581286b',
 'Where do I put cardboard and glass?',
 'Cardboard goes flat-packed into the blue bins in the bin store. Glass goes in the green bin next to them, not in the blue bins. Large cardboard boxes must be broken down or the collection crew will leave them.',
 'waste'),

-- Parking  (TC-10)
('ceb74076-8ce6-4690-9b99-60e4a581286b',
 'How do I get a parking permit?',
 'Each flat is entitled to one resident permit. Email the estate office with your name, flat number, vehicle registration and a copy of your V5C or insurance certificate. Permits cost £40 a year and usually arrive within five working days.',
 'parking'),

('ceb74076-8ce6-4690-9b99-60e4a581286b',
 'Can visitors park on the estate?',
 'Visitors can park in the bays marked V near the Alder House entrance for up to four hours. Longer visits need a visitor permit from the estate office, which is free and can be arranged the same day.',
 'parking'),

-- Heating and hot water
('ceb74076-8ce6-4690-9b99-60e4a581286b',
 'When is the communal heating on?',
 'Communal heating runs from 1 October to 30 April, between 6am and 11pm. Hot water is available all year round, 24 hours a day. If your radiators are cold during those hours, report it and we will check the system.',
 'heating'),

('ceb74076-8ce6-4690-9b99-60e4a581286b',
 'My radiator is warm at the bottom and cold at the top, what does that mean?',
 'That usually means the radiator needs bleeding. If you are comfortable doing it yourself you will need a radiator key, available from most hardware shops. If not, report it and someone will come and do it.',
 'heating'),

-- Building safety
('ceb74076-8ce6-4690-9b99-60e4a581286b',
 'When is the fire alarm tested?',
 'The communal fire alarm is tested every Thursday at 11am and sounds for about thirty seconds. You do not need to evacuate during the test. If the alarm sounds at any other time, leave the building by the nearest staircase and do not use the lift.',
 'safety'),

('ceb74076-8ce6-4690-9b99-60e4a581286b',
 'What do I do if I smell gas?',
 'Leave the building straight away and call the National Gas Emergency Service on 0800 111 999 from outside. Do not switch anything electrical on or off on your way out. Tell us afterwards so we can arrange access for the engineer.',
 'safety'),

-- Lifts and communal areas
('ceb74076-8ce6-4690-9b99-60e4a581286b',
 'The lift is out of service, when will it be fixed?',
 'Lifts are serviced on the second Tuesday of each month and may be unavailable between 9am and 1pm. Unplanned breakdowns are reported to the lift contractor the same day, and they aim to attend within four hours.',
 'communal'),

('ceb74076-8ce6-4690-9b99-60e4a581286b',
 'Can I leave items in the corridor or on the landing?',
 'No. Corridors and landings are fire escape routes and must stay completely clear, including bicycles, buggies and shoe racks. Anything left there will be removed without notice.',
 'communal'),

-- Repairs process
('ceb74076-8ce6-4690-9b99-60e4a581286b',
 'How long do repairs take?',
 'Emergencies such as a burst pipe, no heating in winter or a door that will not lock are attended within 24 hours. Routine repairs are usually completed within five working days, and you will be contacted to arrange access.',
 'repairs'),

('ceb74076-8ce6-4690-9b99-60e4a581286b',
 'Do I need to be home for a repair?',
 'Yes, for anything inside your flat. Someone over 18 must be there to let the engineer in. If you cannot be home, tell us your preferred days and times and we will work around them.',
 'repairs'),

-- Damp and mould  (supports TC-06)
('ceb74076-8ce6-4690-9b99-60e4a581286b',
 'There is mould in my flat, what should I do?',
 'Report it to us — do not just paint over it. Mould is treated as a priority repair and we will inspect it. In the meantime, wipe affected areas with a mould cleaner, keep trickle vents open, and use the extractor fan when showering or cooking.',
 'damp_mould'),

-- Pests and keys
('ceb74076-8ce6-4690-9b99-60e4a581286b',
 'I have seen mice in my flat, is that my responsibility?',
 'No. Pest control in flats and communal areas is arranged by the estate at no cost to you. Report it and we will book a pest control visit, usually within three working days.',
 'pest'),

('ceb74076-8ce6-4690-9b99-60e4a581286b',
 'I have locked myself out, what do I do?',
 'During office hours, 9am to 5pm Monday to Friday, the estate office holds spare keys and can let you in with photo ID. Outside those hours you will need to arrange a locksmith yourself, and the cost is not recoverable from us.',
 'access');

commit;

select 'units' as item, count(*)::text from units
union all select 'residents', count(*)::text from residents
union all select 'identities', count(*)::text from channel_identities
union all select 'kb entries', count(*)::text from knowledge_base
union all select 'kb mentions rent (should be 0)',
  count(*)::text from knowledge_base
  where question ilike '%rent%' or answer ilike '%rent%';