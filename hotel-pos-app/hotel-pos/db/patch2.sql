-- Guest QR ordering: guests can only INSERT requests; staff accept them into real orders
create table guest_requests (
  id bigserial primary key,
  location_id int references locations,
  items jsonb not null,
  note text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
alter table guest_requests enable row level security;
create policy guest_insert on guest_requests for insert to anon with check (status = 'pending');
create policy staff_all on guest_requests for all to authenticated using (true);
create policy anon_menu on menu_items for select to anon using (available);
create policy anon_cat on menu_categories for select to anon using (true);
create policy anon_loc on locations for select to anon using (true);
alter publication supabase_realtime add table guest_requests;
