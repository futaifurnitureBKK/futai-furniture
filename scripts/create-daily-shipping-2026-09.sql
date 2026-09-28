-- Daily shipping log (单日出货表格) — sheet 2 of the same Excel workbook as
-- daily_sales_rows (单日销售表格). Rows can be typed in by hand or pulled in
-- from a saved quotation, same as the sales sheet. Run in Supabase SQL editor.

create table if not exists daily_shipping_rows (
  id bigint generated always as identity primary key,
  ship_date date not null,
  sort_order int not null default 0,
  sku text not null default '',
  image_url text,
  size_text text not null default '',
  qty numeric not null default 1,
  remark text not null default '',
  customer_name text not null default '',
  salesperson text,
  po_no text not null default '',
  consignee text not null default '',
  phone text not null default '',
  source_quote_id bigint references saved_quotes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists daily_shipping_rows_date_idx on daily_shipping_rows (ship_date, sort_order);

-- Locked down like the other admin tables: only the server-side service-role key.
alter table daily_shipping_rows enable row level security;
