-- Run this once in the Supabase SQL editor to enable the lead / follow-up tracker
-- at /admin/kpi.

create table if not exists leads (
  id bigint generated always as identity primary key,
  lead_date date not null default current_date,
  customer_name text not null,
  channel text not null check (channel in ('facebook', 'shopee', 'tiktok', 'line', 'other')),
  segment text not null default 'b2c' check (segment in ('b2b', 'b2c')),
  sku text,
  status text not null default 'new' check (
    status in ('new', 'followed_1', 'followed_2plus', 'engaged', 'quoted', 'converted', 'lost')
  ),
  contact_method text check (contact_method in ('line', 'phone', 'email', 'messenger')),
  notes text not null default '',
  next_followup_date date,
  deal_value numeric,
  lost_reason text,
  converted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_status_idx on leads (status);
create index if not exists leads_channel_idx on leads (channel);
create index if not exists leads_lead_date_idx on leads (lead_date);

-- Locked down: no anon/public policies. Only the service-role key (used
-- server-side in src/app/api/admin/leads/**) can read or write this table.
alter table leads enable row level security;
