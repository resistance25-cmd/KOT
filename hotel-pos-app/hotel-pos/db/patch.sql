-- Run after schema.sql: links order items to the KOT that sent them
alter table order_items add column kot_id bigint references kots;
-- Sample data
insert into locations(kind,label) values ('table','Table 1'),('table','Table 2'),('table','Table 3'),('room','Room 101'),('room','Room 102'),('room','Room 201');
insert into menu_categories(name) values ('Starters'),('Mains'),('Breads'),('Beverages');
insert into menu_items(category_id,name,price,gst_percent) values (1,'Paneer Tikka',260,5),(2,'Dal Makhani',220,5),(2,'Veg Biryani',240,5),(3,'Butter Naan',45,5),(4,'Masala Chai',40,5),(4,'Cold Coffee',110,5);
