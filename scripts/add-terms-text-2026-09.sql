-- Adds an editable "Terms of Sale" text field to saved_quotes (previously
-- hardcoded on the printed document). Run in Supabase SQL editor.

alter table saved_quotes add column if not exists terms_text text;
