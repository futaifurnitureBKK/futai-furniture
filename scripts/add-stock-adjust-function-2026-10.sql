-- Atomic increment/decrement for stock_variants.available, used by Daily
-- Export so two staff picking the last unit at the same time can't both
-- succeed. A plain "read available, then write available - qty" from the
-- API can race between the read and the write; a single SQL UPDATE with
-- its own WHERE guard is atomic under Postgres's row locking no matter how
-- many requests hit the same row at once.
-- Run in Supabase SQL editor.

create or replace function adjust_stock_variant_available(p_variant_id integer, p_delta numeric)
returns numeric
language plpgsql
as $$
declare
  new_available numeric;
begin
  update stock_variants
  set available = available + p_delta
  where id = p_variant_id and available + p_delta >= 0
  returning available into new_available;

  if new_available is null then
    raise exception 'insufficient_stock';
  end if;

  return new_available;
end;
$$;
