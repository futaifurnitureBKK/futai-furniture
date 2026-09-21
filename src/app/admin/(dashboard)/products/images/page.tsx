"use client";
import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import {
  Upload, X, CheckCircle2, AlertCircle, FileSpreadsheet,
  ImageIcon, Loader2, Link2, RefreshCw,
} from "lucide-react";
import { PRODUCTS } from "@/data/mock";
import { useLanguage } from "@/store/language";

/* ── Types ─────────────────────────────────────── */
interface FileItem {
  file: File;
  preview: string;
  sku: string;
  status: "idle" | "uploading" | "done" | "error";
  url?: string;
  error?: string;
}

/* ── Helpers ────────────────────────────────────── */
function guessSku(filename: string): string {
  // Strip extension, try to find known SKU pattern
  const base = filename.replace(/\.[^.]+$/, "").trim();
  const m = base.match(/([A-Z]{2,}[-][A-Z0-9]{2,}(?:[-][A-Z0-9]+)?)/i);
  return m ? m[1].toUpperCase() : base;
}

const KNOWN_SKUS = PRODUCTS.map((p) => p.sku);

/* ══════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════ */
export default function AdminImagesPage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<"upload" | "shopee">("upload");

  /* ── Upload tab state ── */
  const [files, setFiles]       = useState<FileItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ── Shopee tab state ── */
  const [shopeeText, setShopeeText]   = useState("");
  const [shopeeRows, setShopeeRows]   = useState<{ sku: string; images: string[] }[]>([]);
  const [shopeeLoading, setShopeeLoading] = useState(false);
  const [shopeeError, setShopeeError] = useState("");

  /* ────────────────────────────────────────────────
     Upload tab handlers
  ──────────────────────────────────────────────── */
  const addFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming).filter((f) => f.type.startsWith("image/"));
    const items: FileItem[] = arr.map((f) => ({
      file: f,
      preview: URL.createObjectURL(f),
      sku: guessSku(f.name),
      status: "idle",
    }));
    setFiles((prev) => [...prev, ...items]);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const updateSku = (idx: number, sku: string) =>
    setFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, sku } : f)));

  const removeFile = (idx: number) => {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const uploadAll = async () => {
    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== "idle") continue;
      setFiles((prev) => prev.map((f, j) => j === i ? { ...f, status: "uploading" } : f));

      const form = new FormData();
      // rename file to SKU.ext so it's easy to map later
      const ext  = files[i].file.name.split(".").pop();
      const blob = new Blob([files[i].file], { type: files[i].file.type });
      form.append("file", blob, `${files[i].sku}.${ext}`);

      try {
        const res  = await fetch("/api/products/upload", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        setFiles((prev) =>
          prev.map((f, j) => j === i ? { ...f, status: "done", url: data.url } : f)
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setFiles((prev) =>
          prev.map((f, j) => j === i ? { ...f, status: "error", error: msg } : f)
        );
      }
    }
  };

  const doneCount  = files.filter((f) => f.status === "done").length;
  const idleCount  = files.filter((f) => f.status === "idle").length;

  /* ────────────────────────────────────────────────
     Shopee tab handlers
  ──────────────────────────────────────────────── */
  const parseShopeeText = async () => {
    setShopeeLoading(true);
    setShopeeError("");
    try {
      // Parse TSV/CSV pasted from Shopee Excel
      const lines = shopeeText.trim().split("\n").map((l) => l.split("\t"));
      const res   = await fetch("/api/products/import-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: lines }),
      });
      const data  = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShopeeRows(data.results);
    } catch (e: unknown) {
      setShopeeError(e instanceof Error ? e.message : t("แยกวิเคราะห์ข้อมูลไม่สำเร็จ", "Parse failed", "解析失败"));
    } finally {
      setShopeeLoading(false);
    }
  };

  /* ────────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────────── */
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">{t("จัดการรูปสินค้า", "Product Images", "商品图片管理")}</h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">{t("อัปโหลดรูปสินค้าหรือดึงจาก Shopee", "Upload product images or import from Shopee", "上传商品图片或从Shopee导入")}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F5F3EF] p-1 rounded-xl w-fit">
        {([
          { key: "upload", label: t("อัปโหลดรูปเอง", "Upload Images", "自行上传图片"), icon: Upload },
          { key: "shopee", label: t("นำเข้าจาก Shopee", "Import from Shopee", "从Shopee导入"), icon: FileSpreadsheet },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key
                ? "bg-white shadow-sm text-[#1A1A1A]"
                : "text-[#6B6B6B] hover:text-[#1A1A1A]"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ════ TAB: UPLOAD ════ */}
      {tab === "upload" && (
        <div className="space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
              dragging
                ? "border-[#C8102E] bg-red-50"
                : "border-[#E8E5E0] hover:border-[#C8102E]/40 hover:bg-[#FAF7F2]"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
            <ImageIcon size={36} className="mx-auto text-[#C8C5BE] mb-3" />
            <p className="font-medium text-[#1A1A1A]">{t("ลากรูปมาวางหรือคลิกเพื่อเลือก", "Drag images here or click to select", "拖放图片到此处或点击选择")}</p>
            <p className="text-sm text-[#6B6B6B] mt-1">{t("รองรับ JPG, PNG, WebP — หลายรูปพร้อมกันได้", "Supports JPG, PNG, WebP — multiple files at once", "支持 JPG、PNG、WebP — 可同时上传多张")}</p>
            <p className="text-xs text-[#9B9B9B] mt-2">💡 {t("ตั้งชื่อไฟล์เป็น SKU เช่น", "Name the file as the SKU, e.g.", "将文件名设为SKU，例如")} <code>HJ-350A.jpg</code> {t("จะ map ให้อัตโนมัติ", "and it will be mapped automatically", "系统会自动匹配")}</p>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#6B6B6B]">{files.length} {t("ไฟล์", "files", "个文件")} · {t("อัปโหลดแล้ว", "Uploaded", "已上传")} {doneCount}</p>
                <button
                  onClick={uploadAll}
                  disabled={idleCount === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-[#C8102E] text-white text-sm font-medium rounded-lg disabled:opacity-40 hover:bg-[#a30d25] transition-colors"
                >
                  <Upload size={14} />
                  {t("อัปโหลดทั้งหมด", "Upload All", "全部上传")} ({idleCount})
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {files.map((f, i) => (
                  <div key={i} className="bg-white rounded-xl border border-[#E8E5E0] overflow-hidden">
                    {/* Preview */}
                    <div className="relative aspect-square bg-[#F5F3EF]">
                      <Image src={f.preview} alt={f.sku} fill sizes="200px" className="object-contain p-2" />
                      <button
                        onClick={() => removeFile(i)}
                        aria-label={t("ลบไฟล์", "Remove file", "删除文件")}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/80"
                      >
                        <X size={12} />
                      </button>
                      {/* Status overlay */}
                      {f.status === "uploading" && (
                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                          <Loader2 size={24} className="animate-spin text-[#C8102E]" />
                        </div>
                      )}
                      {f.status === "done" && (
                        <div className="absolute inset-0 bg-green-50/80 flex items-center justify-center">
                          <CheckCircle2 size={28} className="text-green-500" />
                        </div>
                      )}
                      {f.status === "error" && (
                        <div className="absolute inset-0 bg-red-50/80 flex items-center justify-center">
                          <AlertCircle size={28} className="text-red-500" />
                        </div>
                      )}
                    </div>

                    {/* SKU input */}
                    <div className="p-2 space-y-1">
                      <input
                        value={f.sku}
                        onChange={(e) => updateSku(i, e.target.value)}
                        placeholder={t("SKU สินค้า", "Product SKU", "商品SKU")}
                        className={`w-full text-xs px-2 py-1.5 border rounded-lg focus:outline-none focus:border-[#C8102E] ${
                          KNOWN_SKUS.includes(f.sku)
                            ? "border-green-400 bg-green-50"
                            : "border-[#E8E5E0]"
                        }`}
                      />
                      {KNOWN_SKUS.includes(f.sku) && (
                        <p className="text-[10px] text-green-600 flex items-center gap-1">
                          <CheckCircle2 size={10} /> {t("พบ SKU ในระบบ", "SKU found in system", "系统中找到该SKU")}
                        </p>
                      )}
                      {f.status === "done" && f.url && (
                        <a
                          href={f.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-blue-500 flex items-center gap-1 truncate"
                        >
                          <Link2 size={10} /> {t("ดูรูป", "View image", "查看图片")}
                        </a>
                      )}
                      {f.status === "error" && (
                        <p className="text-[10px] text-red-500">{f.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Setup notice if no BLOB_READ_WRITE_TOKEN */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
            <p className="font-medium text-amber-800 mb-1">⚙️ {t("ต้องการ Vercel Blob Token", "Vercel Blob Token Required", "需要 Vercel Blob Token")}</p>
            <p className="text-amber-700 text-xs">
              {t("เพื่อให้อัปโหลดทำงานได้ใน Production ไปที่", "For uploads to work in production, go to", "为使上传功能在生产环境中正常工作，请前往")}{" "}
              <a href="https://vercel.com/dashboard" target="_blank" className="underline">Vercel Dashboard</a>
              {" "}→ Project → Storage → Create Blob Store → copy{" "}
              <code className="bg-amber-100 px-1 rounded">BLOB_READ_WRITE_TOKEN</code>
              {" "}→ {t("ใส่ใน Environment Variables", "add it to Environment Variables", "添加到 Environment Variables 中")}
            </p>
          </div>
        </div>
      )}

      {/* ════ TAB: SHOPEE ════ */}
      {tab === "shopee" && (
        <div className="space-y-4">
          {/* Instructions */}
          <div className="bg-[#F0F4FF] border border-blue-200 rounded-xl p-4 text-sm space-y-2">
            <p className="font-semibold text-[#1A2F5E]">{t("วิธี Export รูปสินค้าจาก Shopee Seller Center", "How to export product images from Shopee Seller Center", "如何从Shopee卖家中心导出商品图片")}</p>
            <ol className="text-[#1A2F5E]/80 space-y-1 list-decimal pl-4 text-xs">
              <li>{t("เข้า Seller Center →", "Go to Seller Center →", "进入卖家中心 →")} <strong>{t("สินค้า", "Products", "商品")}</strong> → <strong>{t("จัดการสินค้าแบบกลุ่ม", "Bulk Product Management", "批量商品管理")}</strong></li>
              <li>{t("คลิก", "Click", "点击")} <strong>{t("\"อัปเดตจำนวนมาก\"", "\"Bulk Update\"", "\"批量更新\"")}</strong> → {t("เลือก", "select", "选择")} <strong>{t("\"รูปภาพสินค้า\"", "\"Product Images\"", "\"商品图片\"")}</strong></li>
              <li>{t("กด", "Click", "点击")} <strong>{t("\"ดาวน์โหลดเทมเพลต\"", "\"Download Template\"", "\"下载模板\"")}</strong> {t("จะได้ไฟล์ Excel ที่มี URL รูปสินค้าจริง", "to get an Excel file containing the actual product image URLs", "即可获得含有商品图片URL的Excel文件")}</li>
              <li>{t("เปิดไฟล์ Excel → เลือกทุก cell →", "Open the Excel file → select all cells →", "打开Excel文件 → 全选单元格 →")} <strong>Copy (Ctrl+C)</strong></li>
              <li>{t("วางลงในช่องด้านล่าง", "Paste it into the box below", "粘贴到下方文本框中")}</li>
            </ol>
          </div>

          {/* Paste area */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#1A1A1A]">
              {t("วางข้อมูลจาก Shopee Excel ที่นี่", "Paste the data from the Shopee Excel file here", "在此粘贴Shopee Excel中的数据")}
            </label>
            <textarea
              value={shopeeText}
              onChange={(e) => setShopeeText(e.target.value)}
              placeholder={t("วางข้อมูลที่ copy จาก Excel ตรงนี้ (Tab-separated)...", "Paste the data copied from Excel here (tab-separated)...", "在此粘贴从Excel复制的数据（以制表符分隔）...")}
              rows={8}
              className="w-full px-4 py-3 border border-[#E8E5E0] rounded-xl text-xs font-mono focus:outline-none focus:border-[#C8102E] resize-none"
            />
            <button
              onClick={parseShopeeText}
              disabled={!shopeeText.trim() || shopeeLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[#1A2F5E] text-white text-sm font-medium rounded-lg disabled:opacity-40 hover:bg-[#152448] transition-colors"
            >
              {shopeeLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {t("วิเคราะห์และ Import รูป", "Analyze and Import Images", "分析并导入图片")}
            </button>
          </div>

          {shopeeError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {shopeeError}
            </div>
          )}

          {/* Results */}
          {shopeeRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-[#1A1A1A]">{t("พบ", "Found", "找到")} {shopeeRows.length} {t("สินค้า", "products", "件商品")}</p>
                <span className="text-xs text-[#6B6B6B]">
                  {shopeeRows.filter((r) => KNOWN_SKUS.includes(r.sku)).length} {t("SKU ตรงกับระบบ", "SKUs match the system", "个SKU与系统匹配")}
                </span>
              </div>
              <div className="rounded-xl border border-[#E8E5E0] overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[#F5F3EF]">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-[#6B6B6B]">SKU</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-[#6B6B6B]">{t("รูปภาพ", "Images", "图片")}</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-[#6B6B6B]">{t("สถานะ", "Status", "状态")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EDE8]">
                    {shopeeRows.map((row, i) => (
                      <tr key={i} className="hover:bg-[#FAFAF8]">
                        <td className="px-4 py-2 font-mono text-xs">{row.sku}</td>
                        <td className="px-4 py-2">
                          <div className="flex gap-1">
                            {row.images.slice(0, 5).map((url, j) => (
                              <div key={j} className="relative w-8 h-8 rounded overflow-hidden bg-[#F5F3EF] border border-[#E8E5E0]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt="" className="w-full h-full object-cover" />
                              </div>
                            ))}
                            {row.images.length > 5 && (
                              <span className="w-8 h-8 rounded bg-[#F5F3EF] border border-[#E8E5E0] flex items-center justify-center text-[10px] text-[#6B6B6B]">
                                +{row.images.length - 5}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          {KNOWN_SKUS.includes(row.sku) ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                              <CheckCircle2 size={10} /> {t("พบในระบบ", "Found in system", "系统中已存在")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                              <AlertCircle size={10} /> {t("ไม่พบ SKU", "SKU not found", "未找到SKU")}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-[#6B6B6B] bg-[#F5F3EF] p-3 rounded-lg">
                💡 {t("ส่งไฟล์ Excel นี้ให้ Claude แล้วพิมพ์ \"import รูป Shopee\" — จะอัปเดตรูปสินค้าให้ทันที", "Send this Excel file to Claude and type \"import Shopee images\" — it will update the product images right away", "将此Excel文件发送给Claude，并输入\"import 图片 Shopee\" — 系统会立即更新商品图片")}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
