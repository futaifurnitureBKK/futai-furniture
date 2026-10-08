-- Tracks which employee posted on which social platform on which day,
-- with photo proof attached per cell (employee x platform x date).
-- Run once in the Supabase SQL editor.

create table if not exists content_tracking_employees (
  id bigint generated always as identity primary key,
  name text not null,
  sort_order int not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists content_tracking_posts (
  id bigint generated always as identity primary key,
  employee_id bigint not null references content_tracking_employees(id) on delete cascade,
  platform text not null check (platform in ('fb', 'ig', 'tk', 'douyin', 'xiaohongshu')),
  post_date date not null,
  image_urls text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, platform, post_date)
);

create index if not exists content_tracking_posts_date_idx on content_tracking_posts (post_date);

alter table content_tracking_employees enable row level security;
alter table content_tracking_posts enable row level security;
