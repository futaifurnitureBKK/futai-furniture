-- Run this once in the Supabase SQL editor to enable saving/editing/deleting
-- quotations and invoices at /admin/quote-builder.

create table if not exists saved_quotes (
  id bigint generated always as identity primary key,
  doc_type text not null check (doc_type in ('quotation', 'invoice')),
  doc_no text not null,
  lang_mode text not null default 'th-en-zh' check (lang_mode in ('th-en-zh', 'th-en', 'th-zh')),
  doc_date date not null default current_date,
  customer_name text not null default '',
  customer_address text not null default '',
  customer_tax_id text not null default '',
  shipping_address text not null default '',
  shipping_date date,
  contact_person text not null default '',
  contact_phone text not null default '',
  vat_pct numeric not null default 7,
  deposit_pct numeric not null default 50,
  -- Array of { name, sku, size, qty, unitPrice, remark, image }
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_quotes_updated_at_idx on saved_quotes (updated_at desc);

-- Locked down: no anon/public policies. Only the service-role key (used
-- server-side in src/app/api/admin/saved-quotes/**) can read or write this table.
alter table saved_quotes enable row level security;
