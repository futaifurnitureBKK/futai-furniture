-- Lets a Daily Export row be pulled straight from a saved quotation's line
-- item, so "shipped so far" for that exact line can be computed from real
-- export rows instead of a separately-tracked number that could drift.
-- Run in Supabase SQL editor.

alter table daily_export_rows add column if not exists quotation_id bigint references saved_quotes(id) on delete set null;
alter table daily_export_rows add column if not exists quotation_item_id text;

create index if not exists daily_export_rows_quotation_idx on daily_export_rows(quotation_id);
