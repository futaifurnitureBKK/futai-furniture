-- Adds role (department/position) per employee and an explicit post
-- status (pending/posted) per cell, and swaps 抖音 for LINE in the
-- platform list. Run once in the Supabase SQL editor.

alter table content_tracking_employees add column if not exists role text not null default '';

alter table content_tracking_posts add column if not exists status text not null default 'pending' check (status in ('pending', 'posted'));

-- Any existing test rows under the old "douyin" platform move to "line"
-- first, so they don't violate the new constraint below.
update content_tracking_posts set platform = 'line' where platform = 'douyin';

alter table content_tracking_posts drop constraint if exists content_tracking_posts_platform_check;
alter table content_tracking_posts add constraint content_tracking_posts_platform_check
  check (platform in ('fb', 'ig', 'tk', 'xiaohongshu', 'line'));
