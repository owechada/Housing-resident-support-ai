-- Row level security for the back office.
--
-- Run this in the Supabase SQL editor after schema.sql. Safe to re-run: every
-- policy is dropped and recreated.
--
-- Why it matters: the back office talks to Supabase with the anon key, which
-- ships in the browser. Anyone can read that key off the page. Row level
-- security is therefore the only thing standing between a stranger and every
-- resident's maintenance history. Hiding screens in the UI is not a control.
--
-- The n8n agent is unaffected. It writes with the service_role key, which
-- bypasses row level security entirely, and register_resident() is SECURITY
-- DEFINER so self-registration from chat keeps working.
--
-- One role for now: anyone who can sign in is a manager. When the homeowner and
-- resident roles arrive, they become extra policies on these same tables, not a
-- different mechanism.

-- ---------------------------------------------------------------------------
-- 1. Deny by default, everywhere.
-- ---------------------------------------------------------------------------
-- Without RLS enabled, a table in the public schema is readable by anon through
-- the REST API. Every table gets it switched on, including the ones no screen
-- touches yet, so nothing leaks by omission.

alter table estates             enable row level security;
alter table units               enable row level security;
alter table residents           enable row level security;
alter table channel_identities  enable row level security;
alter table messages            enable row level security;
alter table tickets             enable row level security;
alter table ticket_events       enable row level security;
alter table knowledge_base      enable row level security;
alter table self_resolutions    enable row level security;
alter table review_queue        enable row level security;
alter table config              enable row level security;
alter table n8n_chat_histories  enable row level security;

-- n8n_chat_histories is read and written by the Postgres chat-memory node over
-- a direct database connection as the table owner, and owners are not subject
-- to row level security. If conversation memory stops working after running
-- this file, that connection is not the owner — check it before loosening this.

-- ---------------------------------------------------------------------------
-- 2. What a signed-in manager may read.
-- ---------------------------------------------------------------------------
-- `to authenticated` is the important half. A policy written `to public` would
-- also let the anon key through, which is the mistake this file exists to avoid.

drop policy if exists "managers read tickets" on tickets;
create policy "managers read tickets"
  on tickets for select
  to authenticated
  using (true);

drop policy if exists "managers read ticket events" on ticket_events;
create policy "managers read ticket events"
  on ticket_events for select
  to authenticated
  using (true);

drop policy if exists "managers read messages" on messages;
create policy "managers read messages"
  on messages for select
  to authenticated
  using (true);

drop policy if exists "managers read residents" on residents;
create policy "managers read residents"
  on residents for select
  to authenticated
  using (true);

drop policy if exists "managers read units" on units;
create policy "managers read units"
  on units for select
  to authenticated
  using (true);

drop policy if exists "managers read self resolutions" on self_resolutions;
create policy "managers read self resolutions"
  on self_resolutions for select
  to authenticated
  using (true);

-- self_resolutions is read by the summary screen. A conversation the assistant
-- settled without opening a ticket is a success, not an absence, so the manager
-- has to be able to see them counted.

drop policy if exists "managers read estates" on estates;
create policy "managers read estates"
  on estates for select
  to authenticated
  using (true);

-- estates is read so the knowledge base screen knows which estate a new entry
-- belongs to. One estate, so this is a lookup rather than a choice — it saves
-- the operator configuring an id they would have no way to verify.

-- ---------------------------------------------------------------------------
-- 3. What a signed-in manager may change.
-- ---------------------------------------------------------------------------
-- Update on tickets, insert on ticket_events, and full control of the knowledge
-- base. That is the whole write surface.

drop policy if exists "managers update tickets" on tickets;
create policy "managers update tickets"
  on tickets for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "managers add ticket events" on ticket_events;
create policy "managers add ticket events"
  on ticket_events for insert
  to authenticated
  with check (actor_type = 'manager');

-- The knowledge base is the manager's main lever over what the system does:
-- adding an answer here stops the assistant raising tickets for that question.
-- It is the one table they get to write freely, because it holds estate policy
-- rather than a record of what happened.

drop policy if exists "managers read knowledge base" on knowledge_base;
create policy "managers read knowledge base"
  on knowledge_base for select
  to authenticated
  using (true);

drop policy if exists "managers add knowledge base" on knowledge_base;
create policy "managers add knowledge base"
  on knowledge_base for insert
  to authenticated
  with check (true);

drop policy if exists "managers update knowledge base" on knowledge_base;
create policy "managers update knowledge base"
  on knowledge_base for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "managers delete knowledge base" on knowledge_base;
create policy "managers delete knowledge base"
  on knowledge_base for delete
  to authenticated
  using (true);

-- No insert policy on tickets, on purpose. A ticket exists only when the agent
-- decides the interview is complete and calls its create-ticket sub-workflow.
-- There is no back-office path to open one, and the database is where that is
-- guaranteed rather than in a prompt.
--
-- No delete policy on tickets, ticket_events or messages. Those are the record.
--
-- Closing still has to satisfy the enforce_human_close trigger from schema.sql,
-- which rejects any move to closed or cancelled without a closed_by. The app
-- passes the signed-in manager's auth.uid(). Between them, a ticket cannot be
-- closed by anything that is not a person.

notify pgrst, 'reload schema';
