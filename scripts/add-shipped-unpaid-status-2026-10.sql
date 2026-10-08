-- Adds a 6th saved_quotes status: "shipped_unpaid" — shipped already but
-- payment hasn't been collected yet (separate from needs_followup, which
-- also covers after-sales claims/repairs). Run in Supabase SQL editor.

alter table saved_quotes drop constraint if exists saved_quotes_status_check;
alter table saved_quotes add constraint saved_quotes_status_check
  check (status in ('in_progress', 'confirmed', 'awaiting_shipment', 'completed', 'shipped_unpaid', 'needs_followup'));
