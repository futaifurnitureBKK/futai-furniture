-- A checkbox on each Daily Sales row: when ticked, the sale fulfills stock
-- that was already set aside under "จอง" (reserved) — so auto-deduct takes
-- it from reserved instead of available, keeping the two numbers from
-- double-counting the same physical items.
-- Run in Supabase SQL editor.

alter table daily_sales_rows add column if not exists from_reserved boolean not null default false;

-- Remembers which stock field (available or reserved) this row actually
-- deducted from, so a later edit/delete restores to the right one even if
-- the from_reserved checkbox is changed afterward.
alter table daily_sales_rows add column if not exists stock_deducted_field text not null default 'available';
