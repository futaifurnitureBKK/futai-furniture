-- Adds an "owner" (who's handling this lead) field to leads. Run in Supabase SQL editor.

alter table leads add column if not exists owner text;
