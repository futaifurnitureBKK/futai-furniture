-- Adds a 5th saved_quotes status: "needs_followup" — shipped but still
-- owed a final payment, or has an open after-sales claim/repair — so it
-- can be tracked separately from a fully-closed "completed" order on the
-- Shipping board. Run in Supabase SQL editor.

alter table saved_quotes drop constraint if exists saved_quotes_status_check;
alter table saved_quotes add constraint saved_quotes_status_check
  check (status in ('in_progress', 'confirmed', 'awaiting_shipment', 'completed', 'needs_followup'));
