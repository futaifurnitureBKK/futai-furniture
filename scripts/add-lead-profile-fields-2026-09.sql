-- Run this once in the Supabase SQL editor to add profile / follow-up
-- detail fields to the lead tracker at /admin/kpi.

alter table leads add column if not exists customer_id text;
alter table leads add column if not exists address text;
alter table leads add column if not exists profile_image_url text;
alter table leads add column if not exists customer_details text;
alter table leads add column if not exists contact_id text;

alter table leads add column if not exists phone_contacted text not null default 'unknown';
alter table leads add column if not exists has_office_plan text not null default 'unknown';
alter table leads add column if not exists will_visit_showroom text not null default 'unknown';

alter table leads add column if not exists needed_by_date date;

alter table leads drop constraint if exists leads_phone_contacted_check;
alter table leads add constraint leads_phone_contacted_check
  check (phone_contacted in ('yes', 'no', 'unknown'));

alter table leads drop constraint if exists leads_has_office_plan_check;
alter table leads add constraint leads_has_office_plan_check
  check (has_office_plan in ('yes', 'no', 'unknown'));

alter table leads drop constraint if exists leads_will_visit_showroom_check;
alter table leads add constraint leads_will_visit_showroom_check
  check (will_visit_showroom in ('yes', 'no', 'unknown'));

-- Allow WeChat as a contact method alongside the existing options.
alter table leads drop constraint if exists leads_contact_method_check;
alter table leads add constraint leads_contact_method_check
  check (contact_method in ('line', 'phone', 'email', 'messenger', 'wechat'));
