-- Adds the stock models that genuinely have no public product page yet AND
-- have a price (the only ones worth listing as-is). This list was verified
-- by hand against the live site's titles — not just matched by raw stock
-- code — because most raw stock codes turned out to already be published
-- under a cleaned-up SKU (e.g. stock code "A1267 雪橇架" is already live as
-- "A1267-SLED"). A naive code-string diff found 34 "missing" priced items;
-- 24 of those were already live under a different SKU. These 10 are not.
--
-- Inserted as DRAFTS (is_active = false) on purpose — no real Thai/EN/ZH
-- marketing copy or verified photos exist for most of these yet (5 of 10
-- have no stock photo at all). Review each in /admin/products, add a real
-- name/description/photo, then flip is_active to true to publish.
-- Run in Supabase SQL editor.

insert into products (sku, name_th, name_en, name_zh, category_slug, description_th, dimensions, price, images, is_active)
values
  ('QT3001', 'เคาน์เตอร์ต้อนรับ รุ่น QT3001', 'Reception Counter QT3001', '前台 QT3001',
   'reception', '', '(กว้าง×ลึก×สูง) 3000 × 616 × 1050 มม.', 16500, '{}', false),

  ('YN-01-1', 'โต๊ะทำงานพนักงาน รุ่น YN-01-1', 'Staff Office Desk YN-01-1', '员工办公桌 YN-01-1',
   'task-desk', '', '(กว้าง×ลึก×สูง) 1200 × 600 × 750 มม.', 3900, '{}', false),

  ('YN-QC-A1202', 'โต๊ะทำงานพนักงาน รุ่น YN-QC-A1202', 'Staff Office Desk YN-QC-A1202', '员工办公桌 YN-QC-A1202',
   'task-desk', '', '(กว้าง×ลึก×สูง) 1200 × 600 × 1050 มม.', 5400, '{/stock-demo/p56.jpg}', false),

  ('DHX-301BR', 'เก้าอี้สำนักงาน รุ่น DHX-301BR', 'Office Chair DHX-301BR', '办公椅 DHX-301BR',
   'office-chair', '', '(กว้าง×ลึก×สูง) 630 × 470 × 625 มม.', 3120, '{}', false),

  ('DHX-301BGR', 'เก้าอี้สำนักงาน รุ่น DHX-301BGR', 'Office Chair DHX-301BGR', '办公椅 DHX-301BGR',
   'office-chair', '', '(กว้าง×ลึก×สูง) 630 × 470 × 625 มม.', 3120, '{}', false),

  ('T-010', 'โซฟาสำนักงาน รุ่น T-010', 'Office Sofa T-010', '办公沙发 T-010',
   'office-sofa', '', '(กว้าง×ลึก×สูง) 850 × 1000 × 730 มม.', 3560, '{}', false),

  ('WG-1706-Y-1.3', 'ชุดโต๊ะน้ำชา รุ่น WG-1706-Y', 'Tea Table Set WG-1706-Y', '茶桌椅 WG-1706-Y',
   'tea-table', '', '(กว้าง×ลึก×สูง) 1300 × 700 × 550 มม.', 5925, '{/stock-demo/p203.jpg}', false),

  ('CX-CA08', 'โต๊ะกลาง รุ่น CX-CA08', 'Coffee Table CX-CA08', '茶几 CX-CA08',
   'tea-table', '', '(กว้าง×ลึก×สูง) 1200 × 600 × 450 มม.', 3300, '{}', false),

  ('F611-P13', 'โต๊ะประชุม รุ่น F611-P13', 'Meeting Table F611-P13', '会议桌 F611-P13',
   'meeting-table', '', '(กว้าง×ลึก×สูง) 1200 × 460 × 1700 มม.', 34500, '{/stock-demo/p46.jpg}', false),

  ('F611-SG', 'ตู้เก็บเอกสาร รุ่น F611-SG', 'Filing Cabinet F611-SG', '文件柜 F611-SG',
   'cabinet', '', '(กว้าง×ลึก×สูง) 1800 × 350 × 2000 มม.', 20700, '{}', false);
-- No ON CONFLICT clause: these 10 SKUs were checked by hand against the live
-- site (see note above) and confirmed not to exist yet. If this errors on a
-- duplicate key, stop and tell me which one — don't rerun with ON CONFLICT
-- without checking why it already exists.

select sku, name_th, category_slug, price, is_active from products where sku in (
  'QT3001','YN-01-1','YN-QC-A1202','DHX-301BR','DHX-301BGR','T-010','WG-1706-Y-1.3','CX-CA08','F611-P13','F611-SG'
) order by sku;
