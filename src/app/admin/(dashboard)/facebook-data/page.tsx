"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  RefreshCw, TrendingUp, ChevronLeft, ChevronRight, Users, Check,
  Wallet, Eye, Radio, Repeat, BarChart3, MousePointerClick, Percent, Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer,
} from "recharts";
import { useLanguage } from "@/store/language";
import { DateRangePicker } from "@/components/admin/date-range-picker";
import { META_AD_ACCOUNTS, type MetaDailyInsight, type MetaCampaignInsight, type MetaPageOverview } from "@/lib/meta-ads";

interface AdSpendRow {
  date: string;
  owner: string;
  platform: string;
  amount: number;
}

// Both real Facebook Pages (Official and the secondary one) currently use
// the same FUTAI circle logo as their profile picture — cropped straight
// from a screenshot of each page's own header, not a generic placeholder.
const FB_PAGE_LOGO = "/fb-logo-futai.png";

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
function addDays(dateStr: string, delta: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + delta);
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

type Lang = "th" | "en" | "zh";
function fmtAxisDate(dateStr: string, lang: Lang): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  if (lang === "zh") return `${d.getMonth() + 1}月${d.getDate()}日`;
  if (lang === "en") return `${month}/${day}`;
  return `${day}/${month}`;
}
function fmtTooltipDate(dateStr: string, lang: Lang): string {
  const d = new Date(dateStr + "T00:00:00");
  if (lang === "zh") return d.toLocaleDateString("zh-CN", { day: "numeric", month: "long", year: "numeric" });
  if (lang === "en") return d.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" });
  return d.toLocaleDateString("th-TH-u-ca-gregory", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function FacebookDataPage() {
  const { t, lang } = useLanguage();
  const initial = computeQuickRange("7d");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [accountId, setAccountId] = useState<string>(META_AD_ACCOUNTS[0].id);
  const [rows, setRows] = useState<MetaDailyInsight[]>([]);
  const [campaigns, setCampaigns] = useState<MetaCampaignInsight[]>([]);
  const [adSpendRows, setAdSpendRows] = useState<AdSpendRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageOverview, setPageOverview] = useState<MetaPageOverview | null>(null);

  // Page follower snapshot — independent of the date range above, so it
  // loads once rather than refetching on every from/to/account change.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/facebook-page")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (!cancelled && data) setPageOverview(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  async function load(signal: { cancelled: boolean }) {
    const [res, adSpendRes] = await Promise.all([
      fetch(`/api/admin/facebook-ads?from=${from}&to=${to}&account=${accountId}`),
      fetch(`/api/admin/ad-spend?from=${from}&to=${to}`),
    ]);
    const data = await res.json();
    if (signal.cancelled) return;
    if (!res.ok) throw new Error(data.error || "โหลดข้อมูลไม่สำเร็จ");
    setRows(data.rows ?? []);
    setCampaigns(data.campaigns ?? []);
    if (adSpendRes.ok) {
      const adSpendData = await adSpendRes.json();
      if (!signal.cancelled) setAdSpendRows(adSpendData.rows ?? []);
    }
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
          setCampaigns([]);
          setAdSpendRows([]);
        }
      } finally {
        if (!signal.cancelled) setLoading(false);
      }
    })();
    return () => {
      signal.cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, accountId]);

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

  // Meta omits a day entirely from the API response when it had zero
  // delivery, instead of returning a zeroed row — without filling that gap
  // back in, the chart's x-axis silently skips the date (e.g. 14/11 jumping
  // straight to 16/11) and its rightmost label can read as a different day.
  const chartRows = useMemo(() => {
    const byDate = new Map(rows.map((r) => [r.date, r]));
    const result: MetaDailyInsight[] = [];
    const end = new Date(to + "T00:00:00");
    for (let d = new Date(from + "T00:00:00"); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = toLocalDateStr(d);
      result.push(
        byDate.get(dateStr) ?? {
          date: dateStr, spend: 0, impressions: 0, reach: 0, frequency: 0, cpm: 0, linkClicks: 0, ctr: 0, cpc: 0,
        }
      );
    }
    return result;
  }, [rows, from, to]);

  // Manually-logged ad spend (ad_spend table, same data entered per-owner on
  // the KPI page) — kept separate from totals.spend above, which is the real
  // billed amount pulled live from Meta. Facebook only, since this page is
  // specifically about Facebook ads.
  const manualAdSpend = useMemo(() => {
    const fbRows = adSpendRows.filter((r) => r.platform === "facebook");
    const total = fbRows.reduce((s, r) => s + r.amount, 0);
    const byOwner = new Map<string, number>();
    for (const r of fbRows) {
      byOwner.set(r.owner, (byOwner.get(r.owner) ?? 0) + r.amount);
    }
    return {
      total,
      byOwner: [...byOwner.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [adSpendRows]);

  const cards = [
    { label: t("ค่าใช้จ่าย", "Spend", "花费"), value: baht(totals.spend), icon: Wallet, featured: true },
    { label: t("การแสดงผล", "Impressions", "展示"), value: num(totals.impressions), icon: Eye },
    { label: t("การเข้าถึง (รวมรายวัน)", "Reach (summed daily)", "覆盖（每日累加）"), value: num(totals.reach), icon: Radio },
    { label: t("ความถี่เฉลี่ย", "Avg. Frequency", "平均频次"), value: totals.avgFrequency.toFixed(2), icon: Repeat },
    { label: t("CPM (ต้นทุนต่อการแสดงผล 1,000 ครั้ง)", "CPM (cost per 1,000 impressions)", "CPM（千次展示成本）"), value: baht(totals.cpm), icon: BarChart3 },
    { label: t("คลิกลิงก์", "Link Clicks", "链接点击"), value: num(totals.linkClicks), icon: MousePointerClick },
    { label: t("CTR (อัตราการคลิก)", "CTR (click-through rate)", "CTR（点击率）"), value: `${totals.ctr.toFixed(2)}%`, icon: Percent },
    { label: t("CPC (ต้นทุนต่อคลิก)", "CPC (cost per click)", "CPC（单次点击成本）"), value: baht(totals.cpc), icon: Coins },
  ];

  const quickRanges: [QuickRangeKey, string][] = [
    ["yesterday", t("เมื่อวาน", "Yesterday", "昨天")],
    ["1d", t("วันนี้", "Today", "今天")],
    ["7d", t("7 วัน", "7 days", "7天")],
    ["30d", t("30 วัน", "30 days", "30天")],
    ["month", t("เดือนนี้", "This month", "本月")],
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1A1A1A] flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#C8102E]/10 text-[#C8102E]">
              <TrendingUp size={18} />
            </span>
            {t("ข้อมูลโฆษณา Facebook", "Facebook Ads Data", "Facebook广告数据")}
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-1 sm:ml-11">
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
              setCampaigns([]);
              setAdSpendRows([]);
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
          className="h-9 inline-flex items-center gap-2 rounded-xl border border-[#E8E5E0] bg-white px-3.5 text-xs font-medium text-[#1A1A1A] shadow-xs hover:border-[#C8102E]/50 hover:text-[#C8102E] transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> {t("รีเฟรชข้อมูล", "Refresh", "刷新")}
        </button>
      </div>

      {/* Facebook account switcher — a card per real ad account instead of a plain dropdown */}
      <section className="bg-white rounded-2xl border border-[#E8E5E0] shadow-xs p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6B6B6B] flex items-center gap-2">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#1877F2] text-white shrink-0">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5"><path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v2.1H7.7v3h2.5V21h3.3z" /></svg>
            </span>
            {t("เลือกบัญชีโฆษณา / เพจ Facebook", "Select ad account / Facebook Page", "选择广告账户 / Facebook主页")}
          </p>
          <span className="text-[11px] text-[#9CA3AF]">
            {t(`${META_AD_ACCOUNTS.length} บัญชีที่เชื่อมต่อ`, `${META_AD_ACCOUNTS.length} connected`, `已连接 ${META_AD_ACCOUNTS.length} 个账户`)}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {META_AD_ACCOUNTS.map((a) => {
            const selected = a.id === accountId;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setAccountId(a.id)}
                className={`group relative flex items-center gap-3.5 rounded-xl p-3.5 text-left border transition-all ${
                  selected
                    ? "border-[#C8102E] bg-[#C8102E]/5 ring-2 ring-[#C8102E]/15 shadow-xs"
                    : "border-[#E8E5E0] bg-[#FAF7F2] hover:bg-white hover:border-[#D4CFC7]"
                }`}
              >
                <div className="relative shrink-0">
                  <div className="h-11 w-11 rounded-full overflow-hidden ring-2 ring-white shadow-xs">
                    <Image src={FB_PAGE_LOGO} alt="" width={44} height={44} className="h-full w-full object-cover" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#1877F2] text-white ring-2 ring-white shadow-xs">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5"><path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v2.1H7.7v3h2.5V21h3.3z" /></svg>
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold truncate ${selected ? "text-[#C8102E]" : "text-[#1A1A1A]"}`}>{t(a.labelTh, a.labelEn, a.labelEn)}</p>
                  <p className="text-[10px] font-mono text-[#9CA3AF] mt-0.5 truncate">{a.id}</p>
                </div>
                <div
                  className={`shrink-0 h-5 w-5 rounded-full flex items-center justify-center transition-colors ${
                    selected ? "bg-[#C8102E] text-white" : "border border-[#D4CFC7] bg-white group-hover:border-zinc-400"
                  }`}
                >
                  {selected && <Check size={12} strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>
      </section>

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
        <div className="flex items-center gap-1 bg-white rounded-lg border border-[#E8E5E0] p-1">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => { setFrom((f) => addDays(f, -1)); setTo((tt) => addDays(tt, -1)); }}
            aria-label={t("ย้อนกลับ 1 วัน", "Back 1 day", "后退1天")}
          >
            <ChevronLeft size={15} />
          </Button>
          <DateRangePicker
            from={from}
            to={to}
            onChange={(f, tt) => { setFrom(f); setTo(tt); }}
            className="h-7 border-0 hover:border-0 px-1.5"
          />
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => { setFrom((f) => addDays(f, 1)); setTo((tt) => addDays(tt, 1)); }}
            aria-label={t("ไปข้างหน้า 1 วัน", "Forward 1 day", "前进1天")}
          >
            <ChevronRight size={15} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className={`rounded-2xl p-4 border transition-shadow hover:shadow-sm ${
                c.featured
                  ? "bg-gradient-to-br from-[#C8102E] to-[#9E0B22] text-white border-[#C8102E] shadow-sm"
                  : "bg-white text-[#1A1A1A] border-[#E8E5E0] shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className={`text-xs font-medium truncate ${c.featured ? "text-white/85" : "text-[#6B6B6B]"}`}>{c.label}</p>
                <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${c.featured ? "bg-white/15 text-white" : "bg-[#FAF7F2] text-[#6B6B6B]"}`}>
                  <Icon size={14} />
                </span>
              </div>
              <p className="text-xl font-bold mt-2 tracking-tight">{c.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {pageOverview && (
          <div className="bg-white rounded-2xl shadow-xs border border-[#E8E5E0] p-5">
            <p className="text-sm font-semibold text-[#1A1A1A] mb-1 flex items-center gap-1.5">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-[#C8102E]/10 text-[#C8102E]">
                <Users size={13} />
              </span>
              {t("ภาพรวมเพจ", "Page Overview", "主页概览")} — {pageOverview.pageName}
            </p>
            <p className="text-xs text-[#9CA3AF] mb-4">
              {t(
                "ตัวเลขปัจจุบัน ไม่ใช่รายวัน — Meta เลิกให้ดึงข้อมูลเชิงลึกของเพจแบบรายวัน (ยอดเข้าชม/การเข้าถึง) ผ่าน API แล้ว",
                "Current snapshot, not a daily history — Meta has retired daily Page Insights (views/reach) from the API",
                "当前快照数据，非每日趋势 — Meta 已从 API 中下线按日统计的主页洞察数据（浏览量/覆盖人数）"
              )}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#FAF7F2] border border-[#E8E5E0] px-4 py-3 flex items-center gap-3">
                <span className="h-9 w-9 rounded-lg bg-[#1877F2]/10 text-[#1877F2] flex items-center justify-center shrink-0">
                  <Users size={16} />
                </span>
                <div>
                  <p className="text-[11px] text-[#6B6B6B]">{t("ผู้ติดตาม", "Followers", "粉丝数")}</p>
                  <p className="text-lg font-bold text-[#1A1A1A]">{num(pageOverview.followers)}</p>
                </div>
              </div>
              <div className="rounded-xl bg-[#FAF7F2] border border-[#E8E5E0] px-4 py-3 flex items-center gap-3">
                <span className="h-9 w-9 rounded-lg bg-[#C8102E]/10 text-[#C8102E] flex items-center justify-center shrink-0">
                  <TrendingUp size={16} />
                </span>
                <div>
                  <p className="text-[11px] text-[#6B6B6B]">{t("คนพูดถึง", "Talking About", "谈论人数")}</p>
                  <p className="text-lg font-bold text-[#1A1A1A]">{num(pageOverview.talkingAbout)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {manualAdSpend.byOwner.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xs border border-[#E8E5E0] p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[#1A1A1A]">{t("ค่ายิง Ads ที่บันทึกเอง (แยกตามคน)", "Logged Ad Spend (by owner)", "手动记录的广告费（按负责人）")}</p>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#1A1A1A] px-3 py-1 text-xs text-white font-semibold shrink-0">
                {t("รวม", "Total", "合计")} {baht(manualAdSpend.total)}
              </span>
            </div>
            <p className="text-xs text-[#9CA3AF] mt-1 mb-4">
              {t(
                "มาจากตารางค่ายิง Ads ในหน้า KPI ไม่ใช่ตัวเลขจาก Meta โดยตรง — ใช้เทียบ/ตรวจสอบกับค่าใช้จ่ายจริงด้านบน",
                "From the Ad Spend table on the KPI page, not pulled from Meta directly — use it to cross-check against the real Spend figure above",
                "来自 KPI 页面的广告费记录表，并非直接来自 Meta——可与上方的实际花费对照核对"
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              {manualAdSpend.byOwner.map(([owner, amount]) => (
                <span key={owner} className="inline-flex items-center gap-2 rounded-xl bg-[#FAF7F2] border border-[#E8E5E0] px-3 py-2 text-xs">
                  <span className="h-5 w-5 rounded-full bg-[#E8E5E0] text-[#1A1A1A] font-semibold text-[10px] flex items-center justify-center shrink-0">
                    {owner.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="text-[#6B6B6B]">{owner}</span>
                  <span className="font-bold text-[#1A1A1A]">{baht(amount)}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-xs border border-[#E8E5E0] p-5">
          <p className="text-sm text-[#9CA3AF] text-center py-16">
            {loading ? t("กำลังโหลด...", "Loading...", "加载中...") : t("ไม่มีข้อมูลในช่วงนี้", "No data in this range", "此时间段无数据")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch">
          <div className="bg-white rounded-2xl shadow-xs border border-[#E8E5E0] p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-[#1A1A1A]">{t("ค่าใช้จ่ายรายวัน", "Daily Spend", "每日花费")}</p>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-[#6B6B6B]">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#C8102E]" />
                {t("ค่าใช้จ่าย (฿)", "Spend (฿)", "花费（฿）")}
              </span>
            </div>
            <div className="flex-1 min-h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartRows} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#E8E5E0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d: string) => fmtAxisDate(d, lang)}
                    tick={{ fontSize: 10, fill: "#6B6B6B" }}
                    axisLine={{ stroke: "#E8E5E0" }}
                    tickLine={false}
                    interval={Math.max(0, Math.ceil(chartRows.length / 8) - 1)}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "#FAF7F2" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as MetaDailyInsight;
                      return (
                        <div className="bg-white shadow-lg rounded-lg px-3 py-2 text-xs border border-[#E8E5E0]">
                          <p className="font-semibold text-[#1A1A1A]">{fmtTooltipDate(d.date, lang)}</p>
                          <p className="text-[#6B6B6B]">{t("ค่าใช้จ่าย", "Spend", "花费")}: {baht(d.spend)}</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="spend" radius={[4, 4, 0, 0]} maxBarSize={28}>
                    {chartRows.map((d) => <Cell key={d.date} fill="#C8102E" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xs border border-[#E8E5E0] p-5 flex flex-col">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <p className="text-sm font-semibold text-[#1A1A1A]">{t("การแสดงผล / การเข้าถึง รายวัน", "Daily Impressions / Reach", "每日展示/覆盖")}</p>
              <div className="flex items-center gap-3 text-[11px] text-[#6B6B6B]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#C8102E]" />
                  {t("การแสดงผล", "Impressions", "展示")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#1877F2]" />
                  {t("การเข้าถึง", "Reach", "覆盖")}
                </span>
              </div>
            </div>
            <div className="flex-1 min-h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartRows} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#E8E5E0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d: string) => fmtAxisDate(d, lang)}
                    tick={{ fontSize: 10, fill: "#6B6B6B" }}
                    axisLine={{ stroke: "#E8E5E0" }}
                    tickLine={false}
                    interval={Math.max(0, Math.ceil(chartRows.length / 8) - 1)}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ stroke: "#E8E5E0" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as MetaDailyInsight;
                      return (
                        <div className="bg-white shadow-lg rounded-lg px-3 py-2 text-xs border border-[#E8E5E0]">
                          <p className="font-semibold text-[#1A1A1A]">{fmtTooltipDate(d.date, lang)}</p>
                          <p className="text-[#C8102E]">{t("การแสดงผล", "Impressions", "展示")}: {num(d.impressions)}</p>
                          <p className="text-[#1877F2]">{t("การเข้าถึง", "Reach", "覆盖")}: {num(d.reach)}</p>
                        </div>
                      );
                    }}
                  />
                  <Line type="monotone" dataKey="impressions" stroke="#C8102E" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="reach" stroke="#1877F2" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xs border border-[#E8E5E0] p-5 flex flex-col xl:col-span-2">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <p className="text-sm font-semibold text-[#1A1A1A]">{t("CTR / CPC รายวัน", "Daily CTR / CPC", "每日点击率/单次点击成本")}</p>
              <div className="flex items-center gap-3 text-[11px] text-[#6B6B6B]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#C8102E]" />
                  {t("CTR (%) — แกนซ้าย", "CTR (%) — left axis", "点击率 (%) — 左轴")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#6B6B6B]" />
                  {t("CPC (฿) — แกนขวา", "CPC (฿) — right axis", "单次点击成本 (฿) — 右轴")}
                </span>
              </div>
            </div>
            <div className="flex-1 min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartRows} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#E8E5E0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d: string) => fmtAxisDate(d, lang)}
                    tick={{ fontSize: 10, fill: "#6B6B6B" }}
                    axisLine={{ stroke: "#E8E5E0" }}
                    tickLine={false}
                    interval={Math.max(0, Math.ceil(chartRows.length / 8) - 1)}
                  />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#C8102E" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#6B6B6B" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => baht(v)} />
                  <Tooltip
                    cursor={{ stroke: "#E8E5E0" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as MetaDailyInsight;
                      return (
                        <div className="bg-white shadow-lg rounded-lg px-3 py-2 text-xs border border-[#E8E5E0]">
                          <p className="font-semibold text-[#1A1A1A]">{fmtTooltipDate(d.date, lang)}</p>
                          <p className="text-[#C8102E]">CTR: {d.ctr.toFixed(2)}%</p>
                          <p className="text-[#6B6B6B]">CPC: {baht(d.cpc)}</p>
                        </div>
                      );
                    }}
                  />
                  <Line yAxisId="left" type="monotone" dataKey="ctr" stroke="#C8102E" strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="cpc" stroke="#6B6B6B" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {campaigns.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xs border border-[#E8E5E0] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-[#1A1A1A]">
              {t("ค่าใช้จ่ายแยกตามแคมเปญ", "Spend by Campaign", "按广告系列划分的花费")}
            </p>
            <span className="text-xs text-[#9CA3AF]">{t(`${campaigns.length} แคมเปญ`, `${campaigns.length} campaigns`, `${campaigns.length} 个广告系列`)}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-[#E8E5E0] text-left text-xs text-[#6B6B6B]">
                  <th className="py-2.5 pr-3 font-medium">{t("แคมเปญ", "Campaign", "广告系列")}</th>
                  <th className="py-2.5 px-3 font-medium text-right">{t("ค่าใช้จ่าย", "Spend", "花费")}</th>
                  <th className="py-2.5 px-3 font-medium text-right">% {t("ของยอดรวม", "of total", "占总额")}</th>
                  <th className="py-2.5 px-3 font-medium text-right">CTR</th>
                  <th className="py-2.5 pl-3 font-medium text-right">CPC</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const pct = totals.spend > 0 ? (c.spend / totals.spend) * 100 : 0;
                  return (
                    <tr key={c.campaignName} className="border-b border-[#F0EDE6] last:border-0 hover:bg-[#FAF7F2]/60 transition-colors">
                      <td className="py-2.5 pr-3 text-[#1A1A1A]">{c.campaignName}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-[#1A1A1A]">{baht(c.spend)}</td>
                      <td className="py-2.5 px-3 text-right text-[#6B6B6B]">
                        <span className="inline-flex items-center justify-end gap-2">
                          <span className="hidden sm:block w-16 h-1.5 rounded-full bg-[#F0EDE6] overflow-hidden">
                            <span className="block h-full bg-[#C8102E] rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
                          </span>
                          {pct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-[#6B6B6B]">{c.ctr.toFixed(2)}%</td>
                      <td className="py-2.5 pl-3 text-right text-[#6B6B6B]">{baht(c.cpc)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
