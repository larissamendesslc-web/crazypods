-- CRAZY COMMERCE 1.0 — normalized commerce schema
-- Prepared but NOT APPLIED. Apply only to the VERIFIED project's PostgreSQL
-- through a reviewed migration, after backing up data.
--
-- Product categories are generic. Legacy niche inventory is NOT migrated.
-- All tables are service-only by default. Do not expose to anon/authenticated
-- until the appropriate server/API/RLS flows have been audited.

begin;

create extension if not exists pgcrypto;

create table if not exists public.commerce_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(btrim(name)) between 2 and 90),
  description text not null default '',
  active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.commerce_products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.commerce_categories(id) on delete restrict,
  sku text not null unique check (length(btrim(sku)) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(btrim(name)) between 2 and 160),
  description text not null default '',
  image_url text not null default '',
  price_cents bigint not null check (price_cents between 1 and 100000000),
  compare_at_cents bigint check (compare_at_cents between 1 and 100000000),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  sale_approved boolean not null default false,
  regulatory_class text not null default 'pending_review'
    check (regulatory_class in ('pending_review','general','restricted','prohibited')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commerce_products_sale_guard check (
    not sale_approved or (regulatory_class = 'general' and status = 'published')
  )
);

create table if not exists public.commerce_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.commerce_products(id) on delete restrict,
  sku text not null unique check (length(btrim(sku)) between 2 and 80),
  label text not null check (length(btrim(label)) between 1 and 100),
  price_cents bigint check (price_cents between 1 and 100000000),
  created_at timestamptz not null default now()
);

create table if not exists public.commerce_inventory (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.commerce_products(id) on delete restrict,
  variant_id uuid references public.commerce_variants(id) on delete restrict,
  store_id text not null check (store_id in ('quitauna','jardimBoaVista')),
  available integer not null default 0 check (available >= 0),
  reserved integer not null default 0 check (reserved >= 0),
  updated_at timestamptz not null default now(),
  constraint commerce_stock_unique unique nulls not distinct (product_id, store_id, variant_id)
);
-- NULL variant_id indicates base product stock, without requiring a fabricated variant.
-- Before enabling fulfillment, additionally enforce variant/product ownership and
-- atomic reserve/release/commit operations in dedicated server transactions.

create table if not exists public.commerce_orders (
  id uuid primary key default gen_random_uuid(),
  request_id uuid unique,
  access_hash char(64) not null check (access_hash ~ '^[a-f0-9]{64}$'),
  payer_email text not null check (length(payer_email) between 5 and 254),
  customer_name text not null default '',
  phone text not null default '',
  address_json jsonb not null default '{}'::jsonb,
  store_id text not null check (store_id in ('quitauna','jardimBoaVista')),
  subtotal_cents bigint not null check (subtotal_cents >= 0),
  shipping_cents bigint not null check (shipping_cents >= 0),
  total_cents bigint generated always as (subtotal_cents + shipping_cents) stored,
  currency char(3) not null default 'BRL' check (currency = 'BRL'),
  status text not null default 'pending_payment'
    check (status in ('pending_payment','awaiting_payment','paid','payment_review','cancelled','fulfilled')),
  sale_verified_at timestamptz,
  expires_at timestamptz not null,
  payment_id text unique,
  pix_code text,
  pix_image text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.commerce_order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.commerce_orders(id) on delete restrict,
  product_id uuid not null references public.commerce_products(id) on delete restrict,
  variant_id uuid references public.commerce_variants(id) on delete restrict,
  sku text not null,
  name text not null,
  quantity integer not null check (quantity between 1 and 100),
  unit_price_cents bigint not null check (unit_price_cents > 0),
  line_total_cents bigint generated always as (unit_price_cents * quantity) stored
);

create table if not exists public.commerce_payment_events (
  provider text not null check (provider in ('mercadopago')),
  payment_id text not null,
  order_id uuid not null references public.commerce_orders(id) on delete restrict,
  status text not null,
  status_detail text not null default '',
  received_at timestamptz not null default now(),
  primary key (provider, payment_id)
);

create index if not exists commerce_products_cat_idx
  on public.commerce_products(category_id, status, sale_approved);
create index if not exists commerce_orders_status_idx
  on public.commerce_orders(status, created_at desc);
create index if not exists commerce_orders_expiry_idx
  on public.commerce_orders(expires_at) where status in ('pending_payment','awaiting_payment');
create index if not exists commerce_order_lines_order_idx
  on public.commerce_order_lines(order_id);

alter table public.commerce_categories enable row level security;
alter table public.commerce_products enable row level security;
alter table public.commerce_variants enable row level security;
alter table public.commerce_inventory enable row level security;
alter table public.commerce_orders enable row level security;
alter table public.commerce_order_lines enable row level security;
alter table public.commerce_payment_events enable row level security;

revoke all on public.commerce_categories from public, anon, authenticated;
revoke all on public.commerce_products from public, anon, authenticated;
revoke all on public.commerce_variants from public, anon, authenticated;
revoke all on public.commerce_inventory from public, anon, authenticated;
revoke all on public.commerce_orders from public, anon, authenticated;
revoke all on public.commerce_order_lines from public, anon, authenticated;
revoke all on public.commerce_payment_events from public, anon, authenticated;

grant all on public.commerce_categories to service_role;
grant all on public.commerce_products to service_role;
grant all on public.commerce_variants to service_role;
grant all on public.commerce_inventory to service_role;
grant all on public.commerce_orders to service_role;
grant all on public.commerce_order_lines to service_role;
grant all on public.commerce_payment_events to service_role;

commit;
