-- Fixes "my quotation disappeared" — converting a quotation to a delivery
-- note (or invoice) changes doc_type on the same row, so it vanished from
-- its original list. original_doc_type is set once at creation and never
-- touched again, so the app can still show a converted document in its
-- original list (with a "converted" badge) instead of hiding it.
-- Run once in the Supabase SQL editor.

alter table saved_quotes add column if not exists original_doc_type text;

-- Backfill: for almost every existing row, original_doc_type = current
-- doc_type (it was never converted). Leaves already-correct rows alone.
update saved_quotes set original_doc_type = doc_type where original_doc_type is null;

-- The one case already found this session: id 257 (RAMEN20261111001,
-- LANTOP TECHNOLOGY CO.,LTD) was created as a quotation on 2026-11-11 and
-- converted to a delivery note on 2026-11-12 — restore its true original
-- type so it reappears in the ใบเสนอราคา list.
update saved_quotes set original_doc_type = 'quotation' where id = 257;
