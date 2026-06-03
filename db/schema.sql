create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'seller', 'buyer')),
  password_hash text not null
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references users(id) on delete cascade,
  sku text not null unique,
  name text not null,
  category text not null,
  description text,
  dimension text not null check (dimension in ('weight', 'volume', 'count')),
  base_unit text not null check (base_unit in ('g', 'mL', 'unit')),
  inventory_base_qty numeric(30,12) not null default 0,
  price_per_base_unit_inr numeric(30,12) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'fulfilled')),
  total_inr numeric(30,12) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  requested_qty numeric(30,12) not null,
  requested_unit text not null check (requested_unit in ('g', 'kg', 'mL', 'L', 'unit')),
  base_qty numeric(30,12) not null,
  base_unit text not null check (base_unit in ('g', 'mL', 'unit')),
  unit_price_inr numeric(30,12) not null,
  line_total_inr numeric(30,12) not null
);

create table if not exists product_requests (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references users(id) on delete cascade,
  buyer_name text not null,
  buyer_email text not null,
  requested_product_name text not null,
  requested_category text,
  notes text,
  status text not null default 'open' check (status in ('open', 'reviewed', 'fulfilled', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_seller_id on products (seller_id);
create index if not exists idx_products_name on products (name);
create index if not exists idx_orders_user_id on orders (user_id);
create index if not exists idx_order_items_order_id on order_items (order_id);
create index if not exists idx_product_requests_buyer_id on product_requests (buyer_id);
create index if not exists idx_product_requests_name on product_requests (requested_product_name);
