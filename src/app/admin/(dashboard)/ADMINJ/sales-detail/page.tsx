"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/store/language";
import { CHANNELS } from "@/lib/lead-options";
import { fmtMoney } from "@/lib/saved-quote-options";
import type { Lead } from "@/types";

const NO_OWNER = "__none";

function channelLabel(channel: string, t: (th: string, en: string, zh: string) => string) {
  const meta = CHANNELS.find((c) => c.value === channel);
  return meta ? t(meta.th, meta.en, meta.zh) : channel;
}

// A plain, printable breakdown of exactly which converted leads make up one
// owner's (or everyone's) revenue total on the ADMINJ sales summary — opened
// in its own tab from that table's ฿ figure, so "what's actually in this
// number" is always one click + Ctrl/Cmd-P (save as PDF) away.
function SalesDetailInner() {
  const { t } = useLanguage();
  const params = useSearchParams();
  const owner = params.get("owner") || "all";
  const from = params.get("from") || "";
  const to = params.get("to") || "";

  const [leads, setLeads] = useState<Lead[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/admin/leads");
      const data = await res.json();
      if (!cancelled && res.ok) setLeads(data.leads);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (leads === null) {
    return (
      <div className="py-16 text-center text-sm text-[#6B6B6B]">
        <Loader2 size={20} className="mx-auto mb-2 animate-spin" />
        {t("กำลังโหลด...", "Loading...", "加载中...")}
      </div>
    );
  }

  const rows = leads
    .filter((l) => l.status === "converted")
    .filter((l) => !from || !to || (l.lead_date >= from && l.lead_date <= to))
    .filter((l) => owner === "all" || (owner === NO_OWNER ? !l.owner : l.owner === owner))
    .sort((a, b) => (a.converted_at || a.lead_date).localeCompare(b.converted_at || b.lead_date));

  const total = rows.reduce((sum, l) => sum + (l.deal_value ?? 0), 0);
  const ownerLabel = owner === "all" ? t("ทุกคน", "Everyone", "全部") : owner === NO_OWNER ? t("ยังไม่ระบุ", "Not set", "未设置") : owner;
  const rangeLabel = from && to ? (from === to ? from : `${from} → ${to}`) : t("ทั้งหมด", "All time", "全部时间");

  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          @page { margin: 12mm; }
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; top: 0; left: 0; width: 100%; margin: 0; }
          .no-print { display: none !important; }
          #print-area tr { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <div className="flex items-center justify-between gap-3 no-print">
        <div>
          <h1 className="text-xl font-bold text-[#1A1A1A]">{t("รายละเอียดยอดขาย", "Sales Detail", "销售额明细")}</h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">{ownerLabel} · {rangeLabel}</p>
        </div>
        <Button onClick={() => window.print()}>
          <Printer size={15} className="mr-1.5" /> {t("พิมพ์ / บันทึก PDF", "Print / Save as PDF", "打印/另存为PDF")}
        </Button>
      </div>

      <div id="print-area" className="bg-white rounded-xl shadow-sm p-6">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-[#1A1A1A]">{t("รายละเอียดยอดขาย", "Sales Detail", "销售额明细")}</h2>
          <p className="text-sm text-[#6B6B6B]">
            {t("ผู้ดูแล", "Owner", "负责人")}: {ownerLabel} &nbsp;·&nbsp; {t("ช่วงวันที่", "Date range", "日期范围")}: {rangeLabel}
          </p>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-[#9CA3AF] text-center py-10">{t("ไม่มีรายการ", "No entries", "没有记录")}</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[#6B6B6B] border-b border-[#1A1A1A]">
                <th className="py-1.5 pr-2 w-8">#</th>
                <th className="py-1.5 pr-2">{t("วันที่ปิดการขาย", "Closed date", "成交日期")}</th>
                <th className="py-1.5 pr-2">{t("ลูกค้า", "Customer", "客户")}</th>
                <th className="py-1.5 pr-2">{t("ช่องทาง", "Channel", "渠道")}</th>
                {owner === "all" && <th className="py-1.5 pr-2">{t("ผู้ดูแล", "Owner", "负责人")}</th>}
                <th className="py-1.5 pl-2 text-right">{t("มูลค่า ฿", "Value ฿", "金额 ฿")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l, i) => (
                <tr key={l.id} className="border-b border-[#F0EDE6]">
                  <td className="py-1.5 pr-2 text-[#9CA3AF]">{i + 1}</td>
                  <td className="py-1.5 pr-2">{(l.converted_at || l.lead_date).slice(0, 10)}</td>
                  <td className="py-1.5 pr-2">{l.customer_name}</td>
                  <td className="py-1.5 pr-2">{channelLabel(l.channel, t)}</td>
                  {owner === "all" && <td className="py-1.5 pr-2">{l.owner || t("ยังไม่ระบุ", "Not set", "未设置")}</td>}
                  <td className="py-1.5 pl-2 text-right font-medium">{fmtMoney(l.deal_value ?? 0)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold border-t-2 border-[#1A1A1A]">
                <td className="py-2" colSpan={owner === "all" ? 4 : 3} />
                <td className="py-2 pr-2 text-right">{t("รวม", "Total", "合计")}</td>
                <td className="py-2 pl-2 text-right">฿{fmtMoney(total)}</td>
              </tr>
            </tfoot>
          </table>
        )}

        <p className="text-[10px] text-[#9CA3AF] mt-4">
          {t(`${rows.length} รายการ · พิมพ์เมื่อ ${new Date().toLocaleString("th-TH")}`,
            `${rows.length} entries · generated ${new Date().toLocaleString("th-TH")}`,
            `${rows.length} 条记录 · 生成于 ${new Date().toLocaleString("th-TH")}`)}
        </p>
      </div>
    </div>
  );
}

export default function SalesDetailPage() {
  return (
    <Suspense fallback={null}>
      <SalesDetailInner />
    </Suspense>
  );
}
