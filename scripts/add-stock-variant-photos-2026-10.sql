-- Per-size photos — some sizes/colors of the same model look different, so a
-- variant can carry its own photo set (up to 3), falling back to the
-- product's shared photos when empty. Run in Supabase SQL editor.

alter table stock_variants add column if not exists image_urls text[] not null default '{}';
