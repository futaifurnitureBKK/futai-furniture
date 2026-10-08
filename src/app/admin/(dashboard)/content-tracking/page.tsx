"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  ChevronLeft, ChevronRight, Loader2, Plus, Trash2, Pencil, ImageOff, Search,
  MessageCircle, Music2, Megaphone, X, CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/store/language";

interface Employee {
  id: number;
  name: string;
  role: string;
  sort_order: number;
  archived: boolean;
}

interface Post {
  id: number;
  employee_id: number;
  platform: string;
  post_date: string;
  image_urls: string[];
  status: "pending" | "posted";
  updated_at: string;
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="#1877F2">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.17 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.9h-2.34v7.03C18.34 21.23 22 17.06 22 12.06Z" />
    </svg>
  );
}
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="#E4405F" strokeWidth={2}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="1.1" fill="#E4405F" stroke="none" />
    </svg>
  );
}
function XiaohongshuIcon({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center rounded bg-[#FE2C55] text-white font-bold text-[9px] leading-none ${className}`} style={{ width: "1.1em", height: "1.1em" }}>
      书
    </span>
  );
}

const PLATFORMS: { key: string; label: string; color: string; Icon: (p: { className?: string }) => React.ReactElement }[] = [
  { key: "fb", label: "Facebook", color: "#1877F2", Icon: FacebookIcon },
  { key: "ig", label: "Instagram", color: "#E4405F", Icon: InstagramIcon },
  { key: "tk", label: "TikTok", color: "#1A1A1A", Icon: (p) => <Music2 className={p.className} /> },
  { key: "xiaohongshu", label: "小红书", color: "#FE2C55", Icon: XiaohongshuIcon },
  { key: "line", label: "LINE", color: "#06C755", Icon: (p) => <MessageCircle className={p.className} /> },
];

const STATUS_META = {
  posted: { th: "โพสต์แล้ว", en: "Posted", zh: "已发布", className: "bg-emerald-100 text-emerald-700" },
  pending: { th: "รอโพสต์", en: "Pending", zh: "待发布", className: "bg-orange-100 text-orange-700" },
};

const AVATAR_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"];
function avatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}
function initials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.slice(0, 2).toUpperCase();
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(dateStr: string, delta: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtTime(iso: string) {
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return "-";
  }
}
function fmtDateDisplay(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("th-TH-u-ca-buddhist", { day: "2-digit", month: "2-digit", year: "numeric" });
}

async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/products/upload", { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data.url as string;
}

type StatusFilter = "all" | "posted" | "pending" | "none";

export default function ContentTrackingPage() {
  const { t } = useLanguage();
  const [date, setDate] = useState(todayStr());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingCell, setUploadingCell] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [cellDialog, setCellDialog] = useState<{ employeeId: number; platform: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/admin/content-tracking/employees");
      const data = await res.json();
      if (!cancelled && res.ok) setEmployees(data.employees);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/admin/content-tracking/posts?date=${date}`);
      const data = await res.json();
      if (!cancelled) {
        if (res.ok) setPosts(data.posts);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [date]);

  const postByCell = useMemo(() => {
    const m = new Map<string, Post>();
    for (const p of posts) m.set(`${p.employee_id}-${p.platform}`, p);
    return m;
  }, [posts]);

  function cellStatus(employeeId: number, platform: string): "posted" | "pending" | "none" {
    const post = postByCell.get(`${employeeId}-${platform}`);
    if (!post || post.image_urls.length === 0) return "none";
    return post.status;
  }

  const visibleEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((emp) => {
      if (q && !emp.name.toLowerCase().includes(q) && !emp.role.toLowerCase().includes(q)) return false;
      if (statusFilter === "all") return true;
      return PLATFORMS.some((p) => cellStatus(emp.id, p.key) === statusFilter);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, search, statusFilter, postByCell]);

  const overall = useMemo(() => {
    let posted = 0;
    const total = employees.length * PLATFORMS.length;
    for (const emp of employees) for (const p of PLATFORMS) if (cellStatus(emp.id, p.key) === "posted") posted += 1;
    return { posted, total, pct: total > 0 ? Math.round((posted / total) * 100) : 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, postByCell]);

  async function addEmployee() {
    const name = newName.trim();
    if (!name) return;
    setAddingEmployee(true);
    const res = await fetch("/api/admin/content-tracking/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role: newRole.trim() }),
    });
    const data = await res.json();
    setAddingEmployee(false);
    if (res.ok) {
      setEmployees((prev) => [...prev, data.employee]);
      setNewName("");
      setNewRole("");
      setAddOpen(false);
    } else {
      toast.error(data.error || t("เพิ่มไม่สำเร็จ", "Could not add", "添加失败"));
    }
  }

  function startEdit(emp: Employee) {
    setEditingId(emp.id);
    setEditName(emp.name);
    setEditRole(emp.role);
  }

  async function saveEdit(emp: Employee) {
    const name = editName.trim();
    if (!name) return;
    setEmployees((prev) => prev.map((e) => (e.id === emp.id ? { ...e, name, role: editRole.trim() } : e)));
    setEditingId(null);
    const res = await fetch(`/api/admin/content-tracking/employees/${emp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role: editRole.trim() }),
    });
    if (!res.ok) toast.error(t("บันทึกไม่สำเร็จ", "Save failed", "保存失败"));
  }

  async function removeEmployee(emp: Employee) {
    if (!confirm(t(`ลบ "${emp.name}" ออกจากตารางใช่ไหม?`, `Remove "${emp.name}" from the table?`, `确定要移除 "${emp.name}" 吗？`))) return;
    const prev = employees;
    setEmployees((list) => list.filter((e) => e.id !== emp.id));
    const res = await fetch(`/api/admin/content-tracking/employees/${emp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    if (!res.ok) {
      setEmployees(prev);
      toast.error(t("ลบไม่สำเร็จ", "Delete failed", "删除失败"));
    }
  }

  async function addImageToCell(employeeId: number, platform: string, file: File) {
    const cellKey = `${employeeId}-${platform}`;
    setUploadingCell(cellKey);
    try {
      const url = await uploadImage(file);
      const res = await fetch("/api/admin/content-tracking/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: employeeId, platform, post_date: date, image_url: url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setPosts((prev) => [...prev.filter((p) => p.id !== data.post.id), data.post]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("อัปโหลดรูปไม่สำเร็จ", "Upload failed", "上传失败"));
    } finally {
      setUploadingCell(null);
    }
  }

  async function removeImageFromCell(post: Post, imageUrl: string) {
    const nextUrls = post.image_urls.filter((u) => u !== imageUrl);
    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, image_urls: nextUrls } : p)));
    const res = await fetch(`/api/admin/content-tracking/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_urls: nextUrls }),
    });
    if (!res.ok) {
      setPosts((prev) => prev.map((p) => (p.id === post.id ? post : p)));
      toast.error(t("ลบรูปไม่สำเร็จ", "Could not remove photo", "删除失败"));
    }
  }

  async function toggleStatus(post: Post) {
    const nextStatus = post.status === "posted" ? "pending" : "posted";
    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, status: nextStatus } : p)));
    const res = await fetch(`/api/admin/content-tracking/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (!res.ok) {
      setPosts((prev) => prev.map((p) => (p.id === post.id ? post : p)));
      toast.error(t("อัปเดตสถานะไม่สำเร็จ", "Could not update status", "更新状态失败"));
    }
  }

  const STATUS_FILTERS: { key: StatusFilter; th: string; en: string; zh: string }[] = [
    { key: "all", th: "ทั้งหมด", en: "All", zh: "全部" },
    { key: "posted", th: "โพสต์แล้ว", en: "Posted", zh: "已发布" },
    { key: "pending", th: "รอโพสต์", en: "Pending", zh: "待发布" },
    { key: "none", th: "ยังไม่โพสต์", en: "Not started", zh: "未开始" },
  ];

  const cellDialogPost = cellDialog ? postByCell.get(`${cellDialog.employeeId}-${cellDialog.platform}`) : undefined;
  const cellDialogEmployee = cellDialog ? employees.find((e) => e.id === cellDialog.employeeId) : undefined;
  const cellDialogPlatform = cellDialog ? PLATFORMS.find((p) => p.key === cellDialog.platform) : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-[#C8102E] text-white flex items-center justify-center shrink-0">
            <Megaphone size={20} />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A1A]">{t("ติดตามโพสต์พนักงาน", "Content Tracker", "员工发帖跟踪")}</h1>
            <p className="text-sm text-[#6B6B6B] mt-0.5">
              {t(
                "เช็คและอัปเดตสถานะการโพสต์คอนเทนต์ของพนักงานแต่ละคน ให้ครบทุกแพลตฟอร์ม",
                "Check and update each employee's content posting status across every platform",
                "检查并更新每位员工在各平台的内容发布状态"
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex items-center gap-1 bg-white rounded-lg border border-[#E8E5E0] p-1">
            <Button size="icon-sm" variant="ghost" onClick={() => setDate((d) => addDays(d, -1))} aria-label={t("วันก่อนหน้า", "Previous day", "前一天")}>
              <ChevronLeft size={15} />
            </Button>
            <span className="relative flex items-center gap-1.5 px-1">
              <CalendarDays size={13} className="text-[#9CA3AF]" />
              <span className="text-sm font-medium tabular-nums">{fmtDateDisplay(date)}</span>
              <input
                type="date"
                aria-label={t("เลือกวันที่", "Pick a date", "选择日期")}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                value={date}
                onChange={(e) => e.target.value && setDate(e.target.value)}
              />
            </span>
            <Button size="icon-sm" variant="ghost" onClick={() => setDate((d) => addDays(d, 1))} aria-label={t("วันถัดไป", "Next day", "下一天")}>
              <ChevronRight size={15} />
            </Button>
          </div>
          <Button onClick={() => setAddOpen(true)}>
            <Plus size={14} className="mr-1.5" /> {t("เพิ่มแถวพนักงาน", "Add Employee Row", "添加员工行")}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        {loading ? (
          <div className="py-16 text-center text-sm text-[#6B6B6B]">
            <Loader2 size={20} className="mx-auto mb-2 animate-spin" />
            {t("กำลังโหลด...", "Loading...", "加载中...")}
          </div>
        ) : (
          <table className="w-full border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-[#FAF7F2]">
                <th className="text-left text-xs font-semibold text-[#6B6B6B] p-3 border-b border-[#E8E5E0] w-40">
                  {t("พนักงาน", "Employee", "员工")}
                </th>
                {PLATFORMS.map((p) => (
                  <th key={p.key} className="text-center text-xs font-semibold p-3 border-b border-[#E8E5E0]">
                    <span className="inline-flex items-center gap-1.5" style={{ color: p.color }}>
                      <p.Icon className="w-4 h-4" />
                      {p.label}
                    </span>
                  </th>
                ))}
                <th className="text-center text-xs font-semibold text-[#6B6B6B] p-3 border-b border-[#E8E5E0] w-28">
                  {t("สรุป", "Summary", "总结")}
                </th>
                <th className="text-center text-xs font-semibold text-[#6B6B6B] p-3 border-b border-[#E8E5E0] w-20">
                  {t("จัดการ", "Actions", "操作")}
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleEmployees.length === 0 ? (
                <tr>
                  <td colSpan={PLATFORMS.length + 3} className="text-center py-10 text-sm text-[#9CA3AF]">
                    {employees.length === 0
                      ? t('ยังไม่มีพนักงาน — กด "เพิ่มแถวพนักงาน"', 'No employees yet — click "Add Employee Row"', '暂无员工 — 点击"添加员工行"')
                      : t("ไม่พบพนักงานที่ตรงกับตัวกรอง", "No employees match the filter", "没有符合筛选条件的员工")}
                  </td>
                </tr>
              ) : (
                visibleEmployees.map((emp) => {
                  const postedCount = PLATFORMS.filter((p) => cellStatus(emp.id, p.key) === "posted").length;
                  const pct = Math.round((postedCount / PLATFORMS.length) * 100);
                  const isEditing = editingId === emp.id;
                  return (
                    <tr key={emp.id} className="border-b border-[#E8E5E0] align-top">
                      <td className="p-3">
                        {isEditing ? (
                          <div className="space-y-1">
                            <Input className="h-7 text-xs" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder={t("ชื่อ", "Name", "姓名")} autoFocus />
                            <Input className="h-7 text-xs" value={editRole} onChange={(e) => setEditRole(e.target.value)} placeholder={t("แผนก/ตำแหน่ง", "Role", "部门/职位")} />
                            <div className="flex gap-1">
                              <Button size="sm" className="h-6 text-[10px] px-2" onClick={() => saveEdit(emp)}>{t("บันทึก", "Save", "保存")}</Button>
                              <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => setEditingId(null)}>{t("ยกเลิก", "Cancel", "取消")}</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span
                              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                              style={{ backgroundColor: avatarColor(emp.id) }}
                            >
                              {initials(emp.name)}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[#1A1A1A] truncate">{emp.name}</p>
                              {emp.role && <p className="text-[11px] text-[#9CA3AF] truncate">{emp.role}</p>}
                            </div>
                          </div>
                        )}
                      </td>
                      {PLATFORMS.map((platform) => {
                        const cellKey = `${emp.id}-${platform.key}`;
                        const post = postByCell.get(cellKey);
                        const hasImage = !!post && post.image_urls.length > 0;
                        const isUploading = uploadingCell === cellKey;
                        const meta = hasImage ? STATUS_META[post!.status] : null;
                        return (
                          <td key={platform.key} className="p-2">
                            {hasImage ? (
                              <button
                                type="button"
                                onClick={() => setCellDialog({ employeeId: emp.id, platform: platform.key })}
                                className="w-full flex flex-col items-center gap-1 group"
                              >
                                <span className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#E8E5E0] bg-[#F5F3EF] mx-auto">
                                  <Image src={post!.image_urls[0]} alt="" fill sizes="64px" className="object-cover group-hover:opacity-80 transition-opacity" />
                                  {post!.image_urls.length > 1 && (
                                    <span className="absolute bottom-0 right-0 bg-black/70 text-white text-[9px] px-1 rounded-tl">
                                      +{post!.image_urls.length - 1}
                                    </span>
                                  )}
                                </span>
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${meta!.className}`}>
                                  {t(meta!.th, meta!.en, meta!.zh)}
                                </span>
                                <span className="text-[10px] text-[#9CA3AF] tabular-nums">{fmtTime(post!.updated_at)}</span>
                              </button>
                            ) : (
                              <label className="w-full flex flex-col items-center gap-1 cursor-pointer group mx-auto">
                                <span className="relative w-16 h-16 rounded-lg border border-dashed border-[#E8E5E0] flex items-center justify-center bg-[#FAF7F2] group-hover:border-[#C8102E] group-hover:bg-white transition-colors mx-auto">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    disabled={isUploading}
                                    onChange={(e) => {
                                      if (e.target.files?.[0]) addImageToCell(emp.id, platform.key, e.target.files[0]);
                                      e.target.value = "";
                                    }}
                                  />
                                  {isUploading ? <Loader2 size={16} className="animate-spin text-[#9CA3AF]" /> : <Plus size={18} className="text-[#C8C5BE]" />}
                                </span>
                                <span className="text-[10px] text-[#9CA3AF]">{t("ยังไม่โพสต์", "Not posted", "未发布")}</span>
                                <span className="text-[10px] text-[#C8C5BE]">-</span>
                              </label>
                            )}
                          </td>
                        );
                      })}
                      <td className="p-3 text-center">
                        <p className="text-sm font-semibold text-[#1A1A1A] tabular-nums">{postedCount} / {PLATFORMS.length}</p>
                        <div className="h-1.5 w-full bg-[#E8E5E0] rounded-full overflow-hidden mt-1.5">
                          <div
                            className={`h-full rounded-full ${pct === 100 ? "bg-emerald-500" : pct > 0 ? "bg-blue-500" : "bg-[#E8E5E0]"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1">
                          <Button size="icon-sm" variant="ghost" onClick={() => startEdit(emp)} aria-label={t("แก้ไข", "Edit", "编辑")}>
                            <Pencil size={13} className="text-[#6B6B6B]" />
                          </Button>
                          <Button size="icon-sm" variant="ghost" onClick={() => removeEmployee(emp)} aria-label={t("ลบพนักงาน", "Remove employee", "移除员工")}>
                            <Trash2 size={13} className="text-red-400" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}

        <div className="flex items-center justify-between gap-3 flex-wrap p-3 border-t border-[#E8E5E0]">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <Input
                className="h-8 pl-7 text-xs w-48"
                placeholder={t("ค้นหาชื่อพนักงาน...", "Search employee name...", "搜索员工姓名...")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setStatusFilter(f.key)}
                className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === f.key ? "bg-[#C8102E] text-white" : "bg-[#F0EDE6] text-[#6B6B6B] hover:bg-[#E8E5E0]"
                }`}
              >
                {t(f.th, f.en, f.zh)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 bg-[#FAF7F2] rounded-lg px-3 py-2">
            <div>
              <p className="text-[10px] text-[#9CA3AF]">{t("สรุปรวมวันนี้", "Today's total", "今日总计")}</p>
              <p className="text-base font-bold text-[#1A1A1A] tabular-nums">{overall.posted} / {overall.total}</p>
            </div>
            <div className="w-24">
              <div className="h-1.5 w-full bg-[#E8E5E0] rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${overall.pct === 100 ? "bg-emerald-500" : "bg-blue-500"}`} style={{ width: `${overall.pct}%` }} />
              </div>
              <p className="text-[10px] text-[#9CA3AF] mt-0.5 text-right tabular-nums">{overall.pct}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add employee */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("เพิ่มแถวพนักงาน", "Add Employee Row", "添加员工行")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[#6B6B6B]">{t("ชื่อ", "Name", "姓名")}</label>
              <Input className="mt-1" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t("เช่น กมล", "e.g. Kamol", "例如：Kamol")} autoFocus />
            </div>
            <div>
              <label className="text-xs text-[#6B6B6B]">{t("แผนก/ตำแหน่ง", "Department / Role", "部门/职位")}</label>
              <Input className="mt-1" value={newRole} onChange={(e) => setNewRole(e.target.value)} placeholder={t("เช่น ฝ่ายขาย", "e.g. Sales", "例如：销售部")} />
            </div>
            <Button className="w-full" disabled={addingEmployee || !newName.trim()} onClick={addEmployee}>
              {addingEmployee ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Plus size={14} className="mr-1.5" />}
              {t("เพิ่ม", "Add", "添加")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cell detail — photos + status */}
      <Dialog open={!!cellDialog} onOpenChange={(v) => !v && setCellDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {cellDialogEmployee?.name} · {cellDialogPlatform?.label}
            </DialogTitle>
          </DialogHeader>
          {cellDialogPost && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => toggleStatus(cellDialogPost)}
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_META[cellDialogPost.status].className}`}
              >
                {t(STATUS_META[cellDialogPost.status].th, STATUS_META[cellDialogPost.status].en, STATUS_META[cellDialogPost.status].zh)}
                {" · "}
                {t("กดเพื่อเปลี่ยนสถานะ", "tap to toggle", "点击切换")}
              </button>
              <div className="grid grid-cols-3 gap-2">
                {cellDialogPost.image_urls.map((url) => (
                  <div key={url} className="relative aspect-square rounded-lg overflow-hidden border border-[#E8E5E0] group">
                    <a href={url} target="_blank" rel="noreferrer" className="block w-full h-full relative">
                      <Image src={url} alt="" fill sizes="120px" className="object-cover" />
                    </a>
                    <button
                      type="button"
                      onClick={() => removeImageFromCell(cellDialogPost, url)}
                      aria-label={t("ลบรูป", "Remove photo", "删除图片")}
                      className="absolute top-1 right-1 bg-black/60 text-white w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
                <label className="relative aspect-square rounded-lg border border-dashed border-[#E8E5E0] flex items-center justify-center cursor-pointer hover:border-[#C8102E] hover:bg-[#FAF7F2] transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0] && cellDialog) addImageToCell(cellDialog.employeeId, cellDialog.platform, e.target.files[0]);
                      e.target.value = "";
                    }}
                  />
                  {uploadingCell === `${cellDialog?.employeeId}-${cellDialog?.platform}` ? (
                    <Loader2 size={16} className="animate-spin text-[#9CA3AF]" />
                  ) : (
                    <Plus size={18} className="text-[#C8C5BE]" />
                  )}
                </label>
              </div>
            </div>
          )}
          {!cellDialogPost && (
            <p className="text-sm text-[#9CA3AF] text-center py-4">
              <ImageOff size={20} className="mx-auto mb-2" />
              {t("ยังไม่มีรูป", "No photos yet", "暂无照片")}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
