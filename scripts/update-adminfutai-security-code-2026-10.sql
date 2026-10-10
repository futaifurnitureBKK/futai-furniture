-- Changes the extra security code gating the AdminFutai page (formerly
-- ADMINJ) to a new value. Run in Supabase SQL editor.
-- New code: Futai11111111-

insert into admin_credentials (id, password_hash, updated_at)
values (
  'security_code',
  'pbkdf2$210000$c1ccf5f33693a2f628deadb0c107371e$c7d10bdb3fb9c447dc26ec4df5deb75459dcd95e147bf98a750d0df651c95db8',
  now()
)
on conflict (id) do update
set password_hash = excluded.password_hash,
    updated_at = excluded.updated_at;
