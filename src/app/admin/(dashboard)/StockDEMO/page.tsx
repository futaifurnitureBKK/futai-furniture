"use client";
import { Fragment, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Search, Download, Eye, EyeOff, PackageSearch, TriangleAlert, Plus, Trash2, Archive, ArchiveRestore,
  Loader2, Upload, History, Database, RefreshCw,
} from "lucide-react";
import type { Plan } from "@/lib/stock-sync";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useLanguage } from "@/store/language";
import raw from "@/data/stock-demo.json";
import topSellersRaw from "@/data/top-sellers.json";

interface Cat {
  key: string;
  zh: string;
  en: string;
  th: string;
}
interface DbVariant {
  id: number;
  product_id: number;
  code: string;
  label: string;
  size_text: string;
  width_mm: number | null;
  depth_mm: number | null;
  height_mm: number | null;
  is_round: boolean;
  price: number | null;
  note: string;
  flag: string | null;
  from_stock: boolean;
  sort_order: number;
  available: number;
  reserved: number;
  defective: number;
  reorder_point: number;
  location: string;
  eta: string | null;
  batch_no: string;
  landed_cost: number | null;
  stock_note: string;
  tracked: boolean;
  archived: boolean;
}
interface DbProduct {
  id: number;
  code: string;
  category: string;
  image_url: string | null;
  description: string;
  color: string;
  material: string;
  boxes_per_item: number;
  from_stock: boolean;
  archived: boolean;
  stock_variants: DbVariant[];
}
interface Movement {
  id: number;
  variant_id: number;
  field: string;
  old_value: number | null;
  new_value: number | null;
  created_at: string;
}

const CATEGORIES = raw.categories as Cat[];
const PAGE = 40;
const CUSTOM = "custom";

interface TopSeller {
  code: string;
  qty: number;
  revenue: number;
  orders: number;
  y2025: number;
  y2026: number;
}
const TOP_SELLERS = topSellersRaw.top as TopSeller[];
const canonCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9一-鿿]/g, "");

type StatusKey = "ok" | "low" | "out" | "untracked";
type StatusFilter = "all" | StatusKey;

const STATUS_STYLE: Record<StatusKey, string> = {
  ok: "bg-green-100 text-green-700",
  low: "bg-amber-100 text-amber-700",
  out: "bg-red-100 text-red-700",
  untracked: "bg-[#E8E5E0] text-[#6B6B6B]",
};

function statusOf(v: DbVariant): StatusKey {
  if (!v.tracked) return "untracked";
  if (v.available <= 0) return "out";
  if (v.reorder_point > 0 && v.available <= v.reorder_point) return "low";
  return "ok";
}

const fmt = (n: number) => n.toLocaleString("th-TH", { maximumFractionDigits: 1 });
const num = (v: string) => Math.max(0, Number(v) || 0);

function sizeLabel(v: DbVariant) {
  const base = v.is_round
    ? v.size_text
    : v.width_mm != null
      ? `${v.width_mm}*${v.depth_mm ?? "-"}*${v.height_mm ?? "-"}`
      : v.size_text;
  if (v.label) return base ? `${v.label}: ${base}` : v.label;
  return base || "-";
}

function parseDims(text: string) {
  const nums = [...text.replace(/mm/gi, "").matchAll(/(\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
  if (nums.length < 2 || nums.length > 3) return { width_mm: null, depth_mm: null, height_mm: null };
  return { width_mm: nums[0], depth_mm: nums[1], height_mm: nums[2] ?? null };
}

const activeVariants = (p: DbProduct) =>
  p.stock_variants.filter((v) => !v.archived).sort((a, b) => a.sort_order - b.sort_order);

// No price on any size = made-to-order. Showroom samples stay where they are.
const isCustom = (p: DbProduct) =>
  p.category !== "sample" && activeVariants(p).every((v) => v.price == null);

async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/products/upload", { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data.url as string;
}

interface NewSize {
  size_text: string;
  price: string;
  note: string;
}
// Debounced variant saves: bookkeeping lives at module level (never rendered).
const editTimers: Record<number, ReturnType<typeof setTimeout>> = {};
const pendingEdits: Record<number, Partial<DbVariant>> = {};

function scheduleVariantSave(vid: number, change: Partial<DbVariant>, onError: (message?: string) => void) {
  pendingEdits[vid] = { ...pendingEdits[vid], ...change };
  clearTimeout(editTimers[vid]);
  editTimers[vid] = setTimeout(async () => {
    const body = pendingEdits[vid];
    delete pendingEdits[vid];
    if (!body) return;
    const res = await fetch(`/api/admin/stock/variants/${vid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      onError(data.error);
    }
  }, 600);
}

const emptyNew = { code: "", category: "office-chair", image_url: "", description: "" };

export default function StockPage() {
  const { t } = useLanguage();
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [archivedView, setArchivedView] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [seeding, setSeeding] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncApplying, setSyncApplying] = useState(false);
  const [syncPlan, setSyncPlan] = useState<{ label: string; plan: Plan } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [limit, setLimit] = useState(PAGE);
  const [showCost, setShowCost] = useState(false);

  const [detailId, setDetailId] = useState<number | null>(null);
  const [draft, setDraft] = useState({ code: "", category: "", description: "", color: "", material: "", boxes_per_item: 1, image_url: "" });
  const [movements, setMovements] = useState<Movement[]>([]);
  const [uploading, setUploading] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [newProd, setNewProd] = useState(emptyNew);
  const [newSizes, setNewSizes] = useState<NewSize[]>([{ size_text: "", price: "", note: "" }]);
  const [creating, setCreating] = useState(false);

  const detail = useMemo(() => products.find((p) => p.id === detailId) ?? null, [products, detailId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/stock?archived=${archivedView}`);
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) {
          setProducts(data.products);
          setLoadError(null);
        } else {
          setLoadError(data.error || "Load failed");
        }
      } catch {
        if (!cancelled) setLoadError("Network error");
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [archivedView, reloadTick]);

  // ── variant edits: optimistic, saved 0.6s after the last keystroke ──
  function editVariant(pid: number, vid: number, change: Partial<DbVariant>) {
    const stockTouched = "available" in change || "reserved" in change || "defective" in change;
    const local = stockTouched ? { ...change, tracked: true } : change;
    setProducts((list) =>
      list.map((p) =>
        p.id !== pid ? p : { ...p, stock_variants: p.stock_variants.map((v) => (v.id === vid ? { ...v, ...local } : v)) }
      )
    );
    scheduleVariantSave(vid, change, (message) => toast.error(message || t("บันทึกไม่สำเร็จ", "Save failed", "保存失败")));
  }

  function editSize(pid: number, vid: number, text: string) {
    editVariant(pid, vid, { size_text: text, ...parseDims(text) });
  }

  async function archiveVariant(pid: number, vid: number) {
    if (!confirm(t("เก็บขนาดนี้เข้าคลัง (ซ่อน)?", "Archive this size (hide it)?", "归档此规格（隐藏）？"))) return;
    const res = await fetch(`/api/admin/stock/variants/${vid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    if (res.ok) {
      setProducts((list) =>
        list.map((p) => (p.id !== pid ? p : { ...p, stock_variants: p.stock_variants.map((v) => (v.id === vid ? { ...v, archived: true } : v)) }))
      );
    } else {
      toast.error(t("เก็บเข้าคลังไม่สำเร็จ", "Archive failed", "归档失败"));
    }
  }

  async function addVariant(pid: number) {
    const p = products.find((x) => x.id === pid);
    const res = await fetch(`/api/admin/stock/${pid}/variants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: p?.code ?? "" }),
    });
    const data = await res.json();
    if (res.ok) {
      setProducts((list) => list.map((x) => (x.id === pid ? { ...x, stock_variants: [...x.stock_variants, data.variant] } : x)));
    } else {
      toast.error(data.error || t("เพิ่มขนาดไม่สำเร็จ", "Could not add size", "添加规格失败"));
    }
  }

  // ── product level ──
  function openDetail(p: DbProduct) {
    setDetailId(p.id);
    setDraft({
      code: p.code, category: p.category, description: p.description, color: p.color,
      material: p.material, boxes_per_item: p.boxes_per_item, image_url: p.image_url ?? "",
    });
    setMovements([]);
    (async () => {
      const res = await fetch(`/api/admin/stock/${p.id}/movements`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) setMovements(data.movements);
    })();
  }

  async function saveProduct() {
    if (!detail) return;
    if (!draft.code.trim()) {
      toast.error(t("กรุณาใส่รหัสสินค้า", "Please enter a product code", "请输入产品编号"));
      return;
    }
    setSavingProduct(true);
    const res = await fetch(`/api/admin/stock/${detail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, code: draft.code.trim(), image_url: draft.image_url || null }),
    });
    const data = await res.json();
    setSavingProduct(false);
    if (res.ok) {
      setProducts((list) => list.map((p) => (p.id === detail.id ? { ...p, ...data.product } : p)));
      toast.success(t("บันทึกแล้ว", "Saved", "已保存"));
    } else {
      toast.error(data.error || t("บันทึกไม่สำเร็จ", "Save failed", "保存失败"));
    }
  }

  async function setProductArchived(id: number, archived: boolean) {
    const res = await fetch(`/api/admin/stock/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived }),
    });
    if (res.ok) {
      setProducts((list) => list.filter((p) => p.id !== id));
      setDetailId(null);
      toast.success(archived ? t("เก็บเข้าคลังแล้ว", "Archived", "已归档") : t("กู้คืนแล้ว", "Restored", "已恢复"));
    } else {
      toast.error(t("ทำรายการไม่สำเร็จ", "Action failed", "操作失败"));
    }
  }

  async function uploadFor(setter: (url: string) => void, file: File) {
    setUploading(true);
    try {
      setter(await uploadImage(file));
    } catch {
      toast.error(t("อัปโหลดรูปไม่สำเร็จ", "Upload failed", "上传失败"));
    } finally {
      setUploading(false);
    }
  }

  async function createProduct() {
    if (!newProd.code.trim()) {
      toast.error(t("กรุณาใส่รหัสสินค้า", "Please enter a product code", "请输入产品编号"));
      return;
    }
    setCreating(true);
    const res = await fetch("/api/admin/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: newProd.code.trim(),
        category: newProd.category,
        image_url: newProd.image_url || null,
        description: newProd.description,
        variants: newSizes
          .filter((s) => s.size_text.trim() || s.price.trim())
          .map((s) => ({
            code: newProd.code.trim(),
            size_text: s.size_text.trim(),
            ...parseDims(s.size_text),
            price: s.price.trim() === "" ? null : Number(s.price),
            note: s.note,
          })),
      }),
    });
    const data = await res.json();
    setCreating(false);
    if (res.ok) {
      if (!archivedView) setProducts((list) => [...list, data.product]);
      setAddOpen(false);
      setNewProd(emptyNew);
      setNewSizes([{ size_text: "", price: "", note: "" }]);
      toast.success(t("เพิ่มสินค้าแล้ว", "Product added", "已添加产品"));
    } else {
      toast.error(data.error || t("เพิ่มสินค้าไม่สำเร็จ", "Could not add product", "添加产品失败"));
    }
  }

  async function openSync() {
    setSyncOpen(true);
    setSyncPlan(null);
    setSyncError(null);
    setSyncLoading(true);
    try {
      const res = await fetch("/api/admin/stock/sync");
      const data = await res.json();
      if (res.ok) setSyncPlan(data);
      else setSyncError(data.error || "Load failed");
    } catch {
      setSyncError("Network error");
    }
    setSyncLoading(false);
  }

  async function applySync() {
    setSyncApplying(true);
    const res = await fetch("/api/admin/stock/sync", { method: "POST" });
    const data = await res.json();
    setSyncApplying(false);
    if (res.ok) {
      toast.success(
        t(
          `อัปเดตแล้ว ${data.updated} รายการ, เพิ่มขนาดใหม่ ${data.newVariants}, สินค้าใหม่ ${data.newProducts}`,
          `Updated ${data.updated}, new sizes ${data.newVariants}, new products ${data.newProducts}`,
          `已更新 ${data.updated} 项，新增规格 ${data.newVariants}，新增产品 ${data.newProducts}`
        )
      );
      setSyncOpen(false);
      setReloadTick((n) => n + 1);
    } else {
      toast.error(data.error || t("อัปเดตไม่สำเร็จ", "Update failed", "更新失败"));
    }
  }

  async function seedNow() {
    setSeeding(true);
    const res = await fetch("/api/admin/stock/seed", { method: "POST" });
    const data = await res.json();
    setSeeding(false);
    if (res.ok) {
      toast.success(t(`นำเข้า ${data.products} สินค้า / ${data.variants} ขนาดแล้ว`, `Imported ${data.products} products / ${data.variants} sizes`, `已导入 ${data.products} 个产品 / ${data.variants} 个规格`));
      setReloadTick((n) => n + 1);
    } else {
      toast.error(data.error || t("นำเข้าไม่สำเร็จ", "Import failed", "导入失败"));
    }
  }

  const catLabel = (key: string) => {
    const c = CATEGORIES.find((c) => c.key === key);
    return c ? t(c.th, c.en, c.zh) : key;
  };

  const catCounts = useMemo(() => {
    const m = new Map<string, number>();
    products.forEach((p) => {
      const k = isCustom(p) ? CUSTOM : p.category;
      m.set(k, (m.get(k) || 0) + 1);
    });
    return m;
  }, [products]);

  const STATUS_LABEL: Record<StatusKey, string> = {
    ok: t("พร้อมขาย", "In stock", "有货"),
    low: t("ใกล้หมด", "Low stock", "库存偏低"),
    out: t("หมด", "Out of stock", "缺货"),
    untracked: t("ยังไม่ตั้งค่า", "Not set", "未设置"),
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out: { p: DbProduct; vs: DbVariant[] }[] = [];
    for (const p of products) {
      if (cat === CUSTOM ? !isCustom(p) : cat !== "all" && (p.category !== cat || isCustom(p))) continue;
      const all = archivedView ? p.stock_variants.slice().sort((a, b) => a.sort_order - b.sort_order) : activeVariants(p);
      if (q) {
        const c = CATEGORIES.find((c) => c.key === p.category);
        const hit =
          p.code.toLowerCase().includes(q) ||
          `${c?.th ?? ""} ${c?.en ?? ""} ${c?.zh ?? ""}`.toLowerCase().includes(q) ||
          all.some((v) => v.code.toLowerCase().includes(q) || v.size_text.toLowerCase().includes(q));
        if (!hit) continue;
      }
      const vs = all.filter((v) => statusFilter === "all" || statusOf(v) === statusFilter);
      if (vs.length || (statusFilter === "all" && all.length === 0)) out.push({ p, vs });
    }
    return out;
  }, [products, query, cat, statusFilter, archivedView]);

  // Best sellers (units sold in 2025-2026, from the old sales sheets) with what's left in stock.
  const bestSellers = useMemo(() => {
    const byCode = new Map<string, { available: number; sizes: number }>();
    products.forEach((p) =>
      activeVariants(p).forEach((v) => {
        for (const c of new Set([canonCode(v.code), canonCode(p.code)])) {
          const cur = byCode.get(c) ?? { available: 0, sizes: 0 };
          cur.available += v.tracked ? v.available : 0;
          cur.sizes += 1;
          byCode.set(c, cur);
        }
      })
    );
    return TOP_SELLERS.slice(0, 10).map((s) => ({ ...s, stock: byCode.get(canonCode(s.code)) ?? null }));
  }, [products]);

  const totals = useMemo(() => {
    let available = 0, reserved = 0, defective = 0, low = 0, out = 0, tracked = 0, sizes = 0;
    products.forEach((p) =>
      activeVariants(p).forEach((v) => {
        sizes++;
        if (!v.tracked) return;
        tracked++;
        available += v.available;
        reserved += v.reserved;
        defective += v.defective;
        const st = statusOf(v);
        if (st === "low") low++;
        if (st === "out") out++;
      })
    );
    return { available, reserved, defective, low, out, tracked, sizes };
  }, [products]);

  function exportExcel() {
    import("xlsx").then((XLSX) => {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          products.map((p) => ({
            Code: p.code,
            "Category (TH)": CATEGORIES.find((c) => c.key === p.category)?.th ?? p.category,
            "Category (EN)": CATEGORIES.find((c) => c.key === p.category)?.en ?? "",
            "Category (ZH)": CATEGORIES.find((c) => c.key === p.category)?.zh ?? "",
            Sizes: activeVariants(p).length,
            Description: p.description,
            Color: p.color,
            Material: p.material,
            "Boxes per item": p.boxes_per_item,
          }))
        ),
        "Products"
      );
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          products.flatMap((p) =>
            activeVariants(p).map((v) => ({
              Model: p.code,
              Code: v.code,
              Size: sizeLabel(v),
              Price: v.price ?? "",
              Note: v.note,
              Available: v.available,
              Reserved: v.reserved,
              Defective: v.defective,
              "Reorder point": v.reorder_point,
              Location: v.location,
              ETA: v.eta ?? "",
              "Batch / Lot": v.batch_no,
              "Stock note": v.stock_note,
              ...(showCost ? { "Landed cost": v.landed_cost ?? "" } : {}),
            }))
          )
        ),
        "Sizes & Stock"
      );
      XLSX.writeFile(wb, `futai-stock-${new Date().toISOString().slice(0, 10)}.xlsx`);
    });
  }

  const showCodePerRow = (p: DbProduct) => new Set(activeVariants(p).map((v) => v.code)).size > 1;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">
            {archivedView ? t("สต็อก — ที่เก็บถาวร", "Stock — Archived", "库存 — 已归档") : t("สต็อกสินค้า", "Stock", "库存")}
          </h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">
            {t(
              "ข้อมูลอยู่ในฐานข้อมูลกลาง ทุกคนเห็นตรงกัน — นับสต็อกแยกตามขนาด และเก็บประวัติการแก้ไข",
              "Shared database — everyone sees the same numbers; stock is tracked per size with an edit history",
              "共享数据库——所有人看到的数据一致；按尺寸统计库存并保留修改记录"
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!archivedView && (
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus size={14} className="mr-1.5" /> {t("เพิ่มสินค้า", "Add product", "添加产品")}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setShowCost((v) => !v)}>
            {showCost ? <EyeOff size={14} className="mr-1.5" /> : <Eye size={14} className="mr-1.5" />}
            {showCost ? t("ซ่อนต้นทุน", "Hide cost", "隐藏成本") : t("โหมดเจ้าของ (ดูต้นทุน)", "Owner mode (show cost)", "老板模式（显示成本）")}
          </Button>
          {!archivedView && products.length > 0 && (
            <Button size="sm" variant="outline" onClick={openSync}>
              <RefreshCw size={14} className="mr-1.5" /> {t("อัปเดตจากไฟล์ล่าสุด", "Update from latest file", "从最新文件更新")}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={exportExcel} disabled={!products.length}>
            <Download size={14} className="mr-1.5" /> {t("Export Excel", "Export Excel", "导出Excel")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setArchivedView((v) => !v); setCat("all"); setLimit(PAGE); }}>
            {archivedView ? (
              <><ArchiveRestore size={14} className="mr-1.5" /> {t("กลับไปรายการปกติ", "Back to active", "返回正常列表")}</>
            ) : (
              <><Archive size={14} className="mr-1.5" /> {t("ที่เก็บถาวร", "Archived", "已归档")}</>
            )}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm py-16 text-center text-sm text-[#6B6B6B]">
          <Loader2 size={20} className="mx-auto mb-2 animate-spin" />
          {t("กำลังโหลด...", "Loading...", "加载中...")}
        </div>
      ) : loadError ? (
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-2">
          <p className="text-sm font-semibold text-red-600 flex items-center gap-2">
            <TriangleAlert size={16} /> {t("โหลดข้อมูลสต็อกไม่สำเร็จ", "Could not load stock data", "无法加载库存数据")}
          </p>
          <p className="text-xs font-mono text-[#6B6B6B]">{loadError}</p>
          <p className="text-xs text-[#6B6B6B]">
            {t(
              "ถ้ายังไม่เคยสร้างตาราง ให้รันไฟล์ scripts/create-stock-tables-2026-09.sql ใน Supabase SQL Editor ก่อน (ถ้ารันแล้วให้ลอง Settings → API → Reload schema)",
              "If the tables don't exist yet, run scripts/create-stock-tables-2026-09.sql in the Supabase SQL editor first (already did? try Settings → API → Reload schema)",
              "如果尚未建表，请先在 Supabase SQL Editor 运行 scripts/create-stock-tables-2026-09.sql（已运行请尝试 Settings → API → Reload schema）"
            )}
          </p>
          <Button size="sm" variant="outline" onClick={() => setReloadTick((n) => n + 1)}>
            {t("ลองโหลดใหม่", "Retry", "重试")}
          </Button>
        </div>
      ) : products.length === 0 && !archivedView ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center space-y-3">
          <Database size={30} className="mx-auto text-[#9CA3AF]" />
          <p className="text-sm font-semibold text-[#1A1A1A]">{t("ฐานข้อมูลสต็อกยังว่างอยู่", "The stock database is empty", "库存数据库为空")}</p>
          <p className="text-xs text-[#6B6B6B]">
            {t(
              "นำเข้าข้อมูลเริ่มต้นจากไฟล์รหัสสินค้า + ตารางสต็อกเดิม (ทำได้ครั้งเดียว)",
              "Load the starting data from the product-code file + the original stock sheet (one time only)",
              "从产品编号文件 + 原库存表导入初始数据（仅限一次）"
            )}
          </p>
          <Button onClick={seedNow} disabled={seeding}>
            {seeding ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Database size={14} className="mr-1.5" />}
            {t("นำเข้าข้อมูลเริ่มต้น", "Import starting data", "导入初始数据")}
          </Button>
        </div>
      ) : (
        <>
          {!archivedView && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: t("สินค้า (รุ่น)", "Products", "产品数"), value: fmt(products.length), sub: `${fmt(totals.sizes)} ${t("ขนาด", "sizes", "规格")}` },
                { label: t("พร้อมขาย", "Available", "可售"), value: fmt(totals.available), sub: t("ชิ้น (ทุกขนาดรวมกัน)", "pcs (all sizes)", "件（所有尺寸）") },
                { label: t("จอง/รอส่ง", "Reserved", "已预订/待发"), value: fmt(totals.reserved), sub: t("ชิ้น", "pcs", "件") },
                { label: t("มีตำหนิ/รอเคลม", "Defective", "瑕疵/待索赔"), value: fmt(totals.defective), sub: t("ชิ้น", "pcs", "件") },
                { label: t("ขนาดที่ใกล้หมด", "Sizes low", "库存偏低规格"), value: fmt(totals.low), sub: t("ถึงจุดสั่งซื้อ", "at reorder point", "已到补货点") },
                { label: t("ขนาดที่หมดสต็อก", "Sizes out", "缺货规格"), value: fmt(totals.out), sub: `${fmt(totals.tracked)} ${t("ขนาดที่ตั้งค่าแล้ว", "sizes tracked", "已设置规格")}` },
              ].map((c) => (
                <div key={c.label} className="bg-white rounded-xl shadow-sm p-4">
                  <p className="text-xs text-[#6B6B6B]">{c.label}</p>
                  <p className="text-2xl font-bold text-[#1A1A1A] mt-1">{c.value}</p>
                  <p className="text-[10px] text-[#9CA3AF] mt-1">{c.sub}</p>
                </div>
              ))}
            </div>
          )}

          {!archivedView && (
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-baseline justify-between flex-wrap gap-1 mb-2">
                <p className="text-sm font-semibold text-[#1A1A1A]">{t("สินค้าขายดี Top 10", "Best sellers — Top 10", "热销产品 Top 10")}</p>
                <p className="text-[10px] text-[#9CA3AF]">
                  {t("นับจากจำนวนที่ขายในไฟล์ยอดขายเดิม ปี 2025–2026 (ไม่รวมของแถม) · กดเพื่อค้นหาในสต็อก", "Units sold in the original 2025–2026 sales sheets (free items excluded) · click to find it in stock", "统计原销售表2025–2026年销量（不含赠品）· 点击可在库存中查找")}
                </p>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {bestSellers.map((b, i) => {
                  const tone =
                    !b.stock ? "border-[#E8E5E0] bg-[#FAF7F2]" : b.stock.available <= 0 ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50";
                  return (
                    <button
                      key={b.code}
                      type="button"
                      onClick={() => { setQuery(b.code); setCat("all"); setStatusFilter("all"); setLimit(PAGE); }}
                      className={`shrink-0 text-left rounded-lg border px-3 py-2 min-w-[150px] hover:shadow-sm transition-shadow ${tone}`}
                    >
                      <p className="text-[10px] text-[#9CA3AF]">#{i + 1}</p>
                      <p className="text-xs font-mono font-semibold text-[#1A1A1A]">{b.code}</p>
                      <p className="text-[11px] text-[#6B6B6B]">
                        {t("ขายแล้ว", "Sold", "已售")} <span className="font-semibold text-[#1A1A1A]">{fmt(b.qty)}</span> {t("ชิ้น", "pcs", "件")}
                      </p>
                      <p className="text-[11px]">
                        {b.stock ? (
                          <span className={b.stock.available <= 0 ? "text-red-600 font-semibold" : "text-green-700 font-semibold"}>
                            {t("คงเหลือ", "In stock", "库存")} {fmt(b.stock.available)}
                          </span>
                        ) : (
                          <span className="text-[#9CA3AF]">{t("ไม่อยู่ในรายการสต็อก", "not in stock list", "不在库存列表")}</span>
                        )}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <Input
                  className="pl-9"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setLimit(PAGE); }}
                  placeholder={t("ค้นหารหัสสินค้า / หมวดหมู่ / ขนาด...", "Search code / category / size...", "搜索编号 / 分类 / 尺寸...")}
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter((v ?? "all") as StatusFilter); setLimit(PAGE); }}>
                <SelectTrigger className="w-44">
                  <SelectValue>
                    {(v: StatusFilter) => (v === "all" ? t("ทุกสถานะ", "All statuses", "全部状态") : STATUS_LABEL[v])}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("ทุกสถานะ", "All statuses", "全部状态")}</SelectItem>
                  {(["ok", "low", "out", "untracked"] as StatusKey[]).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => { setCat("all"); setLimit(PAGE); }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${cat === "all" ? "bg-[#1A1A1A] text-white" : "bg-[#F0EDE6] text-[#6B6B6B] hover:bg-[#E8E5E0]"}`}
              >
                {t("ทั้งหมด", "All", "全部")} ({products.length})
              </button>
              <button
                type="button"
                onClick={() => { setCat(CUSTOM); setLimit(PAGE); }}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${cat === CUSTOM ? "bg-amber-600 text-white" : "bg-amber-100 text-amber-800 hover:bg-amber-200"}`}
              >
                {t("สั่งทำ / Custom / 定制", "Custom order / 定制", "定制 / Custom")} ({catCounts.get(CUSTOM) ?? 0})
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => { setCat(c.key); setLimit(PAGE); }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${cat === c.key ? "bg-[#C8102E] text-white" : "bg-[#F0EDE6] text-[#6B6B6B] hover:bg-[#E8E5E0]"}`}
                >
                  {t(c.th, c.en, c.zh)} ({catCounts.get(c.key) ?? 0})
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#FAF7F2]">
                  <TableHead className="text-xs w-32">{t("รูป", "Photo", "图片")}</TableHead>
                  <TableHead className="text-xs">{t("รหัสสินค้า", "Code", "编号")}</TableHead>
                  <TableHead className="text-xs">{t("ขนาด (มม.) / ราคา ฿", "Size (mm) / Price ฿", "尺寸(mm) / 价格 ฿")}</TableHead>
                  <TableHead className="text-xs w-24">{t("พร้อมขาย", "Available", "可售")}</TableHead>
                  <TableHead className="text-xs w-24">{t("จอง/รอส่ง", "Reserved", "已预订")}</TableHead>
                  <TableHead className="text-xs w-24">{t("ตำหนิ/เคลม", "Defective", "瑕疵")}</TableHead>
                  <TableHead className="text-xs w-24">{t("จุดสั่งซื้อ", "Reorder pt.", "补货点")}</TableHead>
                  <TableHead className="text-xs w-32">{t("ตำแหน่งเก็บ", "Location", "库位")}</TableHead>
                  <TableHead className="text-xs">{t("สถานะ", "Status", "状态")}</TableHead>
                  <TableHead className="text-xs" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-[#6B6B6B]">
                      <PackageSearch size={28} className="mx-auto mb-2 opacity-40" />
                      {t("ไม่พบสินค้าที่ตรงกับตัวกรอง", "No products match your filters", "没有符合筛选条件的产品")}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.slice(0, limit).map(({ p, vs }) => {
                    const span = Math.max(vs.length, 1);
                    return (
                      <Fragment key={p.id}>
                        {(vs.length ? vs : [null]).map((v, n) => {
                          const first = n === 0;
                          const st = v ? statusOf(v) : "untracked";
                          return (
                            <TableRow key={v?.id ?? "empty"} className={`hover:bg-[#FAF7F2]/50 ${first ? "border-t-2 border-t-[#E8E5E0]" : ""}`}>
                              {first && (
                                <>
                                  <TableCell rowSpan={span} className="align-top">
                                    <button
                                      type="button"
                                      onClick={() => openDetail(p)}
                                      className="relative block w-28 h-28 rounded-lg bg-white overflow-hidden border border-[#E8E5E0] hover:border-[#C8102E] transition-colors"
                                      aria-label={p.code}
                                    >
                                      {p.image_url && <Image src={p.image_url} alt={p.code} fill sizes="112px" unoptimized className="object-contain" />}
                                    </button>
                                  </TableCell>
                                  <TableCell rowSpan={span} className="align-top">
                                    <p className="text-sm font-mono font-medium">{p.code}</p>
                                    <p className="text-[10px] text-[#9CA3AF]">{catLabel(p.category)}</p>
                                    {p.from_stock && (
                                      <p className="text-[10px] text-amber-700">{t("มีเฉพาะในตารางสต็อกเดิม (ยังไม่มีในไฟล์รหัสสินค้า)", "only in the old stock sheet (not in the product-code file)", "仅在旧库存表中（编号文件中没有）")}</p>
                                    )}
                                    {showCodePerRow(p) && (
                                      <p className="text-[10px] text-[#9CA3AF] italic">
                                        {t(`รุ่นเดียวกัน ${activeVariants(p).length} ขนาด/รหัส`, `same model · ${activeVariants(p).length} sizes/codes`, `同款 · ${activeVariants(p).length} 个规格/编号`)}
                                      </p>
                                    )}
                                  </TableCell>
                                </>
                              )}
                              {v ? (
                                <>
                                  <TableCell className="text-xs text-[#6B6B6B]">
                                    {showCodePerRow(p) && <p className="text-sm font-mono font-semibold text-[#1A1A1A]">{v.code}</p>}
                                    <p className="font-mono">
                                      {sizeLabel(v)}
                                      {v.flag && (
                                        <span title={v.flag} className="ml-1.5 inline-flex align-middle text-amber-600">
                                          <TriangleAlert size={12} />
                                        </span>
                                      )}
                                    </p>
                                    {v.available < 0 && (
                                      <p className="text-amber-700">{t(`ล็อกเกินของในโกดัง ${fmt(-v.available)} ชิ้น`, `over-locked by ${fmt(-v.available)}`, `锁单超出库存 ${fmt(-v.available)}`)}</p>
                                    )}
                                    {v.stock_note && <p className="text-[10px] text-[#9CA3AF] max-w-[16rem] break-words">🔒 {v.stock_note}</p>}
                                    <p className="font-semibold text-[#1A1A1A]">
                                      {v.price != null ? fmt(v.price) : <span className="font-normal text-[#9CA3AF]">{t("ยังไม่มีราคา", "No price yet", "暂无价格")}</span>}
                                      {v.note && <span className="ml-1.5 font-normal text-[#9CA3AF]">· {v.note}</span>}
                                    </p>
                                  </TableCell>
                                  {(["available", "reserved", "defective", "reorder_point"] as const).map((f) => (
                                    <TableCell key={f}>
                                      <Input
                                        type="number"
                                        step="any"
                                        disabled={archivedView}
                                        className="h-8 w-20 text-xs"
                                        value={v[f] || ""}
                                        placeholder="0"
                                        onChange={(e) => editVariant(p.id, v.id, { [f]: num(e.target.value) })}
                                      />
                                    </TableCell>
                                  ))}
                                  <TableCell>
                                    <Input
                                      className="h-8 w-28 text-xs"
                                      disabled={archivedView}
                                      value={v.location}
                                      placeholder={t("เช่น โกดัง1-A2", "e.g. WH1-A2", "如 仓1-A2")}
                                      onChange={(e) => editVariant(p.id, v.id, { location: e.target.value })}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <span className={`text-[11px] font-medium px-2 py-1 rounded whitespace-nowrap ${STATUS_STYLE[st]}`}>
                                      {STATUS_LABEL[st]}
                                    </span>
                                  </TableCell>
                                </>
                              ) : (
                                <TableCell colSpan={7} className="text-xs text-[#9CA3AF]">{t("ยังไม่มีขนาด — กด \"รายละเอียด\" เพื่อเพิ่ม", "No sizes yet — open Details to add one", "暂无规格 — 打开详情添加")}</TableCell>
                              )}
                              {first && (
                                <TableCell rowSpan={span} className="align-top">
                                  {archivedView ? (
                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setProductArchived(p.id, false)}>
                                      <ArchiveRestore size={12} className="mr-1" /> {t("กู้คืน", "Restore", "恢复")}
                                    </Button>
                                  ) : (
                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openDetail(p)}>
                                      {t("รายละเอียด / แก้ไข", "Details / Edit", "详情 / 编辑")}
                                    </Button>
                                  )}
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
            {rows.length > limit && (
              <div className="p-3 text-center border-t border-[#E8E5E0]">
                <Button size="sm" variant="outline" onClick={() => setLimit((l) => l + PAGE)}>
                  {t("แสดงเพิ่ม", "Show more", "显示更多")} ({rows.length - limit})
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── details / edit ── */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-w-6xl sm:max-w-6xl max-h-[92vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              <span className="font-mono">{detail?.code}</span>
              <span className="ml-2 text-sm font-normal text-[#6B6B6B]">{detail && catLabel(detail.category)}</span>
            </DialogTitle>
          </DialogHeader>

          {detail && (
            <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-1">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="w-full sm:w-72 shrink-0 space-y-2">
                  <div className="relative w-full aspect-square rounded-lg bg-white overflow-hidden border border-[#E8E5E0]">
                    {draft.image_url ? (
                      <Image src={draft.image_url} alt={draft.code} fill sizes="288px" unoptimized className="object-contain" />
                    ) : (
                      <p className="absolute inset-0 flex items-center justify-center text-xs text-[#9CA3AF]">{t("ยังไม่มีรูป", "No photo yet", "暂无图片")}</p>
                    )}
                    {uploading && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <Loader2 className="animate-spin text-[#C8102E]" />
                      </div>
                    )}
                  </div>
                  <label className="flex items-center justify-center gap-1.5 text-xs font-medium border rounded-md px-3 py-1.5 cursor-pointer bg-white hover:bg-[#F0EDE6]">
                    <Upload size={13} /> {draft.image_url ? t("เปลี่ยนรูป", "Change photo", "更换图片") : t("อัปโหลดรูป", "Upload photo", "上传图片")}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadFor((url) => setDraft((d) => ({ ...d, image_url: url })), f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-3 content-start">
                  <div>
                    <Label className="text-xs">{t("รหัสสินค้า", "Product code", "产品编号")}</Label>
                    <Input className="mt-1 font-mono" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">{t("หมวดหมู่", "Category", "分类")}</Label>
                    <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v ?? draft.category })}>
                      <SelectTrigger className="mt-1 w-full">
                        <SelectValue>{(v: string) => catLabel(v)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.key} value={c.key}>{t(c.th, c.en, c.zh)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">{t("ชื่อ / รายละเอียด / จุดเด่น", "Name / description / highlights", "名称 / 描述 / 卖点")}</Label>
                    <Textarea className="mt-1" rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">{t("สี", "Color", "颜色")}</Label>
                    <Input className="mt-1" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">{t("วัสดุ", "Material", "材质")}</Label>
                    <Input className="mt-1" value={draft.material} onChange={(e) => setDraft({ ...draft, material: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">{t("จำนวนกล่องต่อ 1 ชิ้น", "Boxes per item", "每件箱数")}</Label>
                    <Input type="number" min={1} className="mt-1" value={draft.boxes_per_item} onChange={(e) => setDraft({ ...draft, boxes_per_item: Math.max(1, Number(e.target.value) || 1) })} />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button onClick={saveProduct} disabled={savingProduct}>
                      {savingProduct ? t("กำลังบันทึก...", "Saving...", "保存中...") : t("บันทึกข้อมูลสินค้า", "Save product info", "保存产品信息")}
                    </Button>
                    <Button variant="outline" onClick={() => setProductArchived(detail.id, true)}>
                      <Archive size={14} className="mr-1.5" /> {t("เก็บเข้าคลัง", "Archive", "归档")}
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-[#1A1A1A]">{t("ขนาด / ราคา / สต็อก (บันทึกอัตโนมัติ)", "Sizes / price / stock (auto-saved)", "规格 / 价格 / 库存（自动保存）")}</p>
                  <Button size="sm" variant="outline" onClick={() => addVariant(detail.id)}>
                    <Plus size={13} className="mr-1" /> {t("เพิ่มขนาด", "Add size", "添加规格")}
                  </Button>
                </div>
                <div className="overflow-x-auto border border-[#E8E5E0] rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#FAF7F2]">
                        <TableHead className="text-xs">{t("รหัส", "Code", "编号")}</TableHead>
                        <TableHead className="text-xs">{t("ขนาด (มม.)", "Size (mm)", "尺寸")}</TableHead>
                        <TableHead className="text-xs">{t("ราคา ฿", "Price ฿", "价格")}</TableHead>
                        <TableHead className="text-xs">{t("หมายเหตุ", "Note", "备注")}</TableHead>
                        <TableHead className="text-xs">{t("พร้อมขาย", "Available", "可售")}</TableHead>
                        <TableHead className="text-xs">{t("จอง/รอส่ง", "Reserved", "已预订")}</TableHead>
                        <TableHead className="text-xs">{t("ตำหนิ/เคลม", "Defective", "瑕疵")}</TableHead>
                        <TableHead className="text-xs">{t("จุดสั่งซื้อ", "Reorder pt.", "补货点")}</TableHead>
                        <TableHead className="text-xs">{t("ตำแหน่ง", "Location", "库位")}</TableHead>
                        <TableHead className="text-xs">ETA</TableHead>
                        <TableHead className="text-xs">{t("ล็อต/ตู้", "Batch", "批次")}</TableHead>
                        <TableHead className="text-xs">{t("หมายเหตุสต็อก / ลูกค้าที่ล็อก", "Stock note / locked for", "库存备注/锁单客户")}</TableHead>
                        {showCost && <TableHead className="text-xs text-[#C8102E]">{t("ต้นทุน", "Landed cost", "到岸成本")}</TableHead>}
                        <TableHead className="text-xs" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeVariants(detail).map((v) => (
                        <TableRow key={v.id}>
                          <TableCell><Input className="h-8 w-28 text-xs font-mono" value={v.code} onChange={(e) => editVariant(detail.id, v.id, { code: e.target.value })} /></TableCell>
                          <TableCell>
                            <Input className="h-8 w-36 text-xs font-mono" value={v.is_round || v.width_mm == null ? v.size_text : `${v.width_mm}*${v.depth_mm ?? ""}${v.height_mm != null ? "*" + v.height_mm : ""}`} onChange={(e) => editSize(detail.id, v.id, e.target.value)} />
                            {v.flag && <p className="text-[10px] text-amber-700 max-w-[10rem] mt-0.5">{v.flag}</p>}
                          </TableCell>
                          <TableCell><Input type="number" min={0} className="h-8 w-24 text-xs" value={v.price ?? ""} onChange={(e) => editVariant(detail.id, v.id, { price: e.target.value === "" ? null : num(e.target.value) })} /></TableCell>
                          <TableCell><Input className="h-8 w-28 text-xs" value={v.note} onChange={(e) => editVariant(detail.id, v.id, { note: e.target.value })} /></TableCell>
                          {(["available", "reserved", "defective", "reorder_point"] as const).map((f) => (
                            <TableCell key={f}>
                              <Input type="number" step="any" className="h-8 w-20 text-xs" value={v[f] || ""} placeholder="0" onChange={(e) => editVariant(detail.id, v.id, { [f]: num(e.target.value) })} />
                            </TableCell>
                          ))}
                          <TableCell><Input className="h-8 w-28 text-xs" value={v.location} onChange={(e) => editVariant(detail.id, v.id, { location: e.target.value })} /></TableCell>
                          <TableCell><Input type="date" className="h-8 w-36 text-xs" value={v.eta ?? ""} onChange={(e) => editVariant(detail.id, v.id, { eta: e.target.value || null })} /></TableCell>
                          <TableCell><Input className="h-8 w-28 text-xs" value={v.batch_no} onChange={(e) => editVariant(detail.id, v.id, { batch_no: e.target.value })} /></TableCell>
                          <TableCell><Input className="h-8 w-56 text-xs" value={v.stock_note} onChange={(e) => editVariant(detail.id, v.id, { stock_note: e.target.value })} /></TableCell>
                          {showCost && (
                            <TableCell>
                              <Input type="number" min={0} className="h-8 w-24 text-xs" value={v.landed_cost ?? ""} onChange={(e) => editVariant(detail.id, v.id, { landed_cost: e.target.value === "" ? null : num(e.target.value) })} />
                            </TableCell>
                          )}
                          <TableCell>
                            <Button size="icon-sm" variant="ghost" onClick={() => archiveVariant(detail.id, v.id)} aria-label={t("เก็บเข้าคลัง", "Archive", "归档")}>
                              <Trash2 size={13} className="text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {activeVariants(detail).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={14} className="text-center text-xs text-[#9CA3AF] py-6">{t("ยังไม่มีขนาด กด \"เพิ่มขนาด\"", "No sizes yet — click Add size", "暂无规格，点击添加规格")}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-[#1A1A1A] mb-2 flex items-center gap-1.5">
                  <History size={14} /> {t("ประวัติการแก้ไขสต็อก", "Stock edit history", "库存修改记录")}
                </p>
                {movements.length === 0 ? (
                  <p className="text-xs text-[#9CA3AF]">{t("ยังไม่มีประวัติ", "No history yet", "暂无记录")}</p>
                ) : (
                  <div className="max-h-44 overflow-y-auto border border-[#E8E5E0] rounded-lg divide-y divide-[#F0EDE6]">
                    {movements.map((m) => {
                      const v = detail.stock_variants.find((x) => x.id === m.variant_id);
                      const fieldLabel: Record<string, string> = {
                        available: t("พร้อมขาย", "Available", "可售"),
                        reserved: t("จอง/รอส่ง", "Reserved", "已预订"),
                        defective: t("ตำหนิ/เคลม", "Defective", "瑕疵"),
                      };
                      return (
                        <div key={m.id} className="flex items-center gap-3 px-3 py-1.5 text-xs">
                          <span className="text-[#9CA3AF] w-36 shrink-0">{new Date(m.created_at).toLocaleString("th-TH")}</span>
                          <span className="font-mono text-[#6B6B6B] w-40 truncate">{v ? `${v.code} ${sizeLabel(v)}` : "-"}</span>
                          <span className="text-[#1A1A1A]">{fieldLabel[m.field] ?? m.field}</span>
                          <span className="font-semibold">{fmt(m.old_value ?? 0)} → {fmt(m.new_value ?? 0)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailId(null)}>{t("ปิด", "Close", "关闭")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── update from the latest stock workbook ── */}
      <Dialog open={syncOpen} onOpenChange={setSyncOpen}>
        <DialogContent className="max-w-3xl sm:max-w-3xl max-h-[92vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {t("อัปเดตสต็อกจากไฟล์ล่าสุด", "Update stock from the latest file", "从最新文件更新库存")}
              {syncPlan && <span className="ml-2 text-sm font-normal text-[#6B6B6B]">{syncPlan.label}</span>}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-3 py-1">
            {syncLoading && (
              <p className="text-sm text-[#6B6B6B] py-8 text-center">
                <Loader2 className="inline animate-spin mr-2" size={16} /> {t("กำลังเทียบกับข้อมูลปัจจุบัน...", "Comparing with the current data...", "正在与当前数据对比...")}
              </p>
            )}
            {syncError && <p className="text-sm text-red-600">{syncError}</p>}
            {syncPlan && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  {[
                    { label: t("แถวในไฟล์", "Rows in file", "文件行数"), value: syncPlan.plan.rows, tone: "" },
                    { label: t("ตัวเลขเปลี่ยน", "Will change", "将更新"), value: syncPlan.plan.updates.length, tone: "text-[#C8102E]" },
                    { label: t("เหมือนเดิม", "Unchanged", "无变化"), value: syncPlan.plan.unchanged, tone: "" },
                    { label: t("รายการใหม่", "New items", "新增"), value: syncPlan.plan.newVariants.length + syncPlan.plan.newProducts.length, tone: "" },
                  ].map((c) => (
                    <div key={c.label} className="bg-[#FAF7F2] rounded-lg py-2">
                      <p className="text-[10px] text-[#6B6B6B]">{c.label}</p>
                      <p className={`text-xl font-bold ${c.tone || "text-[#1A1A1A]"}`}>{c.value}</p>
                    </div>
                  ))}
                </div>

                {syncPlan.plan.updates.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-[#1A1A1A] mb-1">{t("รายการที่จะเปลี่ยน", "Changes", "变更明细")}</p>
                    <div className="border border-[#E8E5E0] rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-[#FAF7F2]">
                            <TableHead className="text-xs">{t("รหัส / ขนาด", "Code / size", "编号 / 尺寸")}</TableHead>
                            <TableHead className="text-xs text-right">{t("พร้อมขาย", "Available", "可售")}</TableHead>
                            <TableHead className="text-xs text-right">{t("จอง/รอส่ง", "Reserved", "已预订")}</TableHead>
                            <TableHead className="text-xs">{t("หมายเหตุ", "Note", "备注")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {syncPlan.plan.updates.map((u) => (
                            <TableRow key={u.variantId}>
                              <TableCell className="text-xs">
                                <p className="font-mono font-semibold">{u.code}</p>
                                <p className="text-[#9CA3AF] font-mono">{u.size || "-"}</p>
                              </TableCell>
                              <TableCell className="text-xs text-right whitespace-nowrap">
                                {u.before.available === u.after.available ? fmt(u.after.available) : (
                                  <><span className="text-[#9CA3AF]">{fmt(u.before.available)}</span> → <span className="font-semibold">{fmt(u.after.available)}</span></>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-right whitespace-nowrap">
                                {u.before.reserved === u.after.reserved ? fmt(u.after.reserved) : (
                                  <><span className="text-[#9CA3AF]">{fmt(u.before.reserved)}</span> → <span className="font-semibold">{fmt(u.after.reserved)}</span></>
                                )}
                              </TableCell>
                              <TableCell className="text-[11px] text-[#6B6B6B] max-w-[16rem] break-words">
                                {u.before.note !== u.after.note ? u.after.note || t("(ลบหมายเหตุ)", "(note removed)", "（备注已清除）") : ""}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {(syncPlan.plan.newVariants.length > 0 || syncPlan.plan.newProducts.length > 0) && (
                  <div>
                    <p className="text-xs font-semibold text-[#1A1A1A] mb-1">{t("จะเพิ่มใหม่", "Will be added", "将新增")}</p>
                    <ul className="text-xs text-[#6B6B6B] space-y-0.5">
                      {syncPlan.plan.newVariants.map((v, i) => (
                        <li key={`v${i}`}>+ {v.productCode} — {v.size || "-"} ({t("ขนาดใหม่", "new size", "新规格")})</li>
                      ))}
                      {syncPlan.plan.newProducts.map((p) => (
                        <li key={p.code + p.category}>+ {p.code} — {catLabel(p.category)} ({p.variants.length})</li>
                      ))}
                    </ul>
                  </div>
                )}

                {syncPlan.plan.overLocked.length > 0 && (
                  <p className="text-xs text-amber-700 flex items-start gap-1">
                    <TriangleAlert size={13} className="mt-0.5 shrink-0" />
                    {t("ล็อกเกินของในโกดัง:", "Locked more than in stock:", "锁单超出库存：")} {syncPlan.plan.overLocked.join(", ")}
                  </p>
                )}
                <p className="text-[11px] text-[#9CA3AF]">
                  {t(
                    "ไฟล์เป็นตัวตั้ง: ตัวเลขพร้อมขาย/จอง/หมายเหตุในระบบจะถูกแทนที่ด้วยค่าจากไฟล์ (ตำแหน่ง ETA ล็อต ต้นทุนไม่ถูกแตะ) และการเปลี่ยนตัวเลขทุกรายการจะถูกบันทึกในประวัติ",
                    "The file wins: available / reserved / notes in the system are replaced by the values in the file (location, ETA, batch and cost are untouched), and every number change is logged in the history",
                    "以文件为准：系统中的可售/预订/备注将被文件数值替换（库位、ETA、批次、成本不变），每项数字变化都会记录在历史中"
                  )}
                </p>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSyncOpen(false)}>{t("ยกเลิก", "Cancel", "取消")}</Button>
            <Button
              onClick={applySync}
              disabled={
                syncApplying || !syncPlan || (syncPlan.plan.updates.length + syncPlan.plan.newVariants.length + syncPlan.plan.newProducts.length === 0)
              }
            >
              {syncApplying ? t("กำลังอัปเดต...", "Updating...", "更新中...") : t("ยืนยันอัปเดต", "Apply update", "确认更新")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── add product ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[92vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t("เพิ่มสินค้าใหม่", "Add new product", "添加新产品")}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{t("รหัสสินค้า", "Product code", "产品编号")}</Label>
                <Input className="mt-1 font-mono" value={newProd.code} onChange={(e) => setNewProd({ ...newProd, code: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">{t("หมวดหมู่", "Category", "分类")}</Label>
                <Select value={newProd.category} onValueChange={(v) => setNewProd({ ...newProd, category: v ?? newProd.category })}>
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue>{(v: string) => catLabel(v)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.key} value={c.key}>{t(c.th, c.en, c.zh)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-xs">{t("ชื่อ / รายละเอียด", "Name / description", "名称 / 描述")}</Label>
                <Textarea className="mt-1" rows={2} value={newProd.description} onChange={(e) => setNewProd({ ...newProd, description: e.target.value })} />
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <div className="relative w-20 h-20 rounded-lg bg-white overflow-hidden border border-[#E8E5E0] shrink-0">
                  {newProd.image_url && <Image src={newProd.image_url} alt="" fill sizes="80px" unoptimized className="object-contain" />}
                  {uploading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                      <Loader2 size={16} className="animate-spin text-[#C8102E]" />
                    </div>
                  )}
                </div>
                <label className="flex items-center gap-1.5 text-xs font-medium border rounded-md px-3 py-1.5 cursor-pointer bg-white hover:bg-[#F0EDE6]">
                  <Upload size={13} /> {t("อัปโหลดรูป", "Upload photo", "上传图片")}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadFor((url) => setNewProd((d) => ({ ...d, image_url: url })), f);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-[#1A1A1A] mb-1.5">{t("ขนาด / ราคา (ไม่ใส่ราคา = สั่งทำ)", "Sizes / prices (no price = custom order)", "规格 / 价格（无价格 = 定制）")}</p>
              <div className="space-y-2">
                {newSizes.map((s, i) => (
                  <div key={i} className="flex gap-2">
                    <Input className="h-8 text-xs font-mono flex-1" placeholder={t("ขนาด เช่น 1800*600*750", "Size e.g. 1800*600*750", "尺寸 如 1800*600*750")} value={s.size_text} onChange={(e) => setNewSizes((l) => l.map((x, j) => (j === i ? { ...x, size_text: e.target.value } : x)))} />
                    <Input type="number" min={0} className="h-8 text-xs w-28" placeholder={t("ราคา ฿", "Price ฿", "价格")} value={s.price} onChange={(e) => setNewSizes((l) => l.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} />
                    <Input className="h-8 text-xs w-36" placeholder={t("หมายเหตุ", "Note", "备注")} value={s.note} onChange={(e) => setNewSizes((l) => l.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))} />
                    <Button size="icon-sm" variant="ghost" disabled={newSizes.length === 1} onClick={() => setNewSizes((l) => l.filter((_, j) => j !== i))}>
                      <Trash2 size={13} className="text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => setNewSizes((l) => [...l, { size_text: "", price: "", note: "" }])}>
                <Plus size={13} className="mr-1" /> {t("เพิ่มขนาด", "Add size", "添加规格")}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>{t("ยกเลิก", "Cancel", "取消")}</Button>
            <Button onClick={createProduct} disabled={creating}>
              {creating ? t("กำลังบันทึก...", "Saving...", "保存中...") : t("เพิ่มสินค้า", "Add product", "添加产品")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
