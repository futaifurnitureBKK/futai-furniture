-- Daily ad-spend log, shown against the KPI page's lead/revenue numbers so
-- cost-per-lead and ROAS can be worked out for whatever date range is being
-- viewed. Run in Supabase SQL editor.

create table if not exists ad_spend (
  date date primary key,
  amount numeric not null default 0,
  updated_at timestamptz not null default now()
);

-- Locked down like the other admin tables: only the server-side service-role key.
alter table ad_spend enable row level security;
