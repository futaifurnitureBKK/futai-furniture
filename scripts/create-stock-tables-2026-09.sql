-- Real stock tables behind /admin/StockDEMO. Run once in the Supabase SQL editor,
-- then open the page and click "นำเข้าข้อมูลเริ่มต้น" to load the 368 products.

create table if not exists stock_products (
  id bigint generated always as identity primary key,
  code text not null,
  category text not null default 'other',
  image_url text,
  description text not null default '',
  color text not null default '',
  material text not null default '',
  boxes_per_item int not null default 1,
  from_stock boolean not null default false,   -- only exists in the old stock sheet
  archived boolean not null default false,     -- soft delete
  source_no int,                               -- "No." in the supplier price list
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per size/option. Stock is tracked per size.
create table if not exists stock_variants (
  id bigint generated always as identity primary key,
  product_id bigint not null references stock_products(id) on delete cascade,
  code text not null default '',
  label text not null default '',
  size_text text not null default '',
  width_mm numeric,
  depth_mm numeric,
  height_mm numeric,
  is_round boolean not null default false,
  price numeric,                               -- null = no price yet (custom order)
  note text not null default '',
  flag text,                                   -- source data worth double-checking
  from_stock boolean not null default false,
  sort_order int not null default 0,
  available numeric not null default 0,        -- sellable now
  reserved numeric not null default 0,         -- locked / paid, not shipped
  defective numeric not null default 0,        -- damaged / awaiting claim
  reorder_point numeric not null default 0,
  location text not null default '',
  eta date,
  batch_no text not null default '',
  landed_cost numeric,                         -- owner only
  stock_note text not null default '',
  tracked boolean not null default false,      -- false = stock never entered yet
  archived boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists stock_variants_product_idx on stock_variants (product_id);

-- History of every change to available / reserved / defective.
create table if not exists stock_movements (
  id bigint generated always as identity primary key,
  variant_id bigint not null references stock_variants(id) on delete cascade,
  field text not null,
  old_value numeric,
  new_value numeric,
  created_at timestamptz not null default now()
);

create index if not exists stock_movements_variant_idx on stock_movements (variant_id, created_at desc);

-- Locked down like the other admin tables: only the server-side service-role key.
alter table stock_products enable row level security;
alter table stock_variants enable row level security;
alter table stock_movements enable row level security;
