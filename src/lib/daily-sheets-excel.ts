import type ExcelJSNamespace from "exceljs";
import type { DailySalesRow, DailyShippingRow } from "@/types";

// Shared by the Daily Sales and Daily Shipping pages so an export from either
// one always produces the same single .xlsx file with both sheets — matching
// the original two-sheet 单日销售&出货表格 template.

export const SALES_HEADERS = [
  "序号\nNo. (เลขที่)",
  "型号\nModel (แบบอย่าง)",
  "图片\nPicture (รูปภาพ)",
  "规格\n(mm) (ขนาด)",
  "单价\nUnit Price (ราคาต่อหน่วย)",
  "数量\nQuantity (ปริมาณ)",
  "总金额\nTotal (จำนวนเงินทั้งหมด)",
  "客户\nCustomer (ชื่อลูกค้า)",
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

const PICTURE_COL_WIDTH = 12;
const DATA_ROW_HEIGHT = 56;
// Excel's "column width" unit and points-per-row don't map 1:1 to pixels;
// these are the standard approximations (Calibri 11 default font) so the
// embedded image sizes exactly to the actual cell instead of guessing.
const PICTURE_COL_PX = Math.round(PICTURE_COL_WIDTH * 7 + 5);
const DATA_ROW_PX = Math.round((DATA_ROW_HEIGHT * 4) / 3);
const THIN_BORDER = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } as const;

function styleHeaderRow(row: ExcelJSNamespace.Row) {
  row.eachCell((c) => {
    c.alignment = { wrapText: true, horizontal: "center", vertical: "middle" };
    c.font = { bold: true, size: 9 };
    c.border = THIN_BORDER;
  });
}

async function embedRowImage(
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
    // Sized to the Picture column's actual pixel width/height so it fills
    // the cell exactly instead of spilling over or leaving gaps.
    ws.addImage(imageId, {
      tl: { col: pictureColIndex, row: row.number - 1 },
      ext: { width: PICTURE_COL_PX, height: DATA_ROW_PX },
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
    { width: 8 }, { width: 14 }, { width: 22 }, { width: 14 }, { width: 16 },
  ];
  ws.mergeCells("A1:J1");
  const title = ws.getCell("A1");
  title.value = "单日销售表格\nDaily Sales (แบบฟอร์มการขายประจำวัน ) " + date;
  title.alignment = { wrapText: true, horizontal: "center", vertical: "middle" };
  title.font = { bold: true, size: 13 };
  ws.getRow(1).height = 28;

  styleHeaderRow(ws.addRow(SALES_HEADERS));

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const row = ws.addRow([
      i + 1, r.sku, "", r.size_text, r.unit_price, r.qty, r.qty * r.unit_price, r.customer_name, r.salesperson || "", r.po_no,
    ]);
    row.eachCell((c) => { c.border = THIN_BORDER; });
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
  ws.getRow(1).height = 28;

  styleHeaderRow(ws.addRow(SHIPPING_HEADERS));

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const row = ws.addRow([
      i + 1, r.sku, "", r.size_text, r.qty, r.remark, r.customer_name, r.salesperson || "", r.po_no, r.consignee, r.phone,
    ]);
    row.eachCell((c) => { c.border = THIN_BORDER; });
    row.height = DATA_ROW_HEIGHT;
    await embedRowImage(wb, ws, row, r.image_url, 2);
  }
}

export async function buildDailySheetsWorkbook(date: string, salesRows: DailySalesRow[], shippingRows: DailyShippingRow[]) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await addSalesSheet(wb, date, salesRows);
  await addShippingSheet(wb, date, shippingRows);
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
