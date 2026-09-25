// Column allow-lists shared by the /api/admin/stock routes.

export const PRODUCT_FIELDS = [
  "code",
  "category",
  "image_url",
  "description",
  "color",
  "material",
  "boxes_per_item",
  "archived",
] as const;

export const VARIANT_FIELDS = [
  "code",
  "label",
  "size_text",
  "width_mm",
  "depth_mm",
  "height_mm",
  "is_round",
  "price",
  "note",
  "available",
  "reserved",
  "defective",
  "reorder_point",
  "location",
  "eta",
  "batch_no",
  "landed_cost",
  "stock_note",
  "tracked",
  "archived",
] as const;

// Numeric stock columns whose every change is written to stock_movements.
export const TRACKED_MOVEMENT_FIELDS = ["available", "reserved", "defective"] as const;

export function pick<T extends readonly string[]>(body: Record<string, unknown>, fields: T) {
  const out: Record<string, unknown> = {};
  for (const f of fields) if (f in body) out[f] = body[f];
  return out;
}
