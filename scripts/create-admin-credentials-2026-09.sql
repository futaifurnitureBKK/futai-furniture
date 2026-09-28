-- Lets the two admin passwords (main /admin login, and the extra code on
-- /admin/security) be changed from within the website instead of only via
-- Vercel env vars. Rows are keyed by id ('main' / 'security_code') and hold
-- a salted PBKDF2 hash, never the raw password. Until a row exists for a
-- given id, the corresponding env var (ADMIN_SECRET / SECURITY_LOG_CODE)
-- keeps working as a fallback — nothing breaks before this is set up.
-- Run in Supabase SQL editor.

create table if not exists admin_credentials (
  id text primary key,
  password_hash text not null,
  updated_at timestamptz not null default now()
);

-- Locked down like the other admin tables: only the server-side service-role key.
alter table admin_credentials enable row level security;
