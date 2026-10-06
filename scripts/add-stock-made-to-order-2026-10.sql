-- Flags a product line as made-to-order/custom (定制) — it never really
-- carries physical stock, so the quote-builder product picker should show
-- "สั่งทำ" instead of a stock count for it rather than treating 0 available
-- as "out of stock, to be produced" like a normal product.
-- Run in Supabase SQL editor.

alter table stock_products add column if not exists made_to_order boolean not null default false;
