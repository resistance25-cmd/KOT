-- Kitchen display, inventory + recipes, room folio settlement, manager-approved discounts
alter table kots add column done boolean not null default false;
alter table payments add column settled boolean not null default false;

create table inventory_items (id serial primary key, name text unique not null, unit text not null default 'kg', qty numeric(10,3) not null default 0, min_qty numeric(10,3) not null default 0);
create table recipes (menu_item_id int references menu_items on delete cascade, inventory_id int references inventory_items on delete cascade, amount numeric(10,4) not null, primary key (menu_item_id, inventory_id));
create table settlements (id bigserial primary key, location_id int references locations, amount numeric(10,2) not null, mode pay_mode not null, created_by uuid default auth.uid(), created_at timestamptz not null default now());
create table app_settings (key text primary key, value text not null);
alter table inventory_items enable row level security; alter table recipes enable row level security;
alter table settlements enable row level security;  alter table app_settings enable row level security;
create policy inv_mgr on inventory_items for all using (my_role() in ('admin','manager'));
create policy inv_read on inventory_items for select using (auth.uid() is not null);
create policy rec_mgr on recipes for all using (my_role() in ('admin','manager'));
create policy set_cash on settlements for all using (my_role() in ('admin','manager','cashier'));
alter publication supabase_realtime add table kots;

-- Auto stock deduction when an item is sent to the kitchen
create function deduct_stock() returns trigger language plpgsql security definer as $$
begin
  update inventory_items i set qty = greatest(0, i.qty - r.amount * new.qty)
  from recipes r where r.menu_item_id = new.item_id and r.inventory_id = i.id;
  return new;
end $$;
create trigger trg_deduct after update of kot_id on order_items
for each row when (old.kot_id is null and new.kot_id is not null) execute function deduct_stock();

-- Manager PIN (change 1234!) and the discount function
insert into app_settings values ('manager_pin', crypt('1234', gen_salt('bf')));
create function apply_discount(p_order bigint, p_amount numeric, p_pin text) returns void language plpgsql security definer as $$
begin
  if not exists (select 1 from app_settings where key='manager_pin' and value = crypt(p_pin, value)) then
    raise exception 'Invalid PIN'; end if;
  update orders set discount = p_amount, discount_approved_by = auth.uid() where id = p_order;
  insert into audit_log(action, detail) values ('discount', jsonb_build_object('order', p_order, 'amount', p_amount));
end $$;

-- Sample stock and recipes
insert into inventory_items(name,unit,qty,min_qty) values ('Paneer','kg',5,2),('Dal','kg',8,2),('Rice','kg',10,3),('Flour','kg',10,3),('Tea','kg',2,.5),('Coffee','kg',2,.5),('Milk','l',20,5);
insert into recipes select m.id, i.id, v.a from (values ('Paneer Tikka','Paneer',.15),('Dal Makhani','Dal',.12),('Veg Biryani','Rice',.2),('Butter Naan','Flour',.08),('Masala Chai','Tea',.01),('Masala Chai','Milk',.1),('Cold Coffee','Coffee',.02),('Cold Coffee','Milk',.2)) v(d,n,a)
join menu_items m on m.name=v.d join inventory_items i on i.name=v.n;
