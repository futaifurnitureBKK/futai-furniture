"use client";
import { useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import { Bold, Italic, List, ListOrdered, ImageIcon, Loader2 } from "lucide-react";
import { useState } from "react";

export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapImage.configure({ HTMLAttributes: { class: "rounded-lg max-w-full" } }),
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[120px] px-3 py-2 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  async function insertImages(files: FileList | File[]) {
    if (!editor) return;
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) return;

    setUploading(true);
    const failed: string[] = [];
    for (const file of imageFiles) {
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/products/upload", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        editor.chain().focus("end").setImage({ src: data.url }).run();
      } catch {
        failed.push(file.name);
      }
    }
    setUploading(false);
    if (failed.length > 0) alert(`อัปโหลดไม่สำเร็จ: ${failed.join(", ")}`);
  }

  if (!editor) return null;

  return (
    <div className="border border-[#E8E5E0] rounded-md overflow-hidden bg-white">
      <div className="flex items-center gap-1 border-b border-[#E8E5E0] px-2 py-1.5 bg-[#FAF7F2]">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded hover:bg-white ${editor.isActive("bold") ? "bg-white text-[#C8102E]" : "text-[#6B6B6B]"}`}
        >
          <Bold size={14} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded hover:bg-white ${editor.isActive("italic") ? "bg-white text-[#C8102E]" : "text-[#6B6B6B]"}`}
        >
          <Italic size={14} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded hover:bg-white ${editor.isActive("bulletList") ? "bg-white text-[#C8102E]" : "text-[#6B6B6B]"}`}
        >
          <List size={14} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded hover:bg-white ${editor.isActive("orderedList") ? "bg-white text-[#C8102E]" : "text-[#6B6B6B]"}`}
        >
          <ListOrdered size={14} />
        </button>
        <div className="w-px h-4 bg-[#E8E5E0] mx-1" />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="p-1.5 rounded hover:bg-white text-[#6B6B6B] disabled:opacity-50"
          title="แทรกรูปภาพ"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) insertImages(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      <EditorContent editor={editor} placeholder={placeholder} />
    </div>
  );
}
