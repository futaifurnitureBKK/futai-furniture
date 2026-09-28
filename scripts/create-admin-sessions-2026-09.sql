-- Server-tracked admin login sessions — replaces the old stateless signed
-- cookie so the security page can list who's currently logged in (by IP)
-- and remotely revoke ("kick") a specific session.
-- Run in Supabase SQL editor.

create table if not exists admin_sessions (
  id text primary key,
  ip text not null,
  name text not null default '',
  user_agent text not null default '',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create index if not exists admin_sessions_expires_idx on admin_sessions (expires_at);

-- Locked down like the other admin tables: only the server-side service-role key.
alter table admin_sessions enable row level security;
