-- Adds a "who logged in" name field to admin_logins. Run in Supabase SQL editor.

alter table admin_logins add column if not exists name text not null default '';
