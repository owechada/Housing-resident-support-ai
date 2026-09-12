create extension if not exists "pgcrypto";

create table if not exists estates (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  timezone      text not null default 'Europe/London',
  created_at    timestamptz not null default now()
);

create table if not exists units (
  id            uuid primary key default gen_random_uuid(),
  estate_id     uuid not null references estates(id) on delete cascade,
  label         text not null,                 -- e.g. 'Block C, Flat 4'
  created_at    timestamptz not null default now(),
  unique (estate_id, label)
);

create table if not exists residents (
  id            uuid primary key default gen_random_uuid(),
  estate_id     uuid not null references estates(id) on delete cascade,
  unit_id       uuid not null references units(id) on delete cascade,
  full_name     text not null,
  is_active     boolean not null default true,

  is_self_registered boolean not null default false,
  created_at    timestamptz not null default now()
);

create table if not exists channel_identities (
  id                uuid primary key default gen_random_uuid(),
  resident_id       uuid not null references residents(id) on delete cascade,
  channel           text not null check (channel in ('whatsapp','telegram','web_chat')),
  channel_user_id   text not null,
  is_active         boolean not null default true,
  linked_at         timestamptz not null default now(),
  unique (channel, channel_user_id)
);

create index if not exists idx_channel_identities_lookup
  on channel_identities (channel, channel_user_id) where is_active;

create table if not exists messages (
  id                    bigserial primary key,
  estate_id             uuid references estates(id) on delete cascade,
  resident_id           uuid references residents(id) on delete set null,
  channel               text not null,
  channel_user_id       text not null,
  inbound_text          text,
  outbound_text         text,
  photo_url             text,
  provider_message_id   text,
  created_at            timestamptz not null default now()
);

create index if not exists idx_messages_resident on messages (resident_id, created_at desc);

create table if not exists tickets (
  id                uuid primary key default gen_random_uuid(),
  reference         text unique not null,
  estate_id         uuid not null references estates(id) on delete cascade,
  unit_id           uuid not null references units(id) on delete cascade,
  resident_id       uuid references residents(id) on delete set null,
  channel           text not null,

  category          text not null check (category in
                      ('plumbing','electrical','appliance','structural',
                       'damp_mould','pest','cleaning','security','internet',
                       'other')),
  urgency           text not null default 'normal'
                      check (urgency in ('emergency','high','normal','low')),
  location_in_unit  text,
  description       text,
  onset             text,
  access_window     text,
  safety_flag       boolean not null default false,

  photo_status      text not null default 'none'
                      check (photo_status in ('provided','refused','none')),
  photo_url         text,

  confidence        numeric,
  status            text not null default 'open'
                      check (status in ('open','needs_review','acknowledged',
                                        'assigned','in_progress','resolved',
                                        'closed','reopened','cancelled')),
  review_reason     text,
  missing_fields    jsonb not null default '[]'::jsonb,

  assigned_to       uuid,
  created_by        text not null default 'agent',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  closed_at         timestamptz,
  closed_by         uuid         
);

create index if not exists idx_tickets_queue
  on tickets (estate_id, status, urgency, created_at desc);

create or replace function enforce_human_close() returns trigger as $$
begin
  if new.status in ('closed','cancelled') and new.closed_by is null then
    raise exception 'Tickets can only be closed by an identified human user';
  end if;
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_enforce_human_close on tickets;
create trigger trg_enforce_human_close
  before update on tickets
  for each row execute function enforce_human_close();

create table if not exists ticket_events (
  id                bigserial primary key,
  ticket_reference  text not null references tickets(reference) on delete cascade,
  actor_type        text not null check (actor_type in ('agent','manager','resident','system')),
  actor_id          text,
  event_type        text not null,   
  detail            jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);

create index if not exists idx_ticket_events_ref on ticket_events (ticket_reference, created_at);

create table if not exists knowledge_base (
  id            uuid primary key default gen_random_uuid(),
  estate_id     uuid not null references estates(id) on delete cascade,
  question      text not null,
  answer        text not null,
  category      text,
  is_active     boolean not null default true,
  updated_at    timestamptz not null default now()
);

create table if not exists self_resolutions (
  id                bigserial primary key,
  estate_id         uuid references estates(id) on delete cascade,
  unit_id           uuid references units(id) on delete set null,
  channel           text,
  resolution_type   text check (resolution_type in ('kb_answer','self_fix')),
  summary           text,
  created_at        timestamptz not null default now()
);


create table if not exists review_queue (
  id                bigserial primary key,
  estate_id         uuid references estates(id) on delete cascade,
  reason            text not null,  
  channel           text,
  channel_user_id   text,
  payload           jsonb not null default '{}'::jsonb,
  resolved          boolean not null default false,
  created_at        timestamptz not null default now()
);


create table if not exists n8n_chat_histories (
  id          serial primary key,
  session_id  varchar(255) not null,
  message     jsonb not null
);
create index if not exists idx_chat_histories_session on n8n_chat_histories (session_id);



create table if not exists config (
  id          bigserial primary key,
  estate_id   uuid not null references estates(id) on delete cascade,
  key         text not null,
  value       text,
  updated_at  timestamptz not null default now(),
  unique (estate_id, key)
);


create or replace function public.register_resident(
  p_estate_id       uuid,
  p_full_name       text,
  p_unit_label      text,
  p_channel         text,
  p_channel_user_id text
)
returns json
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_unit_id     uuid;
  v_resident_id uuid;
begin
  select id into v_unit_id
  from units
  where estate_id = p_estate_id
    and lower(replace(replace(label, ' ', ''), ',', ''))
      = lower(replace(replace(p_unit_label, ' ', ''), ',', ''))
  limit 1;

  if v_unit_id is null then
    return json_build_object(
      'error', 'unit_not_found',
      'message', 'No unit with that label on this estate. Call list_units and offer the real options.'
    );
  end if;

  select r.id into v_resident_id
  from channel_identities ci
  join residents r on r.id = ci.resident_id
  where ci.channel = p_channel
    and ci.channel_user_id = p_channel_user_id
    and ci.is_active
  limit 1;

  if v_resident_id is null then
    insert into residents (estate_id, unit_id, full_name, is_self_registered)
    values (p_estate_id, v_unit_id, p_full_name, true)
    returning id into v_resident_id;

    insert into channel_identities (resident_id, channel, channel_user_id, is_active)
    values (v_resident_id, p_channel, p_channel_user_id, true);
  end if;

  return json_build_object(
    'resident_id', v_resident_id,
    'unit_id',     v_unit_id,
    'full_name',   p_full_name,
    'status',      'registered'
  );
end;
$fn$;

grant execute on function public.register_resident(uuid, text, text, text, text)
  to anon, authenticated, service_role;

notify pgrst, 'reload schema';


insert into estates (id, name, timezone)
values ('ceb74076-8ce6-4690-9b99-60e4a581286b', 'Hawthorn Court', 'Europe/London')
on conflict (id) do update
  set name = excluded.name, timezone = excluded.timezone;

