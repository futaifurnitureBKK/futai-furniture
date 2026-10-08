-- Adds role (department/position) per employee and an explicit post
-- status (pending/posted) per cell, and swaps 抖音 for LINE in the
-- platform list. Run once in the Supabase SQL editor.

alter table content_tracking_employees add column if not exists role text not null default '';

alter table content_tracking_posts add column if not exists status text not null default 'pending' check (status in ('pending', 'posted'));

alter table content_tracking_posts drop constraint if exists content_tracking_posts_platform_check;
alter table content_tracking_posts add constraint content_tracking_posts_platform_check
  check (platform in ('fb', 'ig', 'tk', 'xiaohongshu', 'line'));
