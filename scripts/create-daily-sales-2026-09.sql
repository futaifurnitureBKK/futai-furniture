-- Daily sales log (单日销售表格) — rows can be typed in by hand or pulled in
-- from a saved quotation. Run in Supabase SQL editor.

create table if not exists daily_sales_rows (
  id bigint generated always as identity primary key,
  sale_date date not null,
  sort_order int not null default 0,
  sku text not null default '',
  image_url text,
  size_text text not null default '',
  unit_price numeric not null default 0,
  qty numeric not null default 1,
  customer_name text not null default '',
  salesperson text,
  po_no text not null default '',
  source_quote_id bigint references saved_quotes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists daily_sales_rows_date_idx on daily_sales_rows (sale_date, sort_order);

-- Locked down like the other admin tables: only the server-side service-role key.
alter table daily_sales_rows enable row level security;
