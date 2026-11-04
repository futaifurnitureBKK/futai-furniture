-- Wires up existing catalog photos (already in public/catalog-images/,
-- from the original catalog scrape) for 4 of the 5 drafts that had no
-- image — no re-upload needed for these. QT3001 has no photo anywhere in
-- the project and needs a real one (supplier or taken in person) before
-- it can be published; a generated/fake image would misrepresent the
-- real product to customers.
-- Run in Supabase SQL editor.

update products set images = '{/catalog-images/dhx-301br.webp}'  where sku = 'DHX-301BR';
update products set images = '{/catalog-images/dhx-301bgr.webp}' where sku = 'DHX-301BGR';
update products set images = '{/catalog-images/t-010.webp}'      where sku = 'T-010';
update products set images = '{/catalog-images/f611-sg.webp}'    where sku = 'F611-SG';

select sku, images, is_active from products where sku in ('DHX-301BR','DHX-301BGR','T-010','F611-SG','QT3001') order by sku;
