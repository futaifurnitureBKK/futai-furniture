"use client";
import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { Upload, X, Loader2, AlertCircle, Star, GripVertical } from "lucide-react";

interface UploadingItem {
  id: string;
  preview: string;
  status: "uploading" | "error";
  error?: string;
}

export function ImageUploader({
  images,
  onChange,
}: {
  images: string[];
  onChange: (images: string[]) => void;
}) {
  const [uploading, setUploading] = useState<UploadingItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
      let current = images;
      for (const file of imageFiles) {
        const id = `${file.name}-${Date.now()}-${Math.random()}`;
        const preview = URL.createObjectURL(file);
        setUploading((prev) => [...prev, { id, preview, status: "uploading" }]);

        try {
          const form = new FormData();
          form.append("file", file);
          const res = await fetch("/api/products/upload", { method: "POST", body: form });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Upload failed");
          current = [...current, data.url];
          onChange(current);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ";
          setUploading((prev) => prev.map((u) => (u.id === id ? { ...u, status: "error", error: msg } : u)));
          continue;
        }
        setUploading((prev) => {
          const item = prev.find((u) => u.id === id);
          if (item) URL.revokeObjectURL(item.preview);
          return prev.filter((u) => u.id !== id);
        });
      }
    },
    [images, onChange]
  );

  function removeImage(idx: number) {
    onChange(images.filter((_, i) => i !== idx));
  }

  function setCover(idx: number) {
    if (idx === 0) return;
    const next = [...images];
    const [picked] = next.splice(idx, 1);
    next.unshift(picked);
    onChange(next);
  }

  function reorder(from: number, to: number) {
    if (from === to) return;
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  function dismissError(id: string) {
    setUploading((prev) => {
      const item = prev.find((u) => u.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((u) => u.id !== id);
    });
  }

  return (
    <div className="space-y-3">
      {images.length > 1 && (
        <p className="text-xs text-[#9B9B9B]">ลากรูปเพื่อจัดลำดับ หรือกด ★ เพื่อตั้งเป็นรูปปก — รูปแรกจะเป็นรูปปกสินค้า</p>
      )}
      {(images.length > 0 || uploading.length > 0) && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {images.map((url, i) => (
            <div
              key={url + i}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragEnter={() => setOverIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex !== null) reorder(dragIndex, i);
                setDragIndex(null);
                setOverIndex(null);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              className={`group relative aspect-square rounded-lg overflow-hidden bg-[#FAF7F2] border cursor-grab active:cursor-grabbing transition-opacity ${
                dragIndex === i ? "opacity-40" : "opacity-100"
              } ${overIndex === i && dragIndex !== null && dragIndex !== i ? "border-[#C8102E] border-2" : "border-[#E8E5E0]"}`}
            >
              <Image src={url} alt="" fill sizes="120px" className="object-contain p-1 pointer-events-none" />
              <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical size={11} />
              </div>
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/80"
              >
                <X size={11} />
              </button>
              {i === 0 ? (
                <span className="absolute bottom-1 left-1 text-[9px] bg-[#C8102E] text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <Star size={9} fill="white" /> ปก
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setCover(i)}
                  className="absolute bottom-1 left-1 text-[9px] bg-black/50 text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-black/80 transition-opacity flex items-center gap-0.5"
                  title="ตั้งเป็นรูปปก"
                >
                  <Star size={9} /> ตั้งเป็นปก
                </button>
              )}
            </div>
          ))}
          {uploading.map((u) => (
            <div key={u.id} className="relative aspect-square rounded-lg overflow-hidden bg-[#FAF7F2] border border-[#E8E5E0]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u.preview} alt="" className="w-full h-full object-contain p-1" />
              {u.status === "uploading" ? (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                  <Loader2 size={20} className="animate-spin text-[#C8102E]" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => dismissError(u.id)}
                  className="absolute inset-0 bg-red-50/90 flex flex-col items-center justify-center gap-1 p-1"
                  title={u.error}
                >
                  <AlertCircle size={18} className="text-red-500" />
                  <span className="text-[9px] text-red-600 text-center line-clamp-2">{u.error}</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
          dragging ? "border-[#C8102E] bg-red-50" : "border-[#E8E5E0] hover:border-[#C8102E]/40 hover:bg-[#FAF7F2]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) uploadFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Upload size={20} className="mx-auto text-[#C8C5BE] mb-1.5" />
        <p className="text-sm text-[#1A1A1A] font-medium">ลากรูปมาวางหรือคลิกเพื่อเลือกจากคอม</p>
        <p className="text-xs text-[#9B9B9B] mt-0.5">JPG, PNG, WebP — เลือกได้หลายรูป</p>
      </div>
    </div>
  );
}
