-- Swaps LINE back out for 抖音 (a real logo image is used instead of a
-- generic icon now) — moves any rows already saved under "line" back to
-- "douyin" first, then restores the constraint. Run in Supabase SQL editor.

update content_tracking_posts set platform = 'douyin' where platform = 'line';

alter table content_tracking_posts drop constraint if exists content_tracking_posts_platform_check;
alter table content_tracking_posts add constraint content_tracking_posts_platform_check
  check (platform in ('fb', 'ig', 'tk', 'xiaohongshu', 'douyin'));
