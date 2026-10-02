-- Marks a stock product as currently set up/displayed in the physical
-- showroom — a cross-category flag on normal stock items, separate from the
-- static "sample" category in stock-demo.json (which is just seed data).
-- Run in Supabase SQL editor.

alter table stock_products add column if not exists in_showroom boolean not null default false;
