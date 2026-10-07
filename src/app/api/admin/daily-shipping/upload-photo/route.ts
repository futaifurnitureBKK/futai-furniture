import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }
  if (file.size > 4 * 1024 * 1024) {
    return NextResponse.json({ error: "ไฟล์ใหญ่เกินไป (จำกัด 4MB) — ลองย่อรูปก่อนอัปโหลด" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const safeName = `${crypto.randomUUID()}.${ext}`;

  try {
    const blob = await put(`daily-shipping/${safeName}`, file, {
      access: "public",
      addRandomSuffix: false,
    });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("daily-shipping/upload-photo failed:", err);
    return NextResponse.json({ error: `อัปโหลดไม่สำเร็จ: ${err instanceof Error ? err.message : "unknown error"}` }, { status: 500 });
  }
}
