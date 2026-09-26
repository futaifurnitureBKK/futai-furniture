// Compares stock numbers from a newer copy of the stock workbook against the
// live database and produces a plan (what would change), used by
// /api/admin/stock/sync for both the preview and the apply step.

export interface SyncRow {
  section: string;
  code: string;
  size: string;
  wh: number;
  locked: number;
  actual: number | null;
  note: string;
}

export interface DbVariantLite {
  id: number;
  product_id: number;
  code: string;
  size_text: string;
  available: number;
  reserved: number;
  stock_note: string;
  archived: boolean;
}
export interface DbProductLite {
  id: number;
  code: string;
  category: string;
  stock_variants: DbVariantLite[];
}

export interface StockValues {
  available: number;
  reserved: number;
  note: string;
}
export interface PlanUpdate {
  variantId: number;
  productId: number;
  code: string;
  size: string;
  before: StockValues;
  after: StockValues;
}
export interface NewVariantSpec {
  code: string;
  option: string;
  size: string;
  values: StockValues;
}
export interface PlanNewVariant extends NewVariantSpec {
  productId: number;
  productCode: string;
}
export interface PlanNewProduct {
  code: string;
  category: string;
  variants: NewVariantSpec[];
}
export interface Plan {
  rows: number;
  updates: PlanUpdate[];
  unchanged: number;
  newVariants: PlanNewVariant[];
  newProducts: PlanNewProduct[];
  overLocked: string[];
}

const CAT_MAP: Record<string, string> = {
  前台: "reception",
  职员办公桌: "task-desk",
  总裁办公桌: "boss-desk",
  屏风办公桌: "workstation",
  办公椅: "office-chair",
  会议桌: "meeting-table",
  茶桌椅: "tea-table",
  洽谈桌椅: "discussion-set",
  茶几: "coffee-table",
  文件柜: "cabinet",
  沙发: "office-sofa",
  餐厅家具: "dining",
  卧室家具: "bedroom",
  样板: "sample",
};

const clean = (s: string) => s.replace(/[ \t]+/g, " ").trim();
export const canon = (s: string) => s.toUpperCase().replace(/[^A-Z0-9一-鿿]/g, "");
const sizeKey = (s: string) =>
  s.replace(/mm/gi, "").replace(/[WDHwdh]/g, "").replace(/\s+/g, "").replace(/[x×]/gi, "*");

// "茶桌WG-2485   （超晶石）" / "T-836\nXS530-3" / "RG-T10A\n(右)"
function splitCode(raw: string) {
  const lines = String(raw).split(/\n+/).map(clean).filter(Boolean);
  let main = lines[0] ?? "";
  const extras = lines.slice(1);
  const paren = [...main.matchAll(/[（(]([^）)]*)[）)]/g)].map((m) => m[1]);
  main = main.replace(/[（(][^）)]*[）)]/g, "").trim().replace(/^(茶桌|座椅|日规-?)/, "").trim();
  const notes = [...paren, ...extras.filter((e) => /[（(]/.test(e)).map((e) => e.replace(/[（()）]/g, ""))];
  const option = extras.find((e) => !/[（(]/.test(e)) ?? "";
  return { code: main && main !== "\\" ? main : "(ไม่ระบุรหัส)", option: option ?? "", notes };
}

export function parseDims(size: string) {
  const nums = [...size.replace(/mm/gi, "").matchAll(/(\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
  if (nums.length < 2 || nums.length > 3) return { width_mm: null, depth_mm: null, height_mm: null };
  return { width_mm: nums[0], depth_mm: nums[1], height_mm: nums[2] ?? null };
}

interface Entry {
  p: DbProductLite;
  v: DbVariantLite;
}

export function buildPlan(products: DbProductLite[], rows: SyncRow[]): Plan {
  const regular = new Map<string, Entry[]>();
  const samples = new Map<string, Entry[]>();
  const add = (m: Map<string, Entry[]>, k: string, e: Entry) => {
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(e);
  };
  products.forEach((p) =>
    p.stock_variants
      .filter((v) => !v.archived)
      .forEach((v) => add(p.category === "sample" ? samples : regular, canon(v.code || p.code), { p, v }))
  );
  const regularKeys = [...regular.keys()];

  function find(map: Map<string, Entry[]>, keys: string[], key: string): Entry[] | null {
    if (map.has(key)) return map.get(key)!;
    if (map !== regular) return null;
    if (key.length >= 5) {
      const hit = keys.find((k) => k.endsWith(key) && k.length - key.length <= 3);
      if (hit) return map.get(hit)!;
    }
    if (/[一-鿿]/.test(key)) {
      const hit = keys.find((k) => k.startsWith(key) && /^[一-鿿]{1,2}$/.test(k.slice(key.length)));
      if (hit) return map.get(hit)!;
    }
    return null;
  }

  const target = new Map<number, StockValues & { code: string; size: string; productId: number }>();
  const newVariants: PlanNewVariant[] = [];
  const newProductMap = new Map<string, PlanNewProduct>();
  const overLocked: string[] = [];

  for (const r of rows) {
    const category = CAT_MAP[r.section] ?? "other";
    const isSample = r.section === "样板";
    const { code, option, notes } = splitCode(r.code);
    const sizeLines = String(r.size).split(/\n+/).map(clean).filter(Boolean);
    const size = /^=DISPIMG/i.test(sizeLines[0] ?? "") ? "" : (sizeLines[0] ?? "").replace(/MM$/i, "").trim();
    const sizeNote = sizeLines.slice(1).join(" ");
    const wh = r.wh;
    const locked = r.locked;
    const actual = r.actual === null ? wh - locked : r.actual;
    const note = [clean(String(r.note).replace(/\n/g, "; ")), sizeNote, ...notes].filter(Boolean).join(" · ");
    if (actual < 0) overLocked.push(`${code} ${size}`.trim() + ` (${actual})`);

    const map = isSample ? samples : regular;
    const key = canon(option ? `${code} ${option}` : code);
    const cands = find(map, regularKeys, key);
    const sk = sizeKey(size);
    const hit = cands?.find((x) => sizeKey(x.v.size_text) === sk) ?? (cands && cands.length === 1 && !sk ? cands[0] : null);

    if (hit) {
      const cur = target.get(hit.v.id);
      if (cur) {
        cur.available += actual;
        cur.reserved += locked;
        cur.note = [cur.note, note].filter(Boolean).join(" | ");
      } else {
        target.set(hit.v.id, { available: actual, reserved: locked, note, code: hit.v.code, size: hit.v.size_text, productId: hit.p.id });
      }
    } else if (cands && cands.length) {
      newVariants.push({
        productId: cands[0].p.id,
        productCode: cands[0].p.code,
        code: cands[0].v.code,
        option: "",
        size,
        values: { available: actual, reserved: locked, note },
      });
    } else {
      const gk = `${category}|${canon(code)}`;
      let np = newProductMap.get(gk);
      if (!np) {
        np = { code, category, variants: [] };
        newProductMap.set(gk, np);
      }
      np.variants.push({
        code: option ? `${code} ${option}` : code,
        option,
        size,
        values: { available: actual, reserved: locked, note },
      });
    }
  }

  const byId = new Map<number, DbVariantLite>();
  products.forEach((p) => p.stock_variants.forEach((v) => byId.set(v.id, v)));

  const updates: PlanUpdate[] = [];
  let unchanged = 0;
  for (const [variantId, t] of target) {
    const v = byId.get(variantId)!;
    const before = { available: Number(v.available), reserved: Number(v.reserved), note: v.stock_note ?? "" };
    const after = { available: t.available, reserved: t.reserved, note: t.note };
    if (before.available === after.available && before.reserved === after.reserved && before.note === after.note) {
      unchanged++;
    } else {
      updates.push({ variantId, productId: t.productId, code: t.code, size: t.size, before, after });
    }
  }

  return {
    rows: rows.length,
    updates,
    unchanged,
    newVariants,
    newProducts: [...newProductMap.values()],
    overLocked,
  };
}
