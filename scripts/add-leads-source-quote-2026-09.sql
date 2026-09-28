-- Tracks which saved quotation a lead was imported from, so the "Import
-- from quotation" picker on the KPI page can show which quotes have already
-- been pulled in and avoid accidental double-imports.
-- Run in Supabase SQL editor.

alter table leads add column if not exists source_quote_id bigint references saved_quotes(id) on delete set null;
