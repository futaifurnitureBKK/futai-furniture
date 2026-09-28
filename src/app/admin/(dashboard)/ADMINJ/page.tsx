"use client";
import { useEffect, useMemo, useState, FormEvent } from "react";
import {
  Loader2, Lock, ShieldAlert, ShieldCheck, TrendingUp, KeyRound, LogOut, Radio,
  CheckCircle2, XCircle, Users, Clock,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
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
interface ActiveSession {
  id: string;
  ip: string;
  name: string;
  user_agent: string;
  created_at: string;
  expires_at: string;
}

const CODE_KEY = "futai-security-code";

// Kept as a standalone module-scope function (rather than assigning
// window.location.href inline inside a state-updating handler) so React
// Compiler doesn't flag the navigation as mutating an outside value.
function goToLogin() {
  window.location.href = "/admin/login";
}
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

function StatCard({
  icon: Icon, iconClass, label, value, sub,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconClass: string;
  label: string;
  value: string;
  sub?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[#9CA3AF]">{label}</p>
        <p className="text-lg font-bold text-[#1A1A1A] truncate">{value}</p>
        {sub && <p className="text-[11px] text-[#9CA3AF] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function PasswordChangeCard({
  title, hint, target, t,
}: {
  title: string;
  hint: string;
  target: "main" | "security_code";
  t: (th: string, en: string, zh?: string) => string;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (next.length < 8) {
      setMsg({ ok: false, text: t("รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร", "New password must be at least 8 characters", "新密码至少需要8个字符") });
      return;
    }
    if (next !== confirm) {
      setMsg({ ok: false, text: t("รหัสผ่านใหม่ไม่ตรงกัน", "New passwords don't match", "新密码不一致") });
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target, currentPassword: current, newPassword: next }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setMsg({ ok: true, text: t("เปลี่ยนรหัสผ่านสำเร็จ", "Password changed", "密码已更改") });
      setCurrent("");
      setNext("");
      setConfirm("");
    } else {
      setMsg({ ok: false, text: data.error || t("เปลี่ยนรหัสผ่านไม่สำเร็จ", "Failed to change password", "更改密码失败") });
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2.5 bg-[#FAF7F2] rounded-lg p-4">
      <div>
        <p className="text-sm font-semibold text-[#1A1A1A]">{title}</p>
        <p className="text-xs text-[#9CA3AF]">{hint}</p>
      </div>
      <Input
        type="password"
        placeholder={t("รหัสผ่านปัจจุบัน", "Current password", "当前密码")}
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        className="h-9 text-sm bg-white"
      />
      <Input
        type="password"
        placeholder={t("รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)", "New password (min 8 characters)", "新密码（至少8个字符）")}
        value={next}
        onChange={(e) => setNext(e.target.value)}
        className="h-9 text-sm bg-white"
      />
      <Input
        type="password"
        placeholder={t("ยืนยันรหัสผ่านใหม่", "Confirm new password", "确认新密码")}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        className="h-9 text-sm bg-white"
      />
      {msg && <p className={`text-xs ${msg.ok ? "text-emerald-600" : "text-red-600"}`}>{msg.text}</p>}
      <Button type="submit" size="sm" disabled={saving || !next}>
        {saving && <Loader2 size={13} className="animate-spin mr-1.5" />}
        {t("บันทึกรหัสผ่านใหม่", "Save new password", "保存新密码")}
      </Button>
    </form>
  );
}

export default function AdminSecurityPage() {
  const { t } = useLanguage();
  const [unlocked, setUnlocked] = useState(false);
  const [checkingStoredCode, setCheckingStoredCode] = useState(true);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlockedCode, setUnlockedCode] = useState("");

  const [logins, setLogins] = useState<Login[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [kickingId, setKickingId] = useState<string | null>(null);
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
      const [loginsRes, sessionsRes] = await Promise.all([
        fetch("/api/admin/logins", { headers: { "x-security-code": code } }),
        fetch("/api/admin/sessions", { headers: { "x-security-code": code } }),
      ]);
      const data = await loginsRes.json();
      if (!loginsRes.ok) {
        if (loginsRes.status === 403) {
          setCodeError(data.error || t("รหัสไม่ถูกต้อง", "Wrong code", "代码错误"));
        } else {
          setError(data.error || "Load failed");
        }
        return false;
      }
      setLogins(data.logins);
      setAttempts(data.attempts);
      setLoadedAt(Date.now());

      const sessData = await sessionsRes.json();
      if (sessionsRes.ok) {
        setActiveSessions(sessData.sessions);
        setCurrentSessionId(sessData.currentSessionId);
      }

      setUnlockedCode(code);
      return true;
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

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    window.location.href = "/admin/login";
  }

  async function handleKick(session: ActiveSession) {
    if (!confirm(t(`ออกจากระบบ IP ${session.ip} เลยไหม?`, `Log out IP ${session.ip} now?`, `确定要注销 IP ${session.ip} 吗？`))) return;
    setKickingId(session.id);
    const res = await fetch(`/api/admin/sessions/${session.id}`, {
      method: "DELETE",
      headers: { "x-security-code": unlockedCode },
    });
    setKickingId(null);
    if (res.ok) {
      const wasSelf = session.id === currentSessionId;
      setActiveSessions((prev) => prev.filter((s) => s.id !== session.id));
      if (wasSelf) goToLogin();
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

  // KPI summary cards — logins/attempts only cover what's already fetched
  // (last 200 logins, currently-tracked attempt windows), which is plenty
  // for a today-vs-yesterday comparison on an internal tool like this.
  const todayLoginsCount = useMemo(() => logins.filter((l) => l.created_at.slice(0, 10) === todayStr()).length, [logins]);
  const yesterdayLoginsCount = useMemo(() => logins.filter((l) => l.created_at.slice(0, 10) === daysAgoStr(1)).length, [logins]);
  const loginTrendPct = yesterdayLoginsCount ? Math.round(((todayLoginsCount - yesterdayLoginsCount) / yesterdayLoginsCount) * 100) : null;
  // login_attempts only keeps the current window per IP, not a full history,
  // so there's no reliable "yesterday" figure to compare failed logins
  // against — shown as a plain count rather than a fabricated trend.
  const todayFailedCount = useMemo(
    () => attempts.filter((a) => a.first_attempt_at.slice(0, 10) === todayStr()).reduce((sum, a) => sum + a.attempts, 0),
    [attempts]
  );
  const mostRecentSession = activeSessions[0] ?? null;

  // Daily sales trend for the chart — only meaningful over a range, not a
  // single picked date, so it sits out when selectedDate is set.
  const dailySalesTrend = useMemo(() => {
    if (selectedDate) return [];
    const sums = new Map<string, number>();
    const end = new Date(todayStr());
    for (let d = new Date(rangeStart); d <= end; d.setDate(d.getDate() + 1)) {
      sums.set(d.toISOString().slice(0, 10), 0);
    }
    leads
      .filter((l) => l.status === "converted")
      .forEach((l) => {
        if (sums.has(l.lead_date)) sums.set(l.lead_date, (sums.get(l.lead_date) || 0) + (l.deal_value ?? 0));
      });
    return Array.from(sums.entries()).map(([date, total]) => ({ date, total }));
  }, [leads, rangeStart, selectedDate]);

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
      <div className="flex items-start justify-between gap-3 flex-wrap">
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
        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut size={14} className="mr-1.5" /> {t("ออกจากระบบ", "Log out", "退出登录")}
        </Button>
      </div>

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={CheckCircle2}
            iconClass="bg-emerald-50 text-emerald-600"
            label={t("ล็อกอินสำเร็จ (วันนี้)", "Successful logins (today)", "成功登录（今天）")}
            value={t(`${todayLoginsCount} ครั้ง`, `${todayLoginsCount}`, `${todayLoginsCount} 次`)}
            sub={
              <>
                {loginTrendPct != null && (
                  <span className={loginTrendPct >= 0 ? "text-emerald-600" : "text-red-600"}>
                    {loginTrendPct >= 0 ? "▲" : "▼"} {Math.abs(loginTrendPct)}%{" "}
                  </span>
                )}
                {t(`จากเมื่อวาน (${yesterdayLoginsCount} ครั้ง)`, `vs yesterday (${yesterdayLoginsCount})`, `较昨天 (${yesterdayLoginsCount})`)}
              </>
            }
          />
          <StatCard
            icon={XCircle}
            iconClass="bg-red-50 text-red-600"
            label={t("ล็อกอินล้มเหลว (วันนี้)", "Failed logins (today)", "登录失败（今天）")}
            value={t(`${todayFailedCount} ครั้ง`, `${todayFailedCount}`, `${todayFailedCount} 次`)}
            sub={t("รวมทุก IP ที่พยายามวันนี้", "Across all IPs that tried today", "今天所有尝试的IP合计")}
          />
          <StatCard
            icon={Users}
            iconClass="bg-indigo-50 text-indigo-600"
            label={t("กำลังใช้งานอยู่ตอนนี้", "Currently active", "当前活跃")}
            value={t(`${activeSessions.length} คน`, `${activeSessions.length}`, `${activeSessions.length} 人`)}
            sub={t("เซสชันที่ยังไม่หมดอายุ", "Sessions not yet expired", "尚未过期的会话")}
          />
          <StatCard
            icon={Clock}
            iconClass="bg-amber-50 text-amber-600"
            label={t("ใช้งานล่าสุด", "Most recently active", "最近活跃")}
            value={mostRecentSession ? mostRecentSession.ip : "-"}
            sub={mostRecentSession ? new Date(mostRecentSession.created_at).toLocaleString("th-TH") : t("ไม่มีใครใช้งานอยู่", "No one active", "无人在线")}
          />
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E8E5E0] flex items-center gap-2">
          <KeyRound size={16} className="text-[#1A1A1A]" />
          <p className="text-sm font-semibold text-[#1A1A1A]">{t("ตั้งค่าความปลอดภัย", "Security settings", "安全设置")}</p>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <PasswordChangeCard
            target="main"
            t={t}
            title={t("รหัสผ่านเข้า Admin หลัก", "Main admin login password", "主管理员登录密码")}
            hint={t("ใช้ล็อกอินเข้า /admin", "Used to log into /admin", "用于登录 /admin")}
          />
          <PasswordChangeCard
            target="security_code"
            t={t}
            title={t("รหัสพิเศษหน้านี้", "This page's extra code", "本页专用密码")}
            hint={t("ใช้ปลดล็อกหน้าประวัติเข้าระบบนี้เท่านั้น", "Used only to unlock this Login Log page", "仅用于解锁本登录记录页面")}
          />
        </div>
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
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-[#E8E5E0] flex items-center gap-2">
              <Radio size={16} className="text-emerald-600" />
              <p className="text-sm font-semibold text-[#1A1A1A]">
                {t(`กำลังใช้งานอยู่ตอนนี้ (${activeSessions.length})`, `Currently active (${activeSessions.length})`, `当前活跃 (${activeSessions.length})`)}
              </p>
            </div>
            {activeSessions.length === 0 ? (
              <p className="text-sm text-[#9CA3AF] text-center py-10">{t("ไม่มีใครล็อกอินอยู่ตอนนี้", "No one is logged in right now", "目前没有人登录")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#FAF7F2]">
                    <TableHead className="text-xs">{t("ล็อกอินเมื่อ", "Logged in at", "登录时间")}</TableHead>
                    <TableHead className="text-xs">{t("ชื่อ", "Name", "姓名")}</TableHead>
                    <TableHead className="text-xs">IP</TableHead>
                    <TableHead className="text-xs">{t("อุปกรณ์ / เบราว์เซอร์", "Device / Browser", "设备/浏览器")}</TableHead>
                    <TableHead className="text-xs" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeSessions.map((s) => (
                    <TableRow key={s.id} className="hover:bg-[#FAF7F2]/50">
                      <TableCell className="text-xs text-[#6B6B6B]">{new Date(s.created_at).toLocaleString("th-TH")}</TableCell>
                      <TableCell className="text-sm font-medium text-[#1A1A1A]">
                        {s.name || <span className="text-[#9CA3AF] font-normal">{t("ไม่ระบุ", "Not given", "未填写")}</span>}
                        {s.id === currentSessionId && (
                          <span className="ml-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                            {t("เครื่องนี้", "This device", "本设备")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-mono">{s.ip}</TableCell>
                      <TableCell className="text-xs text-[#6B6B6B]">{briefUA(s.user_agent)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleKick(s)}
                          disabled={kickingId === s.id}
                        >
                          {kickingId === s.id ? <Loader2 size={13} className="animate-spin" /> : t("ออกจากระบบ", "Log out", "注销")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-[#E8E5E0] flex items-center gap-2">
                <ShieldAlert size={16} className="text-amber-600" />
                <p className="text-sm font-semibold text-[#1A1A1A]">
                  {t("IP ที่เข้ารหัสผิด / ถูกบล็อกชั่วคราว", "IPs with failed attempts / temporarily locked", "密码错误 / 暂时被锁定的IP")}
                </p>
              </div>
              {attempts.length === 0 ? (
                <p className="text-sm text-[#9CA3AF] text-center py-10">{t("ไม่มี IP ที่เข้ารหัสผิด", "No IPs with failed attempts", "没有密码错误的IP")}</p>
              ) : (
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
              )}
            </div>

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
                <div className="max-h-[420px] overflow-y-auto">
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
                </div>
              )}
            </div>
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
                {dailySalesTrend.length > 0 && (
                  <div className="px-5 pt-4" style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailySalesTrend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="salesTrendFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366F1" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="#E8E5E0" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11, fill: "#9CA3AF" }}
                          axisLine={{ stroke: "#E8E5E0" }}
                          tickLine={false}
                          interval={Math.max(0, Math.ceil(dailySalesTrend.length / 7) - 1)}
                        />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload as (typeof dailySalesTrend)[number];
                            return (
                              <div className="bg-white shadow-lg rounded-lg px-3 py-2 text-xs border border-[#E8E5E0]">
                                <p className="font-semibold text-[#1A1A1A]">{d.date}</p>
                                <p className="text-[#6B6B6B]">{t("ยอดขาย", "Sales", "销售额")} ฿{d.total.toLocaleString("th-TH")}</p>
                              </div>
                            );
                          }}
                        />
                        <Area type="monotone" dataKey="total" stroke="#6366F1" strokeWidth={2} fill="url(#salesTrendFill)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
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
