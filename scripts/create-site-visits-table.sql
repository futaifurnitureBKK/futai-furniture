-- Run this once in the Supabase SQL editor to enable visitor tracking.
-- Tracks storefront page views (admin/API/dev traffic never reach this table — see src/proxy.ts).

create table if not exists site_visits (
  id bigint generated always as identity primary key,
  path text not null,
  visitor_id uuid not null,
  created_at timestamptz not null default now()
);

create index if not exists site_visits_created_at_idx on site_visits (created_at);
create index if not exists site_visits_visitor_id_idx on site_visits (visitor_id);

-- Locked down: no anon/public policies. Only the service-role key (used server-side
-- in src/proxy.ts and src/app/api/admin/visits/route.ts) can read or write this table.
alter table site_visits enable row level security;

-- Aggregates in the database instead of pulling every row into the app.
create or replace function site_visit_stats()
returns table (
  total_views bigint,
  total_visitors bigint,
  today_views bigint,
  today_visitors bigint
)
language sql
stable
as $$
  select
    (select count(*) from site_visits) as total_views,
    (select count(distinct visitor_id) from site_visits) as total_visitors,
    (select count(*) from site_visits where created_at >= date_trunc('day', now())) as today_views,
    (select count(distinct visitor_id) from site_visits where created_at >= date_trunc('day', now())) as today_visitors;
$$;
