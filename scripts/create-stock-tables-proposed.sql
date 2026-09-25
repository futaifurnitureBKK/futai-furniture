-- PROPOSED schema for real stock tracking (not run yet — the /admin/StockDEMO
-- page keeps its numbers in the browser only). Product data comes from
-- src/data/stock-demo.json (built by scripts/build-stock-demo.mjs).

create table if not exists stock_products (
  id bigint generated always as identity primary key,
  source_no int,                         -- "No." column in the supplier workbook
  code text not null unique,             -- product code
  category text not null,                -- e.g. boss-desk, office-chair
  image_url text,
  description text not null default '',
  color text not null default '',
  material text not null default '',
  boxes_per_item int not null default 1,
  -- stock levels
  available int not null default 0,      -- sellable now
  reserved int not null default 0,       -- paid, not yet shipped
  defective int not null default 0,      -- can't sell at full price / awaiting claim
  reorder_point int not null default 0,
  -- warehouse / import
  location text not null default '',
  landed_cost numeric,                   -- owner/admin only
  eta date,
  batch_no text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists stock_variants (
  id bigint generated always as identity primary key,
  product_id bigint not null references stock_products(id) on delete cascade,
  size_label text not null default '',
  width_mm numeric,
  depth_mm numeric,
  height_mm numeric,
  price numeric,                         -- null = price not in the source file yet
  note text not null default ''
);

create index if not exists stock_variants_product_idx on stock_variants (product_id);

-- Locked down like the other admin tables: only the server-side service-role key.
alter table stock_products enable row level security;
alter table stock_variants enable row level security;
