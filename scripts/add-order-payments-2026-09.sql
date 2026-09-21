-- Adds order-level "salesperson" field and a payments table (deposit/slip
-- tracking) for saved_quotes. Run in Supabase SQL editor.

alter table saved_quotes add column if not exists salesperson text;

create table if not exists saved_quote_payments (
  id bigserial primary key,
  quote_id bigint not null references saved_quotes(id) on delete cascade,
  paid_date date not null,
  amount numeric not null default 0,
  percent numeric,
  payment_type text not null default 'deposit',
  method text not null default 'transfer',
  slip_url text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists saved_quote_payments_quote_id_idx on saved_quote_payments (quote_id);
