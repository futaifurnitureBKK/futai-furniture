-- Run this once in the Supabase SQL editor to add an explicit
-- "awaiting shipment" status and an archive flag (instead of hard
-- delete) to saved quotations/invoices at /admin/quote-builder.

alter table saved_quotes add column if not exists archived boolean not null default false;

create index if not exists saved_quotes_archived_idx on saved_quotes (archived);

alter table saved_quotes drop constraint if exists saved_quotes_status_check;
alter table saved_quotes add constraint saved_quotes_status_check
  check (status in ('pending', 'in_progress', 'confirmed', 'awaiting_shipment', 'completed'));
