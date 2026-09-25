"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Search, Download, Eye, EyeOff, RotateCcw, PackageSearch } from "lucide-react";
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
}
interface Prod {
  no: number;
  code: string;
  category: string;
  image?: string;
  imageShared?: boolean;
  variants: Variant[];
}
interface Cat {
  key: string;
  zh: string;
  en: string;
  th: string;
}
interface StockInfo {
  available: number;
  reserved: number;
  defective: number;
  reorderPoint: number;
  location: string;
  description: string;
  color: string;
  material: string;
  boxesPerItem: number;
  landedCost: number | null;
  eta: string;
  batch: string;
}

const PRODUCTS = raw.products as Prod[];
const CATEGORIES = raw.categories as Cat[];
const STORAGE_KEY = "futai-stock-demo-v1";
const PAGE = 50;

const emptyInfo: StockInfo = {
  available: 0, reserved: 0, defective: 0, reorderPoint: 0, location: "",
  description: "", color: "", material: "", boxesPerItem: 1, landedCost: null, eta: "", batch: "",
};

type StatusKey = "ok" | "low" | "out" | "untracked";
type StatusFilter = "all" | StatusKey;

function statusOf(info: StockInfo | undefined): StatusKey {
  if (!info) return "untracked";
  if (info.available <= 0) return "out";
  if (info.reorderPoint > 0 && info.available <= info.reorderPoint) return "low";
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

function priceRange(p: Prod) {
  const prices = p.variants.map((v) => v.price).filter((x): x is number => x != null);
  if (!prices.length) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
}

export default function StockDemoPage() {
  const { t } = useLanguage();
  const [stock, setStock] = useState<Record<number, StockInfo>>({});
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [limit, setLimit] = useState(PAGE);
  const [showCost, setShowCost] = useState(false);
  const [detail, setDetail] = useState<Prod | null>(null);
  const [draft, setDraft] = useState<StockInfo>(emptyInfo);

  useEffect(() => {
    (async () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setStock(JSON.parse(saved));
      } catch {
        // storage unavailable — demo just starts empty
      }
    })();
  }, []);

  function persist(next: Record<number, StockInfo>) {
    setStock(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  function patch(no: number, change: Partial<StockInfo>) {
    persist({ ...stock, [no]: { ...emptyInfo, ...stock[no], ...change } });
  }

  const catLabel = (key: string) => {
    const c = CATEGORIES.find((c) => c.key === key);
    return c ? t(c.th, c.en, c.zh) : key;
  };

  const catCounts = useMemo(() => {
    const m = new Map<string, number>();
    PRODUCTS.forEach((p) => m.set(p.category, (m.get(p.category) || 0) + 1));
    return m;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PRODUCTS.filter((p) => {
      if (cat !== "all" && p.category !== cat) return false;
      if (statusFilter !== "all" && statusOf(stock[p.no]) !== statusFilter) return false;
      if (!q) return true;
      const c = CATEGORIES.find((c) => c.key === p.category);
      return (
        p.code.toLowerCase().includes(q) ||
        `${c?.th ?? ""} ${c?.en ?? ""} ${c?.zh ?? ""}`.toLowerCase().includes(q) ||
        p.variants.some((v) => v.size.toLowerCase().includes(q))
      );
    });
  }, [query, cat, statusFilter, stock]);

  const totals = useMemo(() => {
    let available = 0, reserved = 0, defective = 0, low = 0, out = 0, tracked = 0;
    PRODUCTS.forEach((p) => {
      const s = stock[p.no];
      if (!s) return;
      tracked++;
      available += s.available;
      reserved += s.reserved;
      defective += s.defective;
      const st = statusOf(s);
      if (st === "low") low++;
      if (st === "out") out++;
    });
    return { available, reserved, defective, low, out, tracked };
  }, [stock]);

  function openDetail(p: Prod) {
    setDetail(p);
    setDraft({ ...emptyInfo, ...stock[p.no] });
  }

  function saveDetail() {
    if (!detail) return;
    persist({ ...stock, [detail.no]: draft });
    setDetail(null);
  }

  function resetDemo() {
    if (!confirm(t("ล้างข้อมูลสต็อกที่กรอกไว้ทั้งหมด (ในเครื่องนี้)?", "Clear all stock data entered (on this device)?", "清除此设备上录入的全部库存数据？"))) return;
    persist({});
  }

  function exportExcel() {
    import("xlsx").then((XLSX) => {
      const wb = XLSX.utils.book_new();
      const productRows = PRODUCTS.map((p) => {
        const s = { ...emptyInfo, ...stock[p.no] };
        const c = CATEGORIES.find((c) => c.key === p.category);
        return {
          No: p.no,
          Code: p.code,
          "Category (TH)": c?.th ?? "",
          "Category (EN)": c?.en ?? "",
          "Category (ZH)": c?.zh ?? "",
          Variants: p.variants.length,
          Available: s.available,
          Reserved: s.reserved,
          Defective: s.defective,
          "Reorder point": s.reorderPoint,
          Location: s.location,
          Color: s.color,
          Material: s.material,
          "Boxes per item": s.boxesPerItem,
          ...(showCost ? { "Landed cost": s.landedCost ?? "" } : {}),
          ETA: s.eta,
          "Batch / Lot": s.batch,
          Description: s.description,
        };
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productRows), "Products");
      const variantRows = PRODUCTS.flatMap((p) =>
        p.variants.map((v) => ({
          Code: p.code,
          Size: v.size,
          W: v.dims?.w ?? "",
          D: v.dims?.d ?? "",
          H: v.dims?.h ?? "",
          Price: v.price ?? "",
          Note: v.note,
        }))
      );
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(variantRows), "Variants");
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
              "ข้อมูลสินค้านำเข้าจากไฟล์ Excel (รหัส รูป ราคา ขนาด) — ตัวเลขสต็อกที่กรอกเก็บไว้ในเบราว์เซอร์เครื่องนี้เท่านั้น",
              "Product data imported from the Excel file (code, photo, price, size) — stock numbers you enter are saved in this browser only",
              "产品数据来自Excel文件（编号、图片、价格、尺寸）——录入的库存数字仅保存在此浏览器中"
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
            <RotateCcw size={14} className="mr-1.5" /> {t("ล้างข้อมูลที่กรอก", "Clear entries", "清除录入")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: t("สินค้า (รหัส)", "Products", "产品数"), value: fmt(PRODUCTS.length), sub: `${fmt(PRODUCTS.reduce((n, p) => n + p.variants.length, 0))} ${t("ขนาด/ราคา", "size variants", "规格")}` },
          { label: t("พร้อมขาย", "Available", "可售"), value: fmt(totals.available), sub: t("ชิ้น", "pcs", "件") },
          { label: t("จอง/รอส่ง", "Reserved", "已预订/待发"), value: fmt(totals.reserved), sub: t("ชิ้น", "pcs", "件") },
          { label: t("มีตำหนิ/รอเคลม", "Defective", "瑕疵/待索赔"), value: fmt(totals.defective), sub: t("ชิ้น", "pcs", "件") },
          { label: t("ใกล้หมด", "Low stock", "库存偏低"), value: fmt(totals.low), sub: t("ถึงจุดสั่งซื้อ", "at reorder point", "已到补货点") },
          { label: t("หมดสต็อก", "Out of stock", "缺货"), value: fmt(totals.out), sub: `${fmt(totals.tracked)} ${t("รายการที่ตั้งค่าแล้ว", "tracked", "已设置")}` },
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
              <TableHead className="text-xs">{t("ขนาด / ราคา (฿)", "Size / Price (฿)", "尺寸 / 价格(฿)")}</TableHead>
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
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12 text-[#6B6B6B]">
                  <PackageSearch size={28} className="mx-auto mb-2 opacity-40" />
                  {t("ไม่พบสินค้าที่ตรงกับตัวกรอง", "No products match your filters", "没有符合筛选条件的产品")}
                </TableCell>
              </TableRow>
            ) : (
              filtered.slice(0, limit).map((p) => {
                const s = stock[p.no];
                const info = { ...emptyInfo, ...s };
                const range = priceRange(p);
                const st = statusOf(s);
                return (
                  <TableRow key={p.no} className="hover:bg-[#FAF7F2]/50 align-top">
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => openDetail(p)}
                        className="relative block w-28 h-28 rounded-lg bg-white overflow-hidden border border-[#E8E5E0] hover:border-[#C8102E] transition-colors"
                        aria-label={p.code}
                      >
                        {p.image && <Image src={p.image} alt={p.code} fill sizes="112px" unoptimized className="object-contain" />}
                      </button>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-mono font-medium">{p.code}</p>
                      <p className="text-[10px] text-[#9CA3AF]">{catLabel(p.category)}</p>
                      {p.imageShared && (
                        <p className="text-[10px] text-[#9CA3AF] italic">{t("รูปจากรุ่นเดียวกัน", "photo from same model", "图片取自同款")}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-[#6B6B6B]">
                      <p>{p.variants[0]?.size || "-"}{p.variants.length > 1 && ` +${p.variants.length - 1}`}</p>
                      <p className="font-semibold text-[#1A1A1A]">
                        {range ?? <span className="font-normal text-[#9CA3AF]">{t("ยังไม่มีราคา", "No price yet", "暂无价格")}</span>}
                      </p>
                    </TableCell>
                    {(["available", "reserved", "defective", "reorderPoint"] as const).map((f) => (
                      <TableCell key={f}>
                        <Input
                          type="number"
                          min={0}
                          className="h-8 w-20 text-xs"
                          value={s ? info[f] : ""}
                          placeholder="0"
                          onChange={(e) => patch(p.no, { [f]: num(e.target.value) })}
                        />
                      </TableCell>
                    ))}
                    <TableCell>
                      <Input
                        className="h-8 w-28 text-xs"
                        value={info.location}
                        placeholder={t("เช่น โกดัง1-A2", "e.g. WH1-A2", "如 仓1-A2")}
                        onChange={(e) => patch(p.no, { location: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <span className={`text-[11px] font-medium px-2 py-1 rounded whitespace-nowrap ${STATUS_STYLE[st]}`}>
                        {STATUS_LABEL[st]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openDetail(p)}>
                        {t("รายละเอียด", "Details", "详情")}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        {filtered.length > limit && (
          <div className="p-3 text-center border-t border-[#E8E5E0]">
            <Button size="sm" variant="outline" onClick={() => setLimit((l) => l + PAGE)}>
              {t("แสดงเพิ่ม", "Show more", "显示更多")} ({filtered.length - limit})
            </Button>
          </div>
        )}
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-3xl sm:max-w-3xl max-h-[90vh] flex flex-col">
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
                <div className="flex-1 min-w-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#FAF7F2]">
                        <TableHead className="text-xs">{t("ขนาด (มม.)", "Size (mm)", "尺寸(mm)")}</TableHead>
                        <TableHead className="text-xs text-right">{t("ราคา ฿", "Price ฿", "价格 ฿")}</TableHead>
                        <TableHead className="text-xs">{t("หมายเหตุ", "Note", "备注")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.variants.map((v, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs font-mono">
                            {v.dims ? `W${v.dims.w} × D${v.dims.d ?? "-"} × H${v.dims.h ?? "-"}` : v.size || "-"}
                          </TableCell>
                          <TableCell className="text-xs text-right">{v.price != null ? fmt(v.price) : "-"}</TableCell>
                          <TableCell className="text-xs text-[#6B6B6B]">{v.note || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-3">
                  <Label className="text-xs">{t("ชื่อ / รายละเอียด / จุดเด่น", "Name / description / highlights", "名称 / 描述 / 卖点")}</Label>
                  <Textarea className="mt-1" rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">{t("สี", "Color", "颜色")}</Label>
                  <Input className="mt-1" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} placeholder={t("เช่น น้ำเงิน", "e.g. Blue", "如 蓝色")} />
                </div>
                <div>
                  <Label className="text-xs">{t("วัสดุ", "Material", "材质")}</Label>
                  <Input className="mt-1" value={draft.material} onChange={(e) => setDraft({ ...draft, material: e.target.value })} placeholder={t("เช่น หนัง PU", "e.g. PU leather", "如 PU皮")} />
                </div>
                <div>
                  <Label className="text-xs">{t("จำนวนกล่องต่อ 1 ชิ้น", "Boxes per item", "每件箱数")}</Label>
                  <Input type="number" min={1} className="mt-1" value={draft.boxesPerItem} onChange={(e) => setDraft({ ...draft, boxesPerItem: Math.max(1, Number(e.target.value) || 1) })} />
                </div>
                <div>
                  <Label className="text-xs">{t("พร้อมขาย", "Available", "可售")}</Label>
                  <Input type="number" min={0} className="mt-1" value={draft.available} onChange={(e) => setDraft({ ...draft, available: num(e.target.value) })} />
                </div>
                <div>
                  <Label className="text-xs">{t("จอง/รอส่ง", "Reserved", "已预订/待发")}</Label>
                  <Input type="number" min={0} className="mt-1" value={draft.reserved} onChange={(e) => setDraft({ ...draft, reserved: num(e.target.value) })} />
                </div>
                <div>
                  <Label className="text-xs">{t("มีตำหนิ/รอเคลม", "Defective / claim", "瑕疵/待索赔")}</Label>
                  <Input type="number" min={0} className="mt-1" value={draft.defective} onChange={(e) => setDraft({ ...draft, defective: num(e.target.value) })} />
                </div>
                <div>
                  <Label className="text-xs">{t("จุดสั่งซื้อขั้นต่ำ", "Reorder point", "最低补货点")}</Label>
                  <Input type="number" min={0} className="mt-1" value={draft.reorderPoint} onChange={(e) => setDraft({ ...draft, reorderPoint: num(e.target.value) })} />
                </div>
                <div>
                  <Label className="text-xs">{t("ตำแหน่งจัดเก็บ", "Location", "库位")}</Label>
                  <Input className="mt-1" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} placeholder={t("โกดัง 1 โซน A ชั้น 2", "Warehouse 1, Zone A, Shelf 2", "1号仓 A区 2层")} />
                </div>
                <div>
                  <Label className="text-xs">{t("วันที่ของเข้าโกดัง (ETA)", "Arrival date (ETA)", "预计到仓日期(ETA)")}</Label>
                  <Input type="date" className="mt-1" value={draft.eta} onChange={(e) => setDraft({ ...draft, eta: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">{t("รหัสล็อต / ตู้คอนเทนเนอร์", "Batch / container no.", "批次 / 集装箱号")}</Label>
                  <Input className="mt-1" value={draft.batch} onChange={(e) => setDraft({ ...draft, batch: e.target.value })} />
                </div>
                {showCost && (
                  <div>
                    <Label className="text-xs text-[#C8102E]">{t("ราคาต้นทุน (Landed Cost) — เจ้าของเท่านั้น", "Landed cost — owner only", "到岸成本 — 仅老板可见")}</Label>
                    <Input
                      type="number"
                      min={0}
                      className="mt-1"
                      value={draft.landedCost ?? ""}
                      onChange={(e) => setDraft({ ...draft, landedCost: e.target.value === "" ? null : num(e.target.value) })}
                    />
                  </div>
                )}
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
