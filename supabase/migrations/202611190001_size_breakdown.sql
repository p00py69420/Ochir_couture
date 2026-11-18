-- Preserve legacy size/quantity values; new orders use the per-size JSON breakdown.
alter table public.orders
  add column size_breakdown jsonb not null default '{}'::jsonb;

alter table public.orders
  alter column size drop not null;

alter table public.orders
  add constraint orders_size_breakdown_object_check
  check (jsonb_typeof(size_breakdown) = 'object');

comment on column public.orders.size_breakdown is
  'Per-size quantities for new orders. Empty object identifies a legacy single-size order; existing size and quantity values are retained.';
