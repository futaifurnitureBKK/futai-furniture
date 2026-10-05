-- Remembers a manual match ("this quotation line's sku → this exact Stock
-- variant") the first time staff resolve one by hand in Daily Export's
-- "pull from quotation" dialog, so the same quote sku auto-suggests
-- correctly next time instead of coming up empty again.
-- Run in Supabase SQL editor.

create table if not exists quotation_sku_mappings (
  quote_sku text primary key,
  stock_variant_id integer not null references stock_variants(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table quotation_sku_mappings enable row level security;
