-- Hotel POS: Supabase schema (run in SQL editor)
create extension if not exists pgcrypto;

create type user_role as enum ('admin','manager','cashier','captain','waiter','kitchen');
create type order_type as enum ('dine_in','room_service','takeaway');
create type order_status as enum ('open','billed','paid','cancelled');
create type pay_mode as enum ('cash','upi','card','room_charge');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  role user_role not null default 'waiter'
);

create table locations (            -- tables and rooms
  id serial primary key,
  kind text check (kind in ('table','room')) not null,
  label text not null unique
);

create table menu_categories (
  id serial primary key,
  name text not null
);

create table menu_items (
  id serial primary key,
  category_id int references menu_categories,
  name text not null,
  price numeric(10,2) not null,
  gst_percent numeric(4,2) not null default 5,
  available boolean not null default true
);

create table orders (
  id bigserial primary key,
  order_no text unique,
  type order_type not null,
  location_id int references locations,
  status order_status not null default 'open',
  discount numeric(10,2) not null default 0,
  discount_approved_by uuid references profiles,
  created_by uuid references profiles default auth.uid(),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table order_items (
  id bigserial primary key,
  order_id bigint not null references orders on delete cascade,
  item_id int references menu_items,
  name text not null,               -- snapshot, so history survives menu edits
  qty int not null check (qty > 0),
  price numeric(10,2) not null,
  gst_percent numeric(4,2) not null,
  note text,
  cancelled boolean not null default false,
  created_at timestamptz not null default now()
);

create table kots (                  -- one per "send to kitchen"
  id bigserial primary key,
  order_id bigint not null references orders on delete cascade,
  items jsonb not null,             -- [{name, qty, note}]
  printed_at timestamptz,
  print_error text,
  created_at timestamptz not null default now()
);

create table payments (              -- many per order (split payments)
  id bigserial primary key,
  order_id bigint not null references orders,
  mode pay_mode not null,
  amount numeric(10,2) not null,
  reference text,                   -- UPI txn id, card slip, room no.
  received_by uuid references profiles default auth.uid(),
  created_at timestamptz not null default now()
);

create table audit_log (
  id bigserial primary key,
  actor uuid default auth.uid(),
  action text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index on orders (created_at);
create index on orders (type, status);
create index on payments (created_at, mode);
create index on kots (printed_at) where printed_at is null;

-- Dashboard aggregates
create view daily_sales as
select date_trunc('day', o.created_at)::date as day, o.type,
       count(distinct o.id) as orders,
       sum(oi.qty * oi.price) filter (where not oi.cancelled) - max(o.discount) as net_sales
from orders o join order_items oi on oi.order_id = o.id
where o.status = 'paid' group by 1, 2;

create view payment_split as
select date_trunc('day', created_at)::date as day, mode, sum(amount) as total
from payments group by 1, 2;

-- Role helper + RLS
create function my_role() returns user_role language sql stable security definer as
$$ select role from profiles where id = auth.uid() $$;

alter table profiles enable row level security;
alter table locations enable row level security;
alter table menu_categories enable row level security;
alter table menu_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table kots enable row level security;
alter table payments enable row level security;
alter table audit_log enable row level security;

create policy staff_read on menu_items for select using (auth.uid() is not null);
create policy staff_read on menu_categories for select using (auth.uid() is not null);
create policy staff_read on locations for select using (auth.uid() is not null);
create policy staff_all on orders for all using (auth.uid() is not null);
create policy staff_all on order_items for all using (auth.uid() is not null);
create policy staff_all on kots for all using (auth.uid() is not null);
create policy cashier_pay on payments for all using (my_role() in ('admin','manager','cashier'));
create policy mgr_menu on menu_items for all using (my_role() in ('admin','manager'));
create policy mgr_audit on audit_log for select using (my_role() in ('admin','manager'));
create policy own_profile on profiles for select using (id = auth.uid() or my_role() in ('admin','manager'));

alter publication supabase_realtime add table kots;
