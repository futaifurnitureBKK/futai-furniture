-- Up to 2 extra photos per stock product, on top of the existing primary
-- `image_url` — 3 photos total per item. Run in Supabase SQL editor.

alter table stock_products add column if not exists image_urls text[] not null default '{}';
