-- Adds Remark and Customer Phone fields to the Daily Sales log, matching the
-- fields already on Daily Shipping. Run in Supabase SQL editor.

alter table daily_sales_rows add column if not exists remark text not null default '';
alter table daily_sales_rows add column if not exists customer_phone text not null default '';
