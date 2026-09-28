-- Logs every successful admin login (IP + browser) so you can see who's been
-- getting into /admin. Run in Supabase SQL editor.

create table if not exists admin_logins (
  id bigint generated always as identity primary key,
  ip text not null,
  user_agent text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists admin_logins_created_at_idx on admin_logins (created_at desc);

-- Locked down like the other admin tables: only the server-side service-role key.
alter table admin_logins enable row level security;
