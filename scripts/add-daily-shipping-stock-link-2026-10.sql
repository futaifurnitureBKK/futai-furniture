-- Same stock auto-deduct link as daily_sales_rows, now for daily_shipping_rows
-- too — tracked independently/separately from Daily Sales on purpose (a sale
-- being recorded is not the same event as it actually shipping).
-- Run in Supabase SQL editor.

alter table daily_shipping_rows add column if not exists stock_variant_id integer references stock_variants(id) on delete set null;
alter table daily_shipping_rows add column if not exists stock_deducted_qty numeric not null default 0;
alter table daily_shipping_rows add column if not exists stock_deducted_field text not null default 'available';
