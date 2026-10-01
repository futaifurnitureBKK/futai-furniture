-- Tracks how much of a lead's deal value has already been paid (deposit /
-- partial payment), shown as a quick "paid X%" badge on the lead card.
-- Run in Supabase SQL editor.

alter table leads add column if not exists paid_pct numeric;
