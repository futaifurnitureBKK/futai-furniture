-- Breaks ad_spend down per advertising platform (Facebook/TikTok/IG/Shopee),
-- still tied to the individual owner/salesperson, same as before. Existing
-- rows (entered before this split existed) are kept, not deleted — they're
-- bucketed under platform = 'other' since there's no way to know
-- retroactively which platform that lump sum was actually spent on.
-- Run in Supabase SQL editor.

alter table ad_spend add column if not exists platform text not null default 'other';
update ad_spend set platform = 'other' where platform is null;

alter table ad_spend drop constraint if exists ad_spend_platform_check;
alter table ad_spend add constraint ad_spend_platform_check
  check (platform in ('facebook', 'tiktok', 'ig', 'shopee', 'other'));

alter table ad_spend drop constraint if exists ad_spend_pkey;
alter table ad_spend add primary key (date, owner, platform);
