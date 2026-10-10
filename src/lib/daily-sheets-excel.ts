import type ExcelJSNamespace from "exceljs";
import type { DailySalesRow, DailyShippingRow, DailyExportRow, DailyExportChannel } from "@/types";

// Shared by the Daily Sales, Daily Shipping, and Daily Export pages so an
// export from any one of them always produces the same single .xlsx file
// with all three sheets — matching the original two-sheet 单日销售&出货表格
// template, plus the newer 单日出库表格 sheet alongside it.

// When nobody has entered/imported anything into Daily Shipping yet for a
// date, the shipping sheet shouldn't just export blank — this derives a
// stand-in set of shipping rows straight from that day's Daily Sales rows.
// Remark carries over since both sheets track it, and the customer's phone
// is used as a starting point for Tel.; "consignee" isn't tracked in Daily
// Sales, so that one comes out blank (it's often a different person).
export function salesRowsToShippingRows(rows: DailySalesRow[]): DailyShippingRow[] {
  return rows.map((r) => ({
    id: r.id,
    ship_date: r.sale_date,
    sort_order: r.sort_order,
    sku: r.sku,
    image_url: r.image_url,
    size_text: r.size_text,
    qty: r.qty,
    remark: r.remark,
    customer_name: r.customer_name,
    salesperson: r.salesperson,
    po_no: r.po_no,
    consignee: "",
    phone: r.customer_phone,
    source_quote_id: r.source_quote_id,
    stock_variant_id: r.stock_variant_id,
    stock_deducted_qty: r.stock_deducted_qty,
    stock_deducted_field: r.stock_deducted_field,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

export const SALES_HEADERS = [
  "序号\nNo. (เลขที่)",
  "型号\nModel (แบบอย่าง)",
  "图片\nPicture (รูปภาพ)",
  "规格\n(mm) (ขนาด)",
  "单价\nUnit Price (ราคาต่อหน่วย)",
  "数量\nQuantity (ปริมาณ)",
  "总金额\nTotal (จำนวนเงินทั้งหมด)",
  "备注\nRemark (หมายเหตุ)",
  "客户\nCustomer (ชื่อลูกค้า)",
  "客户电话\nCustomer Tel. (เบอร์ลูกค้า)",
  "业务员\nSaler (ผู้ขาย)",
  "订单号\nPO No. (เลขที่ใบสั่งซื้อ)",
];

export const SHIPPING_HEADERS = [
  "序号\nNo. (เลขที่)",
  "型号\nModel (แบบอย่าง)",
  "图片\nPicture (รูปภาพ)",
  "规格\n(mm) (ขนาด)",
  "数量\nQuantity (ปริมาณ)",
  "备注\nRemark (หมายเหตุ)",
  "客户\nCustomer (ชื่อลูกค้า)",
  "业务员\nSaler (ผู้ขาย)",
  "订单号\nPO No. (เลขที่ใบสั่งซื้อ)",
  "收货人\nConsignee (ผู้รับสินค้า)",
  "联系电话\nTel. (เบอร์ติดต่อ)",
];

export const EXPORT_HEADERS = [
  "序号\nNo. (เลขที่)",
  "型号\nModel (แบบอย่าง)",
  "图片\nPicture (รูปภาพ)",
  "规格\n(mm) (ขนาด)",
  "单价\nUnit Price (ราคาต่อหน่วย)",
  "数量\nQuantity (ปริมาณ)",
  "件数(2400mm换算)\nQty deducted (2400mm equiv.) (จำนวนที่ตัด เทียบเท่า 2400mm)",
  "折扣%\nDiscount % (ส่วนลด)",
  "总金额\nTotal (จำนวนเงินทั้งหมด)",
  "渠道\nChannel (ช่องทาง)",
  "备注\nRemark (หมายเหตุ)",
  "客户\nCustomer (ชื่อลูกค้า)",
  "经手人\nStaff (ผู้ดำเนินการ)",
  "订单号\nPO No. (เลขที่ใบสั่งซื้อ)",
];

// th/en/zh only — the Daily Export page keeps its own richer copy of this
// (with Tailwind color classes for the on-screen badge) since that one's a
// UI concern, not an Excel one.
const EXPORT_CHANNEL_LABELS: Record<DailyExportChannel, { th: string; en: string; zh: string }> = {
  shopee: { th: "Shopee", en: "Shopee", zh: "Shopee" },
  tiktok: { th: "TikTok Shop", en: "TikTok Shop", zh: "TikTok Shop" },
  storefront: { th: "หน้าร้าน", en: "Storefront", zh: "门店" },
  b2b: { th: "โครงการ/B2B", en: "Project / B2B", zh: "项目/B2B" },
};

export const PICTURE_COL_WIDTH = 12;
export const DATA_ROW_HEIGHT = 56;
// Excel's "column width" unit and points-per-row don't map 1:1 to pixels;
// these are the standard approximations (Calibri 11 default font) so the
// embedded image sizes exactly to the actual cell instead of guessing.
const PICTURE_COL_PX = Math.round(PICTURE_COL_WIDTH * 7 + 5);
const DATA_ROW_PX = Math.round((DATA_ROW_HEIGHT * 4) / 3);
// The Picture column and the data row aren't the same pixel size, so
// stretching a photo to fill both distorts it. Instead the image is kept
// square (1:1) at whichever side is smaller, with a little padding, and
// centered in the cell — it ends up slightly smaller than the cell rather
// than exactly filling it, but never squished.
const IMAGE_PADDING_PX = 4;
const IMAGE_SQUARE_PX = Math.max(8, Math.min(PICTURE_COL_PX, DATA_ROW_PX) - IMAGE_PADDING_PX * 2);
const IMAGE_COL_OFFSET = (PICTURE_COL_PX - IMAGE_SQUARE_PX) / 2 / PICTURE_COL_PX;
const IMAGE_ROW_OFFSET = (DATA_ROW_PX - IMAGE_SQUARE_PX) / 2 / DATA_ROW_PX;
export const TITLE_ROW_HEIGHT = 46;
export const THIN_BORDER = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } as const;
export const DATA_CELL_ALIGNMENT = { horizontal: "center", vertical: "middle", wrapText: true } as const;

export function styleHeaderRow(row: ExcelJSNamespace.Row) {
  row.eachCell((c) => {
    c.alignment = { wrapText: true, horizontal: "center", vertical: "middle" };
    c.font = { bold: true, size: 9 };
    c.border = THIN_BORDER;
  });
}

export async function embedRowImage(
  wb: ExcelJSNamespace.Workbook,
  ws: ExcelJSNamespace.Worksheet,
  row: ExcelJSNamespace.Row,
  imageUrl: string | null,
  pictureColIndex: number
) {
  if (!imageUrl) return;
  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return;
    const buf = await imgRes.arrayBuffer();
    const ct = imgRes.headers.get("content-type") || "";
    const extension = ct.includes("png") ? "png" : ct.includes("gif") ? "gif" : "jpeg";
    const imageId = wb.addImage({ buffer: buf, extension });
    // Kept square (1:1) and centered in the cell rather than stretched to
    // fill it — see IMAGE_SQUARE_PX above.
    ws.addImage(imageId, {
      tl: { col: pictureColIndex + IMAGE_COL_OFFSET, row: row.number - 1 + IMAGE_ROW_OFFSET },
      ext: { width: IMAGE_SQUARE_PX, height: IMAGE_SQUARE_PX },
      editAs: "oneCell",
    });
  } catch {
    // image failed to load — leave the cell blank rather than fail the export
  }
}

async function addSalesSheet(wb: ExcelJSNamespace.Workbook, date: string, rows: DailySalesRow[]) {
  const ws = wb.addWorksheet("Daily Sales");
  ws.columns = [
    { width: 6 }, { width: 16 }, { width: PICTURE_COL_WIDTH }, { width: 16 }, { width: 12 },
    { width: 8 }, { width: 14 }, { width: 18 }, { width: 22 }, { width: 14 }, { width: 14 }, { width: 16 },
  ];
  ws.mergeCells("A1:L1");
  const title = ws.getCell("A1");
  title.value = "单日销售表格\nDaily Sales (แบบฟอร์มการขายประจำวัน ) " + date;
  title.alignment = { wrapText: true, horizontal: "center", vertical: "middle" };
  title.font = { bold: true, size: 13 };
  ws.getRow(1).height = TITLE_ROW_HEIGHT;

  styleHeaderRow(ws.addRow(SALES_HEADERS));

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const row = ws.addRow([
      i + 1, r.sku, "", r.size_text, r.unit_price, r.qty, r.qty * r.unit_price, r.remark, r.customer_name, r.customer_phone, r.salesperson || "", r.po_no,
    ]);
    row.eachCell((c) => { c.border = THIN_BORDER; c.alignment = DATA_CELL_ALIGNMENT; });
    row.height = DATA_ROW_HEIGHT;
    await embedRowImage(wb, ws, row, r.image_url, 2);
  }
}

async function addShippingSheet(wb: ExcelJSNamespace.Workbook, date: string, rows: DailyShippingRow[]) {
  const ws = wb.addWorksheet("Daily Shipping");
  ws.columns = [
    { width: 6 }, { width: 16 }, { width: PICTURE_COL_WIDTH }, { width: 16 }, { width: 10 },
    { width: 18 }, { width: 22 }, { width: 14 }, { width: 16 }, { width: 16 }, { width: 16 },
  ];
  ws.mergeCells("A1:K1");
  const title = ws.getCell("A1");
  title.value = "单日出货表格\nDaily Shipping (แบบฟอร์มการจัดส่งสินค้ารายวัน) " + date;
  title.alignment = { wrapText: true, horizontal: "center", vertical: "middle" };
  title.font = { bold: true, size: 13 };
  ws.getRow(1).height = TITLE_ROW_HEIGHT;

  styleHeaderRow(ws.addRow(SHIPPING_HEADERS));

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const row = ws.addRow([
      i + 1, r.sku, "", r.size_text, r.qty, r.remark, r.customer_name, r.salesperson || "", r.po_no, r.consignee, r.phone,
    ]);
    row.eachCell((c) => { c.border = THIN_BORDER; c.alignment = DATA_CELL_ALIGNMENT; });
    row.height = DATA_ROW_HEIGHT;
    await embedRowImage(wb, ws, row, r.image_url, 2);
  }
}

function rowTotal(r: DailyExportRow): number {
  return r.qty * r.unit_price * (1 - r.discount_pct / 100);
}

async function addExportSheet(
  wb: ExcelJSNamespace.Workbook,
  date: string,
  rows: DailyExportRow[],
  sharedStockMetaByVariant: Map<number, { unitFactor: number }>,
  lang: "th" | "en" | "zh"
) {
  const ws = wb.addWorksheet("Daily Export");
  ws.columns = [
    { width: 6 }, { width: 16 }, { width: PICTURE_COL_WIDTH }, { width: 16 }, { width: 12 },
    { width: 8 }, { width: 10 }, { width: 10 }, { width: 14 }, { width: 14 }, { width: 18 }, { width: 22 }, { width: 16 }, { width: 16 },
  ];
  ws.mergeCells("A1:N1");
  const title = ws.getCell("A1");
  title.value = "单日出库表格\nDaily Export (แบบฟอร์มการส่งออกสินค้ารายวัน) " + date;
  title.alignment = { wrapText: true, horizontal: "center", vertical: "middle" };
  title.font = { bold: true, size: 13 };
  ws.getRow(1).height = TITLE_ROW_HEIGHT;

  styleHeaderRow(ws.addRow(EXPORT_HEADERS));

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const sharedMeta = sharedStockMetaByVariant.get(r.stock_variant_id);
    const setsDeducted = sharedMeta ? (r.qty * sharedMeta.unitFactor) / 2 : "";
    const row = ws.addRow([
      i + 1, r.sku, "", r.size_text, r.unit_price, r.qty, setsDeducted, r.discount_pct, rowTotal(r),
      r.channel ? EXPORT_CHANNEL_LABELS[r.channel][lang] : "",
      r.remark, r.customer_name, r.salesperson || "", r.po_no,
    ]);
    row.eachCell((c) => { c.border = THIN_BORDER; c.alignment = DATA_CELL_ALIGNMENT; });
    row.height = DATA_ROW_HEIGHT;
    await embedRowImage(wb, ws, row, r.image_url, 2);
  }
}

export async function buildDailySheetsWorkbook(
  date: string,
  salesRows: DailySalesRow[],
  shippingRows: DailyShippingRow[],
  exportData?: {
    rows: DailyExportRow[];
    sharedStockMetaByVariant: Map<number, { unitFactor: number }>;
    lang: "th" | "en" | "zh";
  }
) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await addSalesSheet(wb, date, salesRows);
  await addShippingSheet(wb, date, shippingRows);
  if (exportData) {
    await addExportSheet(wb, date, exportData.rows, exportData.sharedStockMetaByVariant, exportData.lang);
  }
  return wb;
}

export async function downloadWorkbook(wb: ExcelJSNamespace.Workbook, filename: string) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
