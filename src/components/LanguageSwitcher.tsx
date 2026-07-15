"use client";
import { Globe, ChevronDown } from "lucide-react";
import { useLanguage, type Lang } from "@/store/language";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const OPTIONS: { value: Lang; label: string }[] = [
  { value: "th", label: "ไทย" },
  { value: "en", label: "English" },
  { value: "zh", label: "中文" },
];

export function LanguageSwitcher({
  variant = "dark",
  className = "",
}: {
  variant?: "light" | "dark";
  className?: string;
}) {
  const { lang, setLang } = useLanguage();
  const isLight = variant === "light";
  const current = OPTIONS.find((o) => o.value === lang)!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-md outline-none transition-colors ${
          isLight
            ? "bg-black/60 backdrop-blur-md text-white hover:bg-black/70"
            : "bg-[#F0EDE7] border border-[#E8E5E0] text-[#1A1A1A] hover:bg-[#E8E5E0]"
        } ${className}`}
      >
        <Globe size={13} />
        {current.label}
        <ChevronDown size={12} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-28">
        {OPTIONS.map((o) => (
          <DropdownMenuItem
            key={o.value}
            onClick={() => setLang(o.value)}
            className={lang === o.value ? "font-bold text-[#C8102E]" : ""}
          >
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
