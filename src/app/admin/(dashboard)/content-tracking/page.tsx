"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Loader2, Plus, Trash2, Upload, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/store/language";

interface Employee {
  id: number;
  name: string;
  sort_order: number;
  archived: boolean;
}

interface Post {
  id: number;
  employee_id: number;
  platform: string;
  post_date: string;
  image_urls: string[];
}

const PLATFORMS: { key: string; label: string; color: string }[] = [
  { key: "fb", label: "FB", color: "#1877F2" },
  { key: "ig", label: "IG", color: "#E4405F" },
  { key: "tk", label: "TK", color: "#1A1A1A" },
  { key: "douyin", label: "抖音", color: "#1A1A1A" },
  { key: "xiaohongshu", label: "小红书", color: "#FE2C55" },
];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(dateStr: string, delta: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/products/upload", { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data.url as string;
}

export default function ContentTrackingPage() {
  const { t } = useLanguage();
  const [date, setDate] = useState(todayStr());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [uploadingCell, setUploadingCell] = useState<string | null>(null);

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

  async function addEmployee() {
    const name = newName.trim();
    if (!name) return;
    setAddingEmployee(true);
    const res = await fetch("/api/admin/content-tracking/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    setAddingEmployee(false);
    if (res.ok) {
      setEmployees((prev) => [...prev, data.employee]);
      setNewName("");
    } else {
      toast.error(data.error || t("เพิ่มไม่สำเร็จ", "Could not add", "添加失败"));
    }
  }

  async function renameEmployee(emp: Employee, name: string) {
    if (!name.trim() || name === emp.name) return;
    setEmployees((prev) => prev.map((e) => (e.id === emp.id ? { ...e, name } : e)));
    const res = await fetch(`/api/admin/content-tracking/employees/${emp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
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
      setPosts((prev) => {
        const next = prev.filter((p) => p.id !== data.post.id);
        return [...next, data.post];
      });
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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">{t("ติดตามโพสต์พนักงาน", "Content Tracker", "员工发帖跟踪")}</h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">
            {t("เก็บรูปภาพลงคลิป/โพสของแต่ละคนในแต่ละแพลตฟอร์ม รายวัน", "Track each employee's posts per platform, by day", "按天跟踪每位员工在各平台的发帖情况")}
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-white rounded-lg border border-[#E8E5E0] p-1">
          <Button size="icon-sm" variant="ghost" onClick={() => setDate((d) => addDays(d, -1))} aria-label={t("วันก่อนหน้า", "Previous day", "前一天")}>
            <ChevronLeft size={15} />
          </Button>
          <Input type="date" className="h-8 border-0 text-xs w-36" value={date} onChange={(e) => setDate(e.target.value)} />
          <Button size="icon-sm" variant="ghost" onClick={() => setDate((d) => addDays(d, 1))} aria-label={t("วันถัดไป", "Next day", "下一天")}>
            <ChevronRight size={15} />
          </Button>
          {date !== todayStr() && (
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setDate(todayStr())}>
              {t("วันนี้", "Today", "今天")}
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        {loading ? (
          <div className="py-16 text-center text-sm text-[#6B6B6B]">
            <Loader2 size={20} className="mx-auto mb-2 animate-spin" />
            {t("กำลังโหลด...", "Loading...", "加载中...")}
          </div>
        ) : (
          <table className="w-full border-collapse min-w-[720px]">
            <thead>
              <tr className="bg-[#FAF7F2]">
                <th className="text-left text-xs font-semibold text-[#6B6B6B] p-3 border-b border-[#E8E5E0] w-40">
                  {t("พนักงาน", "Employee", "员工")}
                </th>
                {PLATFORMS.map((p) => (
                  <th key={p.key} className="text-center text-xs font-semibold p-3 border-b border-[#E8E5E0]" style={{ color: p.color }}>
                    {p.label}
                  </th>
                ))}
                <th className="w-10 border-b border-[#E8E5E0]" />
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={PLATFORMS.length + 2} className="text-center py-10 text-sm text-[#9CA3AF]">
                    {t('ยังไม่มีพนักงาน — เพิ่มได้ด้านล่าง', 'No employees yet — add one below', '暂无员工 — 可在下方添加')}
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="border-b border-[#E8E5E0] align-top">
                    <td className="p-2">
                      <Input
                        defaultValue={emp.name}
                        key={emp.id + emp.name}
                        className="h-8 text-sm font-medium"
                        onBlur={(e) => renameEmployee(emp, e.target.value)}
                      />
                    </td>
                    {PLATFORMS.map((platform) => {
                      const cellKey = `${emp.id}-${platform.key}`;
                      const post = postByCell.get(cellKey);
                      const images = post?.image_urls || [];
                      const isUploading = uploadingCell === cellKey;
                      return (
                        <td key={platform.key} className="p-2">
                          <div className="flex flex-wrap gap-1.5 items-center min-h-[52px]">
                            {images.map((url) => (
                              <div key={url} className="relative w-12 h-12 shrink-0 rounded border border-[#E8E5E0] overflow-hidden group">
                                <a href={url} target="_blank" rel="noreferrer" className="block w-full h-full relative">
                                  <Image src={url} alt="" fill sizes="48px" className="object-cover" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => post && removeImageFromCell(post, url)}
                                  aria-label={t("ลบรูป", "Remove photo", "删除图片")}
                                  className="absolute top-0 right-0 bg-black/60 text-white w-4 h-4 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                            <label className="relative w-12 h-12 shrink-0 rounded border border-dashed border-[#E8E5E0] flex items-center justify-center cursor-pointer hover:border-[#C8102E] hover:bg-[#FAF7F2] transition-colors">
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
                              {isUploading ? (
                                <Loader2 size={14} className="animate-spin text-[#9CA3AF]" />
                              ) : images.length === 0 ? (
                                <ImageOff size={14} className="text-[#C8C5BE]" />
                              ) : (
                                <Upload size={13} className="text-[#9CA3AF]" />
                              )}
                            </label>
                          </div>
                        </td>
                      );
                    })}
                    <td className="p-2">
                      <Button size="icon-sm" variant="ghost" onClick={() => removeEmployee(emp)} aria-label={t("ลบพนักงาน", "Remove employee", "移除员工")}>
                        <Trash2 size={13} className="text-red-400" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
        <div className="flex items-center gap-2 p-3 border-t border-[#E8E5E0]">
          <Input
            className="h-8 text-xs max-w-xs"
            placeholder={t("ชื่อพนักงานใหม่...", "New employee name...", "新员工姓名...")}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addEmployee();
            }}
          />
          <Button size="sm" disabled={addingEmployee || !newName.trim()} onClick={addEmployee}>
            {addingEmployee ? <Loader2 size={13} className="mr-1 animate-spin" /> : <Plus size={13} className="mr-1" />}
            {t("เพิ่มพนักงาน", "Add Employee", "添加员工")}
          </Button>
        </div>
      </div>
    </div>
  );
}
