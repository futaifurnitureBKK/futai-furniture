-- Commission calculation system (ระบบคิดค่าคอมมิชชั่น), built on top of the
-- existing `leads` table — there is no separate "orders" table in this app;
-- a converted lead (status='converted', deal_value) *is* the order.
-- Run once in the Supabase SQL editor.

create table if not exists commission_batches (
  id bigint generated always as identity primary key,
  owner text not null,
  period_from date not null,
  period_to date not null,
  mode text not null default 'cumulative' check (mode in ('per_order', 'cumulative')),
  base text not null default 'ex_vat' check (base in ('ex_vat', 'inc_vat')),
  status text not null default 'draft' check (status in ('draft', 'approved', 'paid', 'cancelled')),
  total_base numeric not null default 0,
  total_commission numeric not null default 0,
  note text not null default '',
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by text,
  paid_at timestamptz
);

create table if not exists commission_items (
  id bigint generated always as identity primary key,
  batch_id bigint not null references commission_batches(id) on delete cascade,
  lead_id bigint not null references leads(id),
  -- snapshotted at save time, so a later rate-table change or edit to the
  -- lead's deal_value never alters a batch that's already been computed
  customer_name text not null,
  closed_date date,
  base_amount numeric not null,
  deduction numeric not null default 0,
  rate numeric not null,
  commission numeric not null,
  note text not null default ''
);

-- A lead can only ever be paid out once. Enforced in the API route (checks
-- for an existing item on an active batch before insert) rather than a DB
-- constraint, since "active" means "batch.status <> 'cancelled'" — a
-- condition that spans two tables and plain unique indexes can't express.
create index if not exists commission_items_lead_idx on commission_items (lead_id);
create index if not exists commission_items_batch_idx on commission_items (batch_id);

-- "Kan & J" (and similar) is more than one person; split only when/if the
-- owner tells you the ratio — a batch with no rows here just hasn't been
-- split yet, which the UI shows plainly rather than assuming 50/50.
create table if not exists commission_splits (
  id bigint generated always as identity primary key,
  batch_id bigint not null references commission_batches(id) on delete cascade,
  person text not null,
  percent numeric not null check (percent >= 0 and percent <= 100)
);

create index if not exists commission_batches_owner_idx on commission_batches (owner);

-- Locked down: service-role key only, same as every other admin table.
alter table commission_batches enable row level security;
alter table commission_items enable row level security;
alter table commission_splits enable row level security;
