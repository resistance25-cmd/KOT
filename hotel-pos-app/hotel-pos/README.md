# Hotel POS (Next.js + Supabase)
1. Create a Supabase project. In the SQL editor run `db/schema.sql`, then `db/patch.sql` (adds KOT link and sample menu).
2. Authentication > Users: add staff, then insert their row in `profiles` (id, name, role). Roles: admin, manager, cashier, captain, waiter, kitchen.
3. `cp .env.example .env.local` and fill in the project URL and anon key.
4. `npm install && npm run dev`, open http://localhost:3000. Deploy to Vercel when ready.
5. Kitchen PC: in `print-agent/`, `npm i @supabase/supabase-js node-thermal-printer`, set SUPABASE_URL, SUPABASE_SERVICE_KEY and PRINTER_ADDR, run with PM2.
6. Run `db/patch2.sql` (guest ordering). Set hotel name, address and GSTIN in `.env.local` for bills.
7. Guest QR: make a QR code per table/room pointing to `https://YOUR-SITE/guest?t=LOCATION_ID` (id from the `locations` table). Guest orders appear on the staff order screen to Accept.
8. Print bill: opens a GST bill sized for an 80mm thermal printer; pick the printer in the browser print dialog.
9. Run `db/patch3.sql` (kitchen display, inventory and recipes, room checkout, manager-approved discounts). The default manager PIN is 1234: change it by updating the `manager_pin` row with `crypt('NEWPIN', gen_salt('bf'))`.
