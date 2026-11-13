-- Ochir Couture catalog, orders, and trusted admin authorization.
create extension if not exists pgcrypto with schema extensions;

create type public.product_category as enum ('Workwear', 'Evening', 'Deel', 'Corporate');
create type public.order_status as enum ('INITIAL_RECEIVED', 'IN_PRODUCTION', 'QC_PASSED', 'DELIVERED');

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  category public.product_category not null,
  price_mnt integer not null check (price_mnt between 1 and 100000000),
  fabric text not null default '' check (char_length(fabric) <= 160),
  tags text not null default '' check (char_length(tags) <= 500),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  submission_id uuid not null unique,
  customer_name text not null check (char_length(customer_name) between 2 and 120),
  phone text not null check (char_length(phone) between 4 and 40),
  company text not null default '' check (char_length(company) <= 160),
  product_id uuid not null references public.products(id) on delete restrict,
  product_name_snapshot text not null,
  product_category_snapshot public.product_category not null,
  unit_price_mnt integer not null check (unit_price_mnt between 1 and 100000000),
  quantity integer not null check (quantity between 1 and 2000),
  total_mnt bigint not null check (total_mnt between 1 and 200000000000),
  fabric_ratio text not null check (fabric_ratio in ('65/35', '20/80')),
  swatch_code integer not null check (swatch_code between 201 and 212),
  accent_swatch_code integer not null check (accent_swatch_code between 201 and 212),
  size text not null check (size in ('S', 'M', 'L', 'XL', '2XL', '3XL', '4XL')),
  measurements jsonb not null default '{}'::jsonb,
  garment_view text not null check (garment_view in ('suit', 'jacket', 'pants')),
  back_view boolean not null default false,
  reflective_tape boolean not null default true,
  reflective_color text not null default '#E2E8F0' check (reflective_color ~ '^#[0-9A-Fa-f]{6}$'),
  logo_text text not null default '' check (char_length(logo_text) <= 40),
  lux integer not null default 500 check (lux between 0 and 500),
  status public.order_status not null default 'INITIAL_RECEIVED',
  created_at timestamptz not null default now()
);

create index products_published_category_name_idx
  on public.products (category, name)
  where is_published = true;
create index orders_created_at_idx on public.orders (created_at desc);
create index orders_status_created_at_idx on public.orders (status, created_at desc);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table private.admin_users enable row level security;
revoke all on table private.admin_users from public, anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.admin_users
    where user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

alter table public.products enable row level security;
alter table public.orders enable row level security;

revoke all on table public.products, public.orders from public, anon, authenticated;
grant select on table public.products to anon, authenticated;
grant insert, update, delete on table public.products to authenticated;
grant select, update(status) on table public.orders to authenticated;
grant all on table public.products, public.orders to service_role;

create policy products_anon_read_published
  on public.products for select to anon
  using (is_published = true);
create policy products_authenticated_read
  on public.products for select to authenticated
  using (is_published = true or (select public.is_admin()));
create policy products_admin_insert
  on public.products for insert to authenticated
  with check ((select public.is_admin()));
create policy products_admin_update
  on public.products for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy products_admin_delete
  on public.products for delete to authenticated
  using ((select public.is_admin()));

create policy orders_admin_read
  on public.orders for select to authenticated
  using ((select public.is_admin()));
create policy orders_admin_update_status
  on public.orders for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

insert into public.products (id, name, category, price_mnt, fabric, tags, is_published)
values
  ('10000000-0000-4000-8000-000000000001', 'Аюулгүй хүрэм', 'Workwear', 185000, '65/35 Twill', '3M тууз, Олон халаас', true),
  ('10000000-0000-4000-8000-000000000002', 'Инженер хүрэм', 'Workwear', 210000, '20/80 Cotton', 'Амьсгалах, Зөөлөн', true),
  ('10000000-0000-4000-8000-000000000003', 'Карго өмд', 'Workwear', 120000, '65/35 Twill', 'Бэхэлсэн өвдөг', true),
  ('10000000-0000-4000-8000-000000000004', 'Үдшийн даашинз', 'Evening', 1450000, 'Silk Satin', 'Гар оёдол, Haute couture', true),
  ('10000000-0000-4000-8000-000000000005', 'Үндэсний дээл', 'Deel', 980000, 'Silk Brocade', 'Уламжлалт, Гар хатгамал', true),
  ('10000000-0000-4000-8000-000000000006', 'Албаны дүрэмт хослол', 'Corporate', 390000, 'Wool Blend', 'Компанийн лого', true)
on conflict (id) do nothing;
