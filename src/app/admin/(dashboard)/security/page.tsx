"use client";
import { useEffect, useMemo, useState, FormEvent } from "react";
import { Loader2, Lock, ShieldAlert, ShieldCheck, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useLanguage } from "@/store/language";
import { SALESPEOPLE } from "@/lib/saved-quote-options";
import type { Lead } from "@/types";

interface Login {
  id: number;
  ip: string;
  name: string;
  user_agent: string;
  created_at: string;
}
interface Attempt {
  ip: string;
  attempts: number;
  first_attempt_at: string;
  locked_until: string | null;
}

const CODE_KEY = "futai-security-code";
const NO_OWNER = "__none";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoStr(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

type RangeKey = "1D" | "5D" | "1M" | "5M" | "ALL";
const RANGES: { key: RangeKey; days: number | null }[] = [
  { key: "1D", days: 1 },
  { key: "5D", days: 5 },
  { key: "1M", days: 30 },
  { key: "5M", days: 150 },
  { key: "ALL", days: null },
];

// Trims a raw User-Agent string down to "Browser · OS" for a quick read —
// this is an internal security log, not a full device-detection feature.
function briefUA(ua: string): string {
  if (!ua) return "-";
  const os = ua.match(/Windows|Macintosh|Android|iPhone|iPad|Linux/)?.[0] ?? "";
  const browser =
    ua.match(/Edg\/[\d.]+/)?.[0].replace("Edg/", "Edge ") ??
    ua.match(/Chrome\/[\d.]+/)?.[0].replace("Chrome/", "Chrome ") ??
    ua.match(/Firefox\/[\d.]+/)?.[0].replace("Firefox/", "Firefox ") ??
    ua.match(/Version\/[\d.]+.*Safari/)?.[0].replace(/Version\/([\d.]+).*/, "Safari $1") ??
    "";
  return [browser, os].filter(Boolean).join(" · ") || ua.slice(0, 40);
}

export default function SecurityPage() {
  const { t } = useLanguage();
  const [unlocked, setUnlocked] = useState(false);
  const [checkingStoredCode, setCheckingStoredCode] = useState(true);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  const [logins, setLogins] = useState<Login[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState(0);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [range, setRange] = useState<RangeKey>("1M");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  async function load(code: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/logins", { headers: { "x-security-code": code } });
      const data = await res.json();
      if (res.ok) {
        setLogins(data.logins);
        setAttempts(data.attempts);
        setLoadedAt(Date.now());
        return true;
      }
      if (res.status === 403) {
        setCodeError(data.error || t("รหัสไม่ถูกต้อง", "Wrong code", "代码错误"));
      } else {
        setError(data.error || "Load failed");
      }
      return false;
    } catch {
      setError("Network error");
      return false;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let stored = "";
      try {
        stored = sessionStorage.getItem(CODE_KEY) ?? "";
      } catch {
        // private mode / storage blocked — just show the code prompt
      }
      if (stored) {
        const ok = await load(stored);
        if (!cancelled && ok) setUnlocked(true);
      }
      if (!cancelled) setCheckingStoredCode(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUnlock(e: FormEvent) {
    e.preventDefault();
    setUnlocking(true);
    setCodeError("");
    const ok = await load(codeInput);
    setUnlocking(false);
    if (ok) {
      setUnlocked(true);
      try {
        sessionStorage.setItem(CODE_KEY, codeInput);
      } catch {
        // ignore — just means it'll ask again next time
      }
    }
  }

  // Sales-by-owner is only fetched once this page's own extra code has been
  // entered — it sits behind the same gate as the login log, same as on /admin/kpi.
  useEffect(() => {
    if (!unlocked) return;
    let cancelled = false;
    (async () => {
      setLeadsLoading(true);
      const res = await fetch("/api/admin/leads");
      const data = await res.json();
      if (!cancelled && res.ok) setLeads(data.leads);
      setLeadsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [unlocked]);

  const rangeStart = useMemo(() => {
    const days = RANGES.find((r) => r.key === range)?.days;
    if (days != null) return daysAgoStr(days - 1);
    const earliest = leads.reduce((min, l) => (l.lead_date < min ? l.lead_date : min), todayStr());
    return earliest;
  }, [range, leads]);

  const rangeLeads = useMemo(
    () =>
      leads.filter((l) =>
        selectedDate ? l.lead_date === selectedDate : l.lead_date >= rangeStart && l.lead_date <= todayStr()
      ),
    [leads, selectedDate, rangeStart]
  );

  const ownerSalesSummary = useMemo(() => {
    const legacy = [...new Set(leads.map((l) => l.owner).filter((o): o is string => !!o && !SALESPEOPLE.includes(o)))];
    const names = [...SALESPEOPLE, ...legacy, NO_OWNER];
    return names.map((name) => {
      const rows = rangeLeads.filter((l) => (name === NO_OWNER ? !l.owner : l.owner === name));
      const converted = rows.filter((l) => l.status === "converted");
      const revenue = converted.reduce((sum, l) => sum + (l.deal_value ?? 0), 0);
      return {
        name,
        count: rows.length,
        converted: converted.length,
        rate: rows.length ? (converted.length / rows.length) * 100 : 0,
        revenue,
      };
    });
  }, [rangeLeads, leads]);

  const scopeLabel = selectedDate ?? `${rangeStart} → ${todayStr()}`;

  if (checkingStoredCode) {
    return (
      <div className="bg-white rounded-xl shadow-sm py-16 text-center text-sm text-[#6B6B6B]">
        <Loader2 size={20} className="mx-auto mb-2 animate-spin" />
        {t("กำลังโหลด...", "Loading...", "加载中...")}
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="max-w-sm mx-auto mt-16 bg-white rounded-xl shadow-sm p-6 text-center space-y-3">
        <Lock size={24} className="mx-auto text-[#9CA3AF]" />
        <p className="text-sm font-semibold text-[#1A1A1A]">
          {t("หน้านี้ต้องใส่รหัสเพิ่มเติม", "This page needs an extra code", "此页面需要额外的密码")}
        </p>
        <form onSubmit={handleUnlock} className="space-y-2">
          <Input
            type="password"
            autoFocus
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder={t("รหัส", "Code", "密码")}
          />
          {codeError && <p className="text-xs text-red-600">{codeError}</p>}
          <Button type="submit" className="w-full" disabled={unlocking || !codeInput}>
            {unlocking ? t("กำลังตรวจสอบ...", "Checking...", "验证中...") : t("เข้าดู", "Unlock", "解锁")}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A1A]">{t("ประวัติเข้าระบบแอดมิน", "Admin Login Log", "管理员登录记录")}</h1>
        <p className="text-sm text-[#6B6B6B] mt-0.5">
          {t(
            "รายการ IP ที่ล็อกอินเข้า /admin สำเร็จ และ IP ที่พยายามล็อกอินผิดพลาด/ถูกบล็อกชั่วคราว",
            "IP addresses that successfully logged into /admin, plus IPs with failed attempts or a temporary lockout",
            "成功登录 /admin 的IP地址，以及登录失败或被暂时锁定的IP"
          )}
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm py-16 text-center text-sm text-[#6B6B6B]">
          <Loader2 size={20} className="mx-auto mb-2 animate-spin" />
          {t("กำลังโหลด...", "Loading...", "加载中...")}
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl shadow-sm p-6 text-sm text-red-600">{error}</div>
      ) : (
        <>
          {attempts.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-[#E8E5E0] flex items-center gap-2">
                <ShieldAlert size={16} className="text-amber-600" />
                <p className="text-sm font-semibold text-[#1A1A1A]">
                  {t("IP ที่เข้ารหัสผิด / ถูกบล็อกชั่วคราว", "IPs with failed attempts / temporarily locked", "密码错误 / 暂时被锁定的IP")}
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#FAF7F2]">
                    <TableHead className="text-xs">IP</TableHead>
                    <TableHead className="text-xs">{t("ครั้งที่ผิด", "Failed attempts", "失败次数")}</TableHead>
                    <TableHead className="text-xs">{t("ครั้งแรกเมื่อ", "First attempt", "首次尝试")}</TableHead>
                    <TableHead className="text-xs">{t("สถานะ", "Status", "状态")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attempts.map((a) => {
                    const locked = !!a.locked_until && new Date(a.locked_until).getTime() > loadedAt;
                    return (
                      <TableRow key={a.ip}>
                        <TableCell className="text-sm font-mono">{a.ip}</TableCell>
                        <TableCell className="text-sm">{a.attempts}</TableCell>
                        <TableCell className="text-xs text-[#6B6B6B]">{new Date(a.first_attempt_at).toLocaleString("th-TH")}</TableCell>
                        <TableCell>
                          {locked ? (
                            <span className="text-xs font-medium px-2 py-1 rounded bg-red-100 text-red-700">
                              {t("ถูกบล็อกถึง", "Locked until", "锁定至")} {new Date(a.locked_until as string).toLocaleTimeString("th-TH")}
                            </span>
                          ) : (
                            <span className="text-xs font-medium px-2 py-1 rounded bg-[#E8E5E0] text-[#6B6B6B]">
                              {t("ปล่อยแล้ว", "Not locked", "未锁定")}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-[#E8E5E0] flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-600" />
              <p className="text-sm font-semibold text-[#1A1A1A]">
                {t("ล็อกอินสำเร็จ (200 ครั้งล่าสุด)", "Successful logins (last 200)", "成功登录（最近200条）")}
              </p>
            </div>
            {logins.length === 0 ? (
              <p className="text-sm text-[#9CA3AF] text-center py-10">{t("ยังไม่มีข้อมูล", "No data yet", "暂无数据")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#FAF7F2]">
                    <TableHead className="text-xs">{t("วันที่ / เวลา", "Date / Time", "日期/时间")}</TableHead>
                    <TableHead className="text-xs">{t("ชื่อ", "Name", "姓名")}</TableHead>
                    <TableHead className="text-xs">IP</TableHead>
                    <TableHead className="text-xs">{t("อุปกรณ์ / เบราว์เซอร์", "Device / Browser", "设备/浏览器")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logins.map((l) => (
                    <TableRow key={l.id} className="hover:bg-[#FAF7F2]/50">
                      <TableCell className="text-xs text-[#6B6B6B]">{new Date(l.created_at).toLocaleString("th-TH")}</TableCell>
                      <TableCell className="text-sm font-medium text-[#1A1A1A]">
                        {l.name || <span className="text-[#9CA3AF] font-normal">{t("ไม่ระบุ", "Not given", "未填写")}</span>}
                      </TableCell>
                      <TableCell className="text-sm font-mono">{l.ip}</TableCell>
                      <TableCell className="text-xs text-[#6B6B6B]">{briefUA(l.user_agent)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-[#E8E5E0] flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-indigo-600" />
                <p className="text-sm font-semibold text-[#1A1A1A]">
                  {t("ยอดขายตามผู้ดูแล", "Sales by owner", "按负责人销售额")}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {RANGES.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => {
                      setRange(r.key);
                      setSelectedDate(null);
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                      range === r.key && !selectedDate ? "bg-[#1A1A1A] text-white" : "bg-[#F0EDE6] text-[#6B6B6B] hover:bg-[#E8E5E0]"
                    }`}
                  >
                    {r.key}
                  </button>
                ))}
                <Input
                  type="date"
                  className="h-8 w-auto text-xs"
                  value={selectedDate ?? ""}
                  onChange={(e) => setSelectedDate(e.target.value || null)}
                />
              </div>
            </div>
            {leadsLoading ? (
              <div className="py-10 text-center text-sm text-[#6B6B6B]">
                <Loader2 size={18} className="mx-auto mb-2 animate-spin" />
                {t("กำลังโหลด...", "Loading...", "加载中...")}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#FAF7F2]">
                      <TableHead className="text-xs">{t("ผู้ดูแล", "Owner", "负责人")}</TableHead>
                      <TableHead className="text-xs text-right">{t("ลีด", "Leads", "线索")}</TableHead>
                      <TableHead className="text-xs text-right">{t("ปิด", "Closed", "成交")}</TableHead>
                      <TableHead className="text-xs text-right">{t("อัตรา", "Rate", "成交率")}</TableHead>
                      <TableHead className="text-xs text-right">{t("ยอดขาย ฿", "Revenue ฿", "销售额 ฿")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="bg-[#FAF7F2] font-semibold">
                      <TableCell className="text-sm">{t("ทุกคน", "Everyone", "全部")}</TableCell>
                      <TableCell className="text-sm text-right">{rangeLeads.length}</TableCell>
                      <TableCell className="text-sm text-right">{rangeLeads.filter((l) => l.status === "converted").length}</TableCell>
                      <TableCell className="text-sm text-right">
                        {rangeLeads.length ? ((rangeLeads.filter((l) => l.status === "converted").length / rangeLeads.length) * 100).toFixed(0) : 0}%
                      </TableCell>
                      <TableCell className="text-sm text-right">
                        ฿{rangeLeads.filter((l) => l.status === "converted").reduce((sum, l) => sum + (l.deal_value ?? 0), 0).toLocaleString("th-TH")}
                      </TableCell>
                    </TableRow>
                    {ownerSalesSummary.map((o) => (
                      <TableRow key={o.name} className="hover:bg-[#FAF7F2]/50">
                        <TableCell className="text-sm">{o.name === NO_OWNER ? t("ยังไม่ระบุ", "Not set", "未设置") : o.name}</TableCell>
                        <TableCell className="text-sm text-right">{o.count}</TableCell>
                        <TableCell className="text-sm text-right">{o.converted}</TableCell>
                        <TableCell className="text-sm text-right">{o.count ? `${o.rate.toFixed(0)}%` : "-"}</TableCell>
                        <TableCell className="text-sm text-right">{o.revenue ? `฿${o.revenue.toLocaleString("th-TH")}` : "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="text-[10px] text-[#9CA3AF] px-5 py-2">
                  {t(`ช่วง: ${scopeLabel}`, `Range: ${scopeLabel}`, `范围: ${scopeLabel}`)}
                </p>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
