-- Adds reference pricing + sales-channel tracking to Daily Export rows (this
-- stays a secondary reference alongside Daily Sales, not a replacement for it).
-- Run in Supabase SQL editor.

alter table daily_export_rows add column if not exists unit_price numeric not null default 0;
alter table daily_export_rows add column if not exists discount_pct numeric not null default 0;
alter table daily_export_rows add column if not exists channel text;
