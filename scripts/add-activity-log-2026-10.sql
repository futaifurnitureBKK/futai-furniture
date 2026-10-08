-- Generic activity/audit log used across the whole admin site — records who
-- (the logged-in session's name), did what (action), to which record
-- (entity_type/entity_id), with a short human-readable summary, so an admin
-- can trace any add/edit/delete back to a person later if something looks
-- off (fraud prevention). Run in Supabase SQL editor.

create table if not exists activity_log (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  actor text,
  ip text,
  action text not null,
  entity_type text not null,
  entity_id text,
  summary text not null,
  detail jsonb
);

create index if not exists activity_log_created_at_idx on activity_log (created_at desc);
create index if not exists activity_log_actor_idx on activity_log (actor);
create index if not exists activity_log_entity_type_idx on activity_log (entity_type);
