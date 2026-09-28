-- Ads are run per salesperson, not as one shared budget — this switches
-- ad_spend from one row per day to one row per (day, owner) so each
-- salesperson's spend (and ROAS) can be tracked separately.
-- Run in Supabase SQL editor.

alter table ad_spend add column if not exists owner text not null default '';

-- The old single-row-per-day test entries have no owner attached and no
-- longer fit the new shape — safe to clear since this table was only just
-- introduced (re-enter them under the correct person afterwards).
delete from ad_spend where owner = '';

alter table ad_spend drop constraint if exists ad_spend_pkey;
alter table ad_spend add primary key (date, owner);
