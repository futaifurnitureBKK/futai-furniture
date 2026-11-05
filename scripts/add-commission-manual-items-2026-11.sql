-- Lets a commission batch include a quotation/order directly, with no
-- matching "converted" lead at all — e.g. a sale that only ever exists as a
-- saved quotation, or one you want counted toward this batch regardless of
-- which lead (if any) it's linked to. Run in Supabase SQL editor.

alter table commission_items alter column lead_id drop not null;
alter table commission_items add column if not exists source_quote_id bigint references saved_quotes(id);
alter table commission_items add constraint commission_items_has_source check (lead_id is not null or source_quote_id is not null);
create index if not exists commission_items_source_quote_idx on commission_items (source_quote_id);
