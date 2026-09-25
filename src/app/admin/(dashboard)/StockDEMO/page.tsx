"use client";
import { Fragment, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Search, Download, Eye, EyeOff, RotateCcw, PackageSearch, TriangleAlert } from "lucide-react";
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

interface Variant {
  size: string;
  dims: { w: number; d: number | null; h: number | null } | null;
  price: number | null;
  note: string;
  label?: string;
  round?: boolean;
  flag?: string;
  key?: string;
  code?: string;
  fromStock?: boolean;
}
interface Prod {
  no: number;
  code: string;
  category: string;
  image?: string;
  mergedCodes?: string[];
  fromStock?: boolean;
  variants: Variant[];
}
interface Cat {
  key: string;
  zh: string;
  en: string;
  th: string;
}
// Every size of a product has its own stock, location, ETA, batch and cost.
interface VarStock {
  available: number;
  reserved: number;
  defective: number;
  reorderPoint: number;
  location: string;
  eta: string;
  batch: string;
  landedCost: number | null;
  note: string;
}
// Descriptive info shared by all sizes of one product.
interface ProdInfo {
  description: string;
  color: string;
  material: string;
  boxesPerItem: number;
}

const PRODUCTS = raw.products as Prod[];
const CATEGORIES = raw.categories as Cat[];
const STORAGE_KEY = "futai-stock-demo-v2";
const PAGE = 40;

const emptyVar: VarStock = {
  available: 0, reserved: 0, defective: 0, reorderPoint: 0, location: "", eta: "", batch: "", landedCost: null, note: "",
};

// Real numbers from the original stock workbook (库存表格): sellable = warehouse − locked.
const SEED = ((raw as unknown as { stockSeed?: Record<string, { available: number; reserved: number; note: string }> }).stockSeed ?? {});
const SEED_STOCK: Record<string, VarStock> = Object.fromEntries(
  Object.entries(SEED).map(([k, v]) => [k, { ...emptyVar, available: v.available, reserved: v.reserved, note: v.note }])
);
const emptyProd: ProdInfo = { description: "", color: "", material: "", boxesPerItem: 1 };

// Models with no price on any size are made-to-order / custom — they get their
// own group instead of sitting in their product category (showroom samples excepted).
const CUSTOM = "custom";
const isCustom = (p: Prod) => p.category !== "sample" && p.variants.every((v) => v.price == null);

const vkey = (p: Prod, i: number) => p.variants[i]?.key ?? `${p.no}:${i}`;

type StatusKey = "ok" | "low" | "out" | "untracked";
type StatusFilter = "all" | StatusKey;

function statusOf(s: VarStock | undefined): StatusKey {
  if (!s) return "untracked";
  if (s.available <= 0) return "out";
  if (s.reorderPoint > 0 && s.available <= s.reorderPoint) return "low";
  return "ok";
}

const STATUS_STYLE: Record<StatusKey, string> = {
  ok: "bg-green-100 text-green-700",
  low: "bg-amber-100 text-amber-700",
  out: "bg-red-100 text-red-700",
  untracked: "bg-[#E8E5E0] text-[#6B6B6B]",
};

function fmt(n: number) {
  return n.toLocaleString("th-TH", { maximumFractionDigits: 0 });
}

function sizeLabel(v: Variant) {
  const base = v.round ? v.size : v.dims ? `${v.dims.w}*${v.dims.d ?? "-"}*${v.dims.h ?? "-"}` : v.size;
  if (v.label) return base ? `${v.label}: ${base}` : v.label;
  return base || "-";
}

export default function StockDemoPage() {
  const { t } = useLanguage();
  const [edits, setVarStock] = useState<Record<string, VarStock>>({});
  // seed from the original workbook, overridden by anything edited in this browser
  const varStock = useMemo(() => ({ ...SEED_STOCK, ...edits }), [edits]);
  const [prodInfo, setProdInfo] = useState<Record<number, ProdInfo>>({});
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [limit, setLimit] = useState(PAGE);
  const [showCost, setShowCost] = useState(false);
  const [detail, setDetail] = useState<Prod | null>(null);
  const [draftInfo, setDraftInfo] = useState<ProdInfo>(emptyProd);
  const [draftVars, setDraftVars] = useState<VarStock[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setVarStock(parsed.v ?? {});
          setProdInfo(parsed.p ?? {});
        }
      } catch {
        // storage unavailable — demo just starts empty
      }
    })();
  }, []);

  function persist(v: Record<string, VarStock>, p: Record<number, ProdInfo>) {
    setVarStock(v);
    setProdInfo(p);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ v, p }));
    } catch {
      // ignore
    }
  }

  function patchVar(p: Prod, i: number, change: Partial<VarStock>) {
    const k = vkey(p, i);
    persist({ ...edits, [k]: { ...emptyVar, ...varStock[k], ...change } }, prodInfo);
  }

  const catLabel = (key: string) => {
    const c = CATEGORIES.find((c) => c.key === key);
    return c ? t(c.th, c.en, c.zh) : key;
  };

  const catCounts = useMemo(() => {
    const m = new Map<string, number>();
    PRODUCTS.forEach((p) => {
      const k = isCustom(p) ? CUSTOM : p.category;
      m.set(k, (m.get(k) || 0) + 1);
    });
    return m;
  }, []);

  // Products that match the search/category, each with the size rows that
  // match the status filter.
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out: { p: Prod; idxs: number[] }[] = [];
    for (const p of PRODUCTS) {
      if (cat === CUSTOM ? !isCustom(p) : cat !== "all" && (p.category !== cat || isCustom(p))) continue;
      if (q) {
        const c = CATEGORIES.find((c) => c.key === p.category);
        const hit =
          p.code.toLowerCase().includes(q) ||
          p.variants.some((v) => (v.code ?? "").toLowerCase().includes(q)) ||
          `${c?.th ?? ""} ${c?.en ?? ""} ${c?.zh ?? ""}`.toLowerCase().includes(q) ||
          p.variants.some((v) => v.size.toLowerCase().includes(q));
        if (!hit) continue;
      }
      const idxs = p.variants
        .map((_, i) => i)
        .filter((i) => statusFilter === "all" || statusOf(varStock[vkey(p, i)]) === statusFilter);
      if (idxs.length) out.push({ p, idxs });
    }
    return out;
  }, [query, cat, statusFilter, varStock]);

  const totals = useMemo(() => {
    let available = 0, reserved = 0, defective = 0, low = 0, out = 0, tracked = 0;
    Object.values(varStock).forEach((s) => {
      tracked++;
      available += s.available;
      reserved += s.reserved;
      defective += s.defective;
      const st = statusOf(s);
      if (st === "low") low++;
      if (st === "out") out++;
    });
    return { available, reserved, defective, low, out, tracked };
  }, [varStock]);

  const totalVariants = useMemo(() => PRODUCTS.reduce((n, p) => n + p.variants.length, 0), []);

  function openDetail(p: Prod) {
    setDetail(p);
    setDraftInfo({ ...emptyProd, ...prodInfo[p.no] });
    setDraftVars(p.variants.map((_, i) => ({ ...emptyVar, ...varStock[vkey(p, i)] })));
  }

  function saveDetail() {
    if (!detail) return;
    // Only write sizes the user actually changed — otherwise merely opening
    // and saving the dialog would mark every untouched size as "out of stock".
    const nextV = { ...edits };
    draftVars.forEach((s, i) => {
      const k = vkey(detail, i);
      if (JSON.stringify({ ...emptyVar, ...varStock[k] }) !== JSON.stringify(s)) nextV[k] = s;
    });
    persist(nextV, { ...prodInfo, [detail.no]: draftInfo });
    setDetail(null);
  }

  function patchDraftVar(i: number, change: Partial<VarStock>) {
    setDraftVars((list) => list.map((s, j) => (j === i ? { ...s, ...change } : s)));
  }

  function resetDemo() {
    if (!confirm(t("ยกเลิกการแก้ไขทั้งหมดในเครื่องนี้ และกลับไปใช้ตัวเลขจากไฟล์เดิม?", "Discard all edits on this device and go back to the original file's numbers?", "放弃此设备上的所有修改并恢复为原文件数字？"))) return;
    persist({}, {});
  }

  function exportExcel() {
    import("xlsx").then((XLSX) => {
      const wb = XLSX.utils.book_new();
      const productRows = PRODUCTS.map((p) => {
        const info = { ...emptyProd, ...prodInfo[p.no] };
        const c = CATEGORIES.find((c) => c.key === p.category);
        return {
          No: p.no,
          Code: p.code,
          "Category (TH)": c?.th ?? "",
          "Category (EN)": c?.en ?? "",
          "Category (ZH)": c?.zh ?? "",
          Sizes: p.variants.length,
          Description: info.description,
          Color: info.color,
          Material: info.material,
          "Boxes per item": info.boxesPerItem,
        };
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productRows), "Products");
      const variantRows = PRODUCTS.flatMap((p) =>
        p.variants.map((v, i) => {
          const s = { ...emptyVar, ...varStock[vkey(p, i)] };
          return {
            "Model": p.code,
            Code: v.code ?? p.code,
            Size: v.size,
            W: v.dims?.w ?? "",
            D: v.dims?.d ?? "",
            H: v.dims?.h ?? "",
            Price: v.price ?? "",
            Note: v.note,
            Available: s.available,
            Reserved: s.reserved,
            Defective: s.defective,
            "Reorder point": s.reorderPoint,
            Location: s.location,
            ETA: s.eta,
            "Batch / Lot": s.batch,
            "Stock note": s.note,
            ...(showCost ? { "Landed cost": s.landedCost ?? "" } : {}),
          };
        })
      );
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(variantRows), "Sizes & Stock");
      XLSX.writeFile(wb, `futai-stock-demo-${new Date().toISOString().slice(0, 10)}.xlsx`);
    });
  }

  const STATUS_LABEL: Record<StatusKey, string> = {
    ok: t("พร้อมขาย", "In stock", "有货"),
    low: t("ใกล้หมด", "Low stock", "库存偏低"),
    out: t("หมด", "Out of stock", "缺货"),
    untracked: t("ยังไม่ตั้งค่า", "Not set", "未设置"),
  };

  const num = (v: string) => Math.max(0, Number(v) || 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">{t("สต็อกสินค้า (DEMO)", "Stock (DEMO)", "库存（演示）")}</h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">
            {t(
              "สินค้า/ราคา/รูปจากไฟล์รหัสสินค้า และตัวเลขสต็อกเริ่มต้นจากตารางสต็อกเดิม (库存表格) — นับแยกตามขนาด ตัวเลขที่แก้ไขเก็บไว้ในเบราว์เซอร์เครื่องนี้เท่านั้น",
              "Products/prices/photos from the product-code file; starting stock from the original stock sheet (库存表格) — tracked per size; your edits are saved in this browser only",
              "产品/价格/图片来自编号文件，初始库存来自原库存表格（库存表格）——按尺寸统计；修改仅保存在此浏览器中"
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowCost((v) => !v)}>
            {showCost ? <EyeOff size={14} className="mr-1.5" /> : <Eye size={14} className="mr-1.5" />}
            {showCost ? t("ซ่อนต้นทุน", "Hide cost", "隐藏成本") : t("โหมดเจ้าของ (ดูต้นทุน)", "Owner mode (show cost)", "老板模式（显示成本）")}
          </Button>
          <Button size="sm" variant="outline" onClick={exportExcel}>
            <Download size={14} className="mr-1.5" /> {t("Export Excel", "Export Excel", "导出Excel")}
          </Button>
          <Button size="sm" variant="ghost" onClick={resetDemo}>
            <RotateCcw size={14} className="mr-1.5" /> {t("รีเซ็ตกลับเป็นข้อมูลไฟล์เดิม", "Reset to original file", "恢复为原文件数据")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: t("สินค้า (รหัส)", "Products", "产品数"), value: fmt(PRODUCTS.length), sub: `${fmt(totalVariants)} ${t("ขนาด", "sizes", "规格")}` },
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

      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <Input
              className="pl-9"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(PAGE);
              }}
              placeholder={t("ค้นหารหัสสินค้า / หมวดหมู่ / ขนาด...", "Search code / category / size...", "搜索编号 / 分类 / 尺寸...")}
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter((v ?? "all") as StatusFilter);
              setLimit(PAGE);
            }}
          >
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
            {t("ทั้งหมด", "All", "全部")} ({PRODUCTS.length})
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
              rows.slice(0, limit).map(({ p, idxs }) => (
                <Fragment key={p.no}>
                  {idxs.map((i, n) => {
                    const v = p.variants[i];
                    const s = varStock[vkey(p, i)];
                    const info = { ...emptyVar, ...s };
                    const st = statusOf(s);
                    const first = n === 0;
                    return (
                      <TableRow key={i} className={`hover:bg-[#FAF7F2]/50 ${first ? "border-t-2 border-t-[#E8E5E0]" : ""}`}>
                        {first && (
                          <>
                            <TableCell rowSpan={idxs.length} className="align-top">
                              <button
                                type="button"
                                onClick={() => openDetail(p)}
                                className="relative block w-28 h-28 rounded-lg bg-white overflow-hidden border border-[#E8E5E0] hover:border-[#C8102E] transition-colors"
                                aria-label={p.code}
                              >
                                {p.image && <Image src={p.image} alt={p.code} fill sizes="112px" unoptimized className="object-contain" />}
                              </button>
                            </TableCell>
                            <TableCell rowSpan={idxs.length} className="align-top">
                              <p className="text-sm font-mono font-medium">{p.code}</p>
                              <p className="text-[10px] text-[#9CA3AF]">{catLabel(p.category)}</p>
                              {p.fromStock && (
                                <p className="text-[10px] text-amber-700">{t("มีเฉพาะในตารางสต็อกเดิม (ยังไม่มีในไฟล์รหัสสินค้า)", "only in the old stock sheet (not in the product-code file)", "仅在旧库存表中（编号文件中没有）")}</p>
                              )}
                              {p.mergedCodes && (
                                <p className="text-[10px] text-[#9CA3AF] italic">
                                  {t(`รุ่นเดียวกัน ${p.mergedCodes.length} ขนาด/รหัส`, `same model · ${p.mergedCodes.length} sizes/codes`, `同款 · ${p.mergedCodes.length} 个规格/编号`)}
                                </p>
                              )}
                            </TableCell>
                          </>
                        )}
                        <TableCell className="text-xs text-[#6B6B6B]">
                          {p.mergedCodes && <p className="text-sm font-mono font-semibold text-[#1A1A1A]">{v.code}</p>}
                          <p className="font-mono">
                            {sizeLabel(v)}
                            {v.flag && (
                              <span title={v.flag} className="ml-1.5 inline-flex align-middle text-amber-600">
                                <TriangleAlert size={12} />
                              </span>
                            )}
                          </p>
                          {info.available < 0 && (
                            <p className="text-amber-700">{t(`ล็อกเกินของในโกดัง ${fmt(-info.available)} ชิ้น`, `over-locked by ${fmt(-info.available)}`, `锁单超出库存 ${fmt(-info.available)}`)}</p>
                          )}
                          {info.note && <p className="text-[10px] text-[#9CA3AF] max-w-[16rem] break-words">🔒 {info.note}</p>}
                          <p className="font-semibold text-[#1A1A1A]">
                            {v.price != null ? fmt(v.price) : <span className="font-normal text-[#9CA3AF]">{t("ยังไม่มีราคา", "No price yet", "暂无价格")}</span>}
                            {v.note && <span className="ml-1.5 font-normal text-[#9CA3AF]">· {v.note}</span>}
                          </p>
                        </TableCell>
                        {(["available", "reserved", "defective", "reorderPoint"] as const).map((f) => (
                          <TableCell key={f}>
                            <Input
                              type="number"
                              step="any"
                              className="h-8 w-20 text-xs"
                              value={info[f] || ""}
                              placeholder="0"
                              onChange={(e) => patchVar(p, i, { [f]: num(e.target.value) })}
                            />
                          </TableCell>
                        ))}
                        <TableCell>
                          <Input
                            className="h-8 w-28 text-xs"
                            value={info.location}
                            placeholder={t("เช่น โกดัง1-A2", "e.g. WH1-A2", "如 仓1-A2")}
                            onChange={(e) => patchVar(p, i, { location: e.target.value })}
                          />
                        </TableCell>
                        <TableCell>
                          <span className={`text-[11px] font-medium px-2 py-1 rounded whitespace-nowrap ${STATUS_STYLE[st]}`}>
                            {STATUS_LABEL[st]}
                          </span>
                        </TableCell>
                        {first && (
                          <TableCell rowSpan={idxs.length} className="align-top">
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openDetail(p)}>
                              {t("รายละเอียด", "Details", "详情")}
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </Fragment>
              ))
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

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-5xl sm:max-w-5xl max-h-[92vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              <span className="font-mono">{detail?.code}</span>
              <span className="ml-2 text-sm font-normal text-[#6B6B6B]">{detail && catLabel(detail.category)}</span>
            </DialogTitle>
          </DialogHeader>

          {detail && (
            <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-1">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative w-full sm:w-72 aspect-square shrink-0 rounded-lg bg-white overflow-hidden border border-[#E8E5E0]">
                  {detail.image ? (
                    <Image src={detail.image} alt={detail.code} fill sizes="288px" unoptimized className="object-contain" />
                  ) : (
                    <p className="absolute inset-0 flex items-center justify-center text-xs text-[#9CA3AF]">
                      {t("ยังไม่มีรูป", "No photo yet", "暂无图片")}
                    </p>
                  )}
                </div>
                <div className="flex-1 grid grid-cols-2 gap-3 content-start">
                  <div className="col-span-2">
                    <Label className="text-xs">{t("ชื่อ / รายละเอียด / จุดเด่น", "Name / description / highlights", "名称 / 描述 / 卖点")}</Label>
                    <Textarea className="mt-1" rows={3} value={draftInfo.description} onChange={(e) => setDraftInfo({ ...draftInfo, description: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">{t("สี", "Color", "颜色")}</Label>
                    <Input className="mt-1" value={draftInfo.color} onChange={(e) => setDraftInfo({ ...draftInfo, color: e.target.value })} placeholder={t("เช่น น้ำเงิน", "e.g. Blue", "如 蓝色")} />
                  </div>
                  <div>
                    <Label className="text-xs">{t("วัสดุ", "Material", "材质")}</Label>
                    <Input className="mt-1" value={draftInfo.material} onChange={(e) => setDraftInfo({ ...draftInfo, material: e.target.value })} placeholder={t("เช่น หนัง PU", "e.g. PU leather", "如 PU皮")} />
                  </div>
                  <div>
                    <Label className="text-xs">{t("จำนวนกล่องต่อ 1 ชิ้น", "Boxes per item", "每件箱数")}</Label>
                    <Input type="number" min={1} className="mt-1" value={draftInfo.boxesPerItem} onChange={(e) => setDraftInfo({ ...draftInfo, boxesPerItem: Math.max(1, Number(e.target.value) || 1) })} />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-[#1A1A1A] mb-2">
                  {t("สต็อกแยกตามขนาด", "Stock by size", "按尺寸分列库存")}
                </p>
                <div className="overflow-x-auto border border-[#E8E5E0] rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#FAF7F2]">
                        <TableHead className="text-xs">{t("ขนาด / ราคา", "Size / Price", "尺寸 / 价格")}</TableHead>
                        <TableHead className="text-xs">{t("พร้อมขาย", "Available", "可售")}</TableHead>
                        <TableHead className="text-xs">{t("จอง/รอส่ง", "Reserved", "已预订")}</TableHead>
                        <TableHead className="text-xs">{t("ตำหนิ/เคลม", "Defective", "瑕疵")}</TableHead>
                        <TableHead className="text-xs">{t("จุดสั่งซื้อ", "Reorder pt.", "补货点")}</TableHead>
                        <TableHead className="text-xs">{t("ตำแหน่ง", "Location", "库位")}</TableHead>
                        <TableHead className="text-xs">ETA</TableHead>
                        <TableHead className="text-xs">{t("ล็อต/ตู้", "Batch", "批次")}</TableHead>
                        <TableHead className="text-xs">{t("หมายเหตุสต็อก / ลูกค้าที่ล็อก", "Stock note / locked for", "库存备注/锁单客户")}</TableHead>
                        {showCost && <TableHead className="text-xs text-[#C8102E]">{t("ต้นทุน", "Landed cost", "到岸成本")}</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.variants.map((v, i) => {
                        const d = draftVars[i] ?? emptyVar;
                        return (
                          <TableRow key={i}>
                            <TableCell className="text-xs">
                              {detail.mergedCodes && <p className="font-mono font-semibold">{v.code}</p>}
                              <p className="font-mono">{sizeLabel(v)}</p>
                              {v.flag && (
                                <p className="text-amber-700 flex items-start gap-1 max-w-[16rem]">
                                  <TriangleAlert size={11} className="mt-0.5 shrink-0" /> {v.flag}
                                </p>
                              )}
                              <p className="text-[#6B6B6B]">
                                {v.price != null ? `฿${fmt(v.price)}` : "-"}
                                {v.note && ` · ${v.note}`}
                              </p>
                            </TableCell>
                            {(["available", "reserved", "defective", "reorderPoint"] as const).map((f) => (
                              <TableCell key={f}>
                                <Input type="number" min={0} className="h-8 w-20 text-xs" value={d[f] || ""} placeholder="0" onChange={(e) => patchDraftVar(i, { [f]: num(e.target.value) })} />
                              </TableCell>
                            ))}
                            <TableCell>
                              <Input className="h-8 w-28 text-xs" value={d.location} onChange={(e) => patchDraftVar(i, { location: e.target.value })} />
                            </TableCell>
                            <TableCell>
                              <Input type="date" className="h-8 w-36 text-xs" value={d.eta} onChange={(e) => patchDraftVar(i, { eta: e.target.value })} />
                            </TableCell>
                            <TableCell>
                              <Input className="h-8 w-28 text-xs" value={d.batch} onChange={(e) => patchDraftVar(i, { batch: e.target.value })} />
                            </TableCell>
                            <TableCell>
                              <Input className="h-8 w-56 text-xs" value={d.note} onChange={(e) => patchDraftVar(i, { note: e.target.value })} />
                            </TableCell>
                            {showCost && (
                              <TableCell>
                                <Input
                                  type="number"
                                  min={0}
                                  className="h-8 w-24 text-xs"
                                  value={d.landedCost ?? ""}
                                  onChange={(e) => patchDraftVar(i, { landedCost: e.target.value === "" ? null : num(e.target.value) })}
                                />
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetail(null)}>{t("ยกเลิก", "Cancel", "取消")}</Button>
            <Button onClick={saveDetail}>{t("บันทึก", "Save", "保存")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
