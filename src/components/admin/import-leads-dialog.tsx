"use client";
import { useState } from "react";
import { UploadCloud, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { CHANNELS, SEGMENTS, STATUSES } from "@/lib/lead-options";
import type { Lead, LeadChannel, LeadSegment, LeadStatus } from "@/types";

interface ParsedRow {
  key: string;
  include: boolean;
  customer_name: string;
  channel: LeadChannel;
  segment: LeadSegment;
  status: LeadStatus;
  notes: string;
  lead_date: string;
  sheet: string;
}

const HEADER_KEYWORDS = {
  company: ["company", "公司"],
  contactPerson: ["contact person", "联系人"],
  interest: ["interest", "感兴趣"],
  customerStatus: ["customer status", "客户状态"],
  followUpDate: ["follow-up date", "follow up date", "日期"],
  followUpResult: ["follow-up result", "follow up result", "跟进结果"],
  notes: ["notes", "备注"],
  channel: ["ช่องทาง", "channel"],
};

function cellText(v: unknown): string {
  if (v == null) return "";
  return String(v).replace(/\r/g, "").trim();
}

function findCol(headerRow: unknown[], keywords: string[]): number {
  return headerRow.findIndex((h) => {
    const t = cellText(h).toLowerCase();
    return t && keywords.some((k) => t.includes(k.toLowerCase()));
  });
}

function excelSerialToISODate(serial: number): string | null {
  if (!serial || Number.isNaN(serial)) return null;
  const utcDays = Math.floor(serial - 25569);
  const date = new Date(utcDays * 86400 * 1000);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function detectChannelFromText(text: string): LeadChannel | null {
  const t = text.toLowerCase();
  if (t.includes("shopee") || t.includes("虾皮")) return "shopee";
  if (t.includes("facebook") || t.includes("facedook")) return "facebook";
  if (t.includes("tiktok")) return "tiktok";
  if (t.includes("line") || t.includes("ไลน์")) return "line";
  return null;
}

function detectChannelFromSheetName(name: string): LeadChannel {
  const n = name.toLowerCase();
  if (n.includes("shopee") || n.includes("虾")) return "shopee";
  if (n.includes("face")) return "facebook";
  if (n.includes("tiktok")) return "tiktok";
  if (n.includes("line")) return "line";
  return "other";
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function ImportLeadsDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: (leads: Lead[]) => void;
}) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setRows([]);
    setFileName("");
    setError("");
  }

  async function handleFile(file: File) {
    setParsing(true);
    setError("");
    setFileName(file.name);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: false });

      const parsed: ParsedRow[] = [];
      wb.SheetNames.forEach((sheetName) => {
        const sheet = wb.Sheets[sheetName];
        const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "" });
        if (!grid.length) return;

        const headerRow = grid[0];
        const colCompany = findCol(headerRow, HEADER_KEYWORDS.company);
        const colContact = findCol(headerRow, HEADER_KEYWORDS.contactPerson);
        const colInterest = findCol(headerRow, HEADER_KEYWORDS.interest);
        const colStatus = findCol(headerRow, HEADER_KEYWORDS.customerStatus);
        const colDate = findCol(headerRow, HEADER_KEYWORDS.followUpDate);
        const colResult = findCol(headerRow, HEADER_KEYWORDS.followUpResult);
        const colNotes = findCol(headerRow, HEADER_KEYWORDS.notes);
        const colChannel = findCol(headerRow, HEADER_KEYWORDS.channel);

        // Sheet has none of the columns we recognize — skip it.
        if (colCompany === -1 && colContact === -1) return;

        for (let r = 1; r < grid.length; r++) {
          const row = grid[r];
          const company = colCompany >= 0 ? cellText(row[colCompany]) : "";
          const contact = colContact >= 0 ? cellText(row[colContact]) : "";
          if (!company && !contact) continue;

          const interest = colInterest >= 0 ? cellText(row[colInterest]) : "";
          const statusText = colStatus >= 0 ? cellText(row[colStatus]) : "";
          const resultText = colResult >= 0 ? cellText(row[colResult]) : "";
          const notesText = colNotes >= 0 ? cellText(row[colNotes]) : "";
          const channelCell = colChannel >= 0 ? cellText(row[colChannel]) : "";
          const dateCell = colDate >= 0 ? row[colDate] : "";

          const channel =
            (channelCell && channelCell !== "-" && detectChannelFromText(channelCell)) ||
            detectChannelFromText([statusText, resultText, notesText].join(" ")) ||
            detectChannelFromSheetName(sheetName);

          const notesParts = [
            interest && interest !== "-" ? `สนใจ: ${interest}` : "",
            statusText && statusText !== "-" ? `สถานะลูกค้า: ${statusText}` : "",
            resultText && resultText !== "-" ? `ผลติดตาม: ${resultText}` : "",
            notesText && notesText !== "-" ? `หมายเหตุ: ${notesText}` : "",
          ].filter(Boolean);

          const leadDate =
            (typeof dateCell === "number" ? excelSerialToISODate(dateCell) : null) || todayStr();

          parsed.push({
            key: `${sheetName}-${r}`,
            include: true,
            customer_name: company || contact,
            channel,
            segment: company ? "b2b" : "b2c",
            status: "new",
            notes: notesParts.join(" | "),
            lead_date: leadDate,
            sheet: sheetName,
          });
        }
      });

      setRows(parsed);
      if (parsed.length === 0) setError("ไม่พบแถวข้อมูลลูกค้าที่อ่านได้ในไฟล์นี้");
    } catch {
      setError("อ่านไฟล์ไม่สำเร็จ กรุณาตรวจสอบว่าเป็นไฟล์ .xlsx ที่ถูกต้อง");
    } finally {
      setParsing(false);
    }
  }

  function updateRow(key: string, patch: Partial<ParsedRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  async function doImport() {
    const selected = rows.filter((r) => r.include && r.customer_name.trim());
    if (selected.length === 0) return;
    setImporting(true);
    setError("");
    const saved: Lead[] = [];
    try {
      for (const r of selected) {
        const res = await fetch("/api/admin/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lead_date: r.lead_date,
            customer_name: r.customer_name,
            channel: r.channel,
            segment: r.segment,
            status: r.status,
            notes: r.notes,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `บันทึก "${r.customer_name}" ไม่สำเร็จ`);
        saved.push(data.lead);
      }
      onImported(saved);
      reset();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "นำเข้าไม่สำเร็จ");
    } finally {
      setImporting(false);
    }
  }

  const includedCount = rows.filter((r) => r.include).length;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!importing) {
          onOpenChange(v);
          if (!v) reset();
        }
      }}
    >
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>นำเข้าลีดจาก Excel</DialogTitle>
        </DialogHeader>

        {rows.length === 0 ? (
          <div className="py-8">
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#E8E5E0] rounded-xl py-12 cursor-pointer hover:bg-[#FAF7F2] transition-colors">
              <UploadCloud size={28} className="text-[#9CA3AF]" />
              <span className="text-sm text-[#6B6B6B]">
                {parsing ? "กำลังอ่านไฟล์..." : "คลิกเพื่อเลือกไฟล์ .xlsx (เช่น facebook shopee line)"}
              </span>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                disabled={parsing}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
            </label>
            {error && <p className="text-xs text-red-600 mt-3 text-center">{error}</p>}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-[#6B6B6B]">
              จากไฟล์ <span className="font-medium">{fileName}</span> — พบ {rows.length} รายชื่อ, เลือกไว้ {includedCount} รายการ
              ตรวจสอบชื่อ/ช่องทาง/สถานะก่อนกดนำเข้า
            </p>
            <div className="max-h-[50vh] overflow-y-auto border border-[#E8E5E0] rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#FAF7F2]">
                    <TableHead className="w-8" />
                    <TableHead className="text-xs">ลูกค้า</TableHead>
                    <TableHead className="text-xs">Channel</TableHead>
                    <TableHead className="text-xs">Segment</TableHead>
                    <TableHead className="text-xs">สถานะเริ่มต้น</TableHead>
                    <TableHead className="text-xs">หมายเหตุ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.key} className={!r.include ? "opacity-40" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={r.include}
                          onCheckedChange={(v) => updateRow(r.key, { include: v === true })}
                        />
                      </TableCell>
                      <TableCell className="text-sm font-medium whitespace-nowrap">
                        {r.customer_name}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={r.channel}
                          onValueChange={(v) => updateRow(r.key, { channel: v as LeadChannel })}
                        >
                          <SelectTrigger size="sm" className="h-7 text-xs w-[110px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CHANNELS.map((c) => (
                              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={r.segment}
                          onValueChange={(v) => updateRow(r.key, { segment: v as LeadSegment })}
                        >
                          <SelectTrigger size="sm" className="h-7 text-xs w-[130px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {SEGMENTS.map((s) => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={r.status}
                          onValueChange={(v) => updateRow(r.key, { status: v as LeadStatus })}
                        >
                          <SelectTrigger size="sm" className="h-7 text-xs w-[160px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-xs text-[#6B6B6B] max-w-[220px] truncate" title={r.notes}>
                        {r.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        )}

        <DialogFooter>
          {rows.length > 0 && (
            <Button variant="outline" onClick={reset} disabled={importing}>
              เลือกไฟล์อื่น
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
            ยกเลิก
          </Button>
          {rows.length > 0 && (
            <Button onClick={doImport} disabled={importing || includedCount === 0}>
              {importing ? (
                <>
                  <Loader2 size={14} className="mr-1.5 animate-spin" /> กำลังนำเข้า...
                </>
              ) : (
                `นำเข้า ${includedCount} รายการ`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
