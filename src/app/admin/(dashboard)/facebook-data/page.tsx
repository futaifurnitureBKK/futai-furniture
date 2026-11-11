"use client";
import { useEffect, useMemo, useState } from "react";
import { RefreshCw, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer,
} from "recharts";
import { useLanguage } from "@/store/language";
import { DateRangePicker } from "@/components/admin/date-range-picker";
import type { MetaDailyInsight } from "@/lib/meta-ads";

function toLocalDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function todayStr() {
  return toLocalDateStr(new Date());
}
function daysAgoStr(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toLocalDateStr(d);
}

type QuickRangeKey = "yesterday" | "1d" | "7d" | "30d" | "month";
function computeQuickRange(key: QuickRangeKey): { from: string; to: string } {
  const to = todayStr();
  const end = new Date();
  if (key === "yesterday") {
    const y = daysAgoStr(1);
    return { from: y, to: y };
  }
  if (key === "1d") return { from: to, to };
  if (key === "7d") {
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    return { from: toLocalDateStr(start), to };
  }
  if (key === "30d") {
    const start = new Date(end);
    start.setDate(start.getDate() - 29);
    return { from: toLocalDateStr(start), to };
  }
  const first = new Date(end.getFullYear(), end.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth() + 1, 0);
  return { from: toLocalDateStr(first), to: toLocalDateStr(last) };
}

const baht = (n: number) => `฿${n.toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
const num = (n: number) => n.toLocaleString("th-TH", { maximumFractionDigits: 0 });

export default function FacebookDataPage() {
  const { t } = useLanguage();
  const initial = computeQuickRange("7d");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [rows, setRows] = useState<MetaDailyInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(signal: { cancelled: boolean }) {
    const res = await fetch(`/api/admin/facebook-ads?from=${from}&to=${to}`);
    const data = await res.json();
    if (signal.cancelled) return;
    if (!res.ok) throw new Error(data.error || "โหลดข้อมูลไม่สำเร็จ");
    setRows(data.rows ?? []);
  }

  useEffect(() => {
    const signal = { cancelled: false };
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await load(signal);
      } catch (err) {
        if (!signal.cancelled) {
          setError(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ");
          setRows([]);
        }
      } finally {
        if (!signal.cancelled) setLoading(false);
      }
    })();
    return () => {
      signal.cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const totals = useMemo(() => {
    const spend = rows.reduce((s, r) => s + r.spend, 0);
    const impressions = rows.reduce((s, r) => s + r.impressions, 0);
    const reach = rows.reduce((s, r) => s + r.reach, 0);
    const linkClicks = rows.reduce((s, r) => s + r.linkClicks, 0);
    const avgFrequency = rows.length ? rows.reduce((s, r) => s + r.frequency, 0) / rows.length : 0;
    const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
    const ctr = impressions > 0 ? (linkClicks / impressions) * 100 : 0;
    const cpc = linkClicks > 0 ? spend / linkClicks : 0;
    return { spend, impressions, reach, linkClicks, avgFrequency, cpm, ctr, cpc };
  }, [rows]);

  const cards = [
    { label: t("ค่าใช้จ่าย", "Spend", "花费"), value: baht(totals.spend) },
    { label: t("การแสดงผล", "Impressions", "展示"), value: num(totals.impressions) },
    { label: t("การเข้าถึง (รวมรายวัน)", "Reach (summed daily)", "覆盖（每日累加）"), value: num(totals.reach) },
    { label: t("ความถี่เฉลี่ย", "Avg. Frequency", "平均频次"), value: totals.avgFrequency.toFixed(2) },
    { label: "CPM", value: baht(totals.cpm) },
    { label: t("คลิกลิงก์", "Link Clicks", "链接点击"), value: num(totals.linkClicks) },
    { label: "CTR", value: `${totals.ctr.toFixed(2)}%` },
    { label: "CPC", value: baht(totals.cpc) },
  ];

  const quickRanges: [QuickRangeKey, string][] = [
    ["yesterday", t("เมื่อวาน", "Yesterday", "昨天")],
    ["1d", t("วันนี้", "Today", "今天")],
    ["7d", t("7 วัน", "7 days", "7天")],
    ["30d", t("30 วัน", "30 days", "30天")],
    ["month", t("เดือนนี้", "This month", "本月")],
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A] flex items-center gap-2">
            <TrendingUp size={22} className="text-[#C8102E]" />
            {t("ข้อมูลโฆษณา Facebook", "Facebook Ads Data", "Facebook广告数据")}
          </h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">
            {t("ดึงข้อมูลสดจาก Meta Marketing API (Spend, Impressions, Reach, CPM, Link Clicks, CTR, CPC)", "Live data from the Meta Marketing API", "来自 Meta Marketing API 的实时数据")}
          </p>
        </div>
        <button
          type="button"
          onClick={async () => {
            setLoading(true);
            setError(null);
            try {
              await load({ cancelled: false });
            } catch (err) {
              setError(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ");
              setRows([]);
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
          className="h-8 inline-flex items-center gap-1.5 rounded-lg border border-[#E8E5E0] bg-white px-3 text-xs text-[#1A1A1A] hover:border-[#C8102E]/40 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> {t("รีเฟรช", "Refresh", "刷新")}
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center rounded-lg border border-[#E8E5E0] bg-white p-0.5 gap-0.5">
          {quickRanges.map(([key, label]) => {
            const r = computeQuickRange(key);
            const active = from === r.from && to === r.to;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setFrom(r.from);
                  setTo(r.to);
                }}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                  active ? "bg-[#C8102E] text-white font-medium" : "text-[#6B6B6B] hover:bg-[#FAF7F2]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <DateRangePicker from={from} to={to} onChange={(f, tt) => { setFrom(f); setTo(tt); }} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs text-[#6B6B6B]">{c.label}</p>
            <p className="text-xl font-bold text-[#1A1A1A] mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-sm text-[#9CA3AF] text-center py-16">
            {loading ? t("กำลังโหลด...", "Loading...", "加载中...") : t("ไม่มีข้อมูลในช่วงนี้", "No data in this range", "此时间段无数据")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch">
          <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col">
            <p className="text-sm font-semibold text-[#1A1A1A] mb-4">{t("ค่าใช้จ่ายรายวัน", "Daily Spend", "每日花费")}</p>
            <div className="flex-1 min-h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ top: 20, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#E8E5E0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d: string) => d.slice(5).split("-").reverse().join("/")}
                    tick={{ fontSize: 10, fill: "#6B6B6B" }}
                    axisLine={{ stroke: "#E8E5E0" }}
                    tickLine={false}
                    interval={Math.max(0, Math.ceil(rows.length / 8) - 1)}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "#FAF7F2" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as MetaDailyInsight;
                      return (
                        <div className="bg-white shadow-lg rounded-lg px-3 py-2 text-xs border border-[#E8E5E0]">
                          <p className="font-semibold text-[#1A1A1A]">{d.date}</p>
                          <p className="text-[#6B6B6B]">{t("ค่าใช้จ่าย", "Spend", "花费")}: {baht(d.spend)}</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="spend" radius={[4, 4, 0, 0]} maxBarSize={28}>
                    {rows.map((d) => <Cell key={d.date} fill="#C8102E" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col">
            <p className="text-sm font-semibold text-[#1A1A1A] mb-4">{t("การแสดงผล / การเข้าถึง รายวัน", "Daily Impressions / Reach", "每日展示/覆盖")}</p>
            <div className="flex-1 min-h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rows} margin={{ top: 20, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#E8E5E0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d: string) => d.slice(5).split("-").reverse().join("/")}
                    tick={{ fontSize: 10, fill: "#6B6B6B" }}
                    axisLine={{ stroke: "#E8E5E0" }}
                    tickLine={false}
                    interval={Math.max(0, Math.ceil(rows.length / 8) - 1)}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ stroke: "#E8E5E0" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as MetaDailyInsight;
                      return (
                        <div className="bg-white shadow-lg rounded-lg px-3 py-2 text-xs border border-[#E8E5E0]">
                          <p className="font-semibold text-[#1A1A1A]">{d.date}</p>
                          <p className="text-[#C8102E]">{t("การแสดงผล", "Impressions", "展示")}: {num(d.impressions)}</p>
                          <p className="text-[#6B6B6B]">{t("การเข้าถึง", "Reach", "覆盖")}: {num(d.reach)}</p>
                        </div>
                      );
                    }}
                  />
                  <Line type="monotone" dataKey="impressions" stroke="#C8102E" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="reach" stroke="#9CA3AF" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col xl:col-span-2">
            <p className="text-sm font-semibold text-[#1A1A1A] mb-4">{t("CTR / CPC รายวัน", "Daily CTR / CPC", "每日点击率/单次点击成本")}</p>
            <div className="flex-1 min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rows} margin={{ top: 20, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#E8E5E0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d: string) => d.slice(5).split("-").reverse().join("/")}
                    tick={{ fontSize: 10, fill: "#6B6B6B" }}
                    axisLine={{ stroke: "#E8E5E0" }}
                    tickLine={false}
                    interval={Math.max(0, Math.ceil(rows.length / 8) - 1)}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ stroke: "#E8E5E0" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as MetaDailyInsight;
                      return (
                        <div className="bg-white shadow-lg rounded-lg px-3 py-2 text-xs border border-[#E8E5E0]">
                          <p className="font-semibold text-[#1A1A1A]">{d.date}</p>
                          <p className="text-[#C8102E]">CTR: {d.ctr.toFixed(2)}%</p>
                          <p className="text-[#6B6B6B]">CPC: {baht(d.cpc)}</p>
                        </div>
                      );
                    }}
                  />
                  <Line type="monotone" dataKey="ctr" stroke="#C8102E" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="cpc" stroke="#9CA3AF" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
