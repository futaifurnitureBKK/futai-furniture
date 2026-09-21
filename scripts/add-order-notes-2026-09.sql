-- Adds an order-level notes field to saved_quotes. Run in Supabase SQL editor.

alter table saved_quotes add column if not exists notes text not null default '';
