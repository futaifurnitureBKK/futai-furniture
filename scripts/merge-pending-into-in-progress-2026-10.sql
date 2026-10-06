-- "รอการตอบกลับ" (pending) and "กำลังดำเนินการ" (in_progress) were treated
-- as the same thing in practice, so pending is removed as a status: existing
-- saved_quotes rows move to in_progress, the default for new rows becomes
-- in_progress, and the check constraint no longer allows pending.
-- Run in Supabase SQL editor.

update saved_quotes set status = 'in_progress' where status = 'pending';

alter table saved_quotes alter column status set default 'in_progress';

alter table saved_quotes drop constraint if exists saved_quotes_status_check;
alter table saved_quotes add constraint saved_quotes_status_check
  check (status in ('in_progress', 'confirmed', 'awaiting_shipment', 'completed'));
