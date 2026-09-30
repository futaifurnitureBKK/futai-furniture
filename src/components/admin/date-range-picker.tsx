"use client";
import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { DayPicker, type DateRange } from "react-day-picker";
import "react-day-picker/style.css";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/store/language";

function toDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function toStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// A single popover calendar for picking a "from - to" range — click the
// start day, then the end day (or drag across them); the range previews
// live as you move the mouse before the second click.
export function DateRangePicker({
  from, to, onChange, onClear, className,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  onClear?: () => void;
  className?: string;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>({ from: toDate(from), to: toDate(to) });

  // Re-seed the draft from the current from/to whenever the popover opens —
  // adjusted during render (React's recommended way to reset state in
  // response to a prop/flag change) rather than in an effect.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setDraft({ from: toDate(from), to: toDate(to) });
  }

  function apply() {
    if (draft?.from) {
      const f = toStr(draft.from);
      const tt = draft.to ? toStr(draft.to) : f;
      onChange(f, tt);
    }
    setOpen(false);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className={cn(
          "h-8 inline-flex items-center gap-1.5 rounded-lg border border-[#E8E5E0] bg-white px-2.5 text-xs text-[#1A1A1A] hover:border-[#C8102E]/40 transition-colors",
          className
        )}
      >
        <CalendarDays size={13} className="text-[#6B6B6B]" />
        {from === to ? from : `${from} → ${to}`}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="end">
          <Popover.Popup className="z-50 rounded-xl bg-white p-3 shadow-lg ring-1 ring-[#E8E5E0] data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <DayPicker
              mode="range"
              numberOfMonths={2}
              defaultMonth={toDate(from)}
              selected={draft}
              onSelect={setDraft}
              className="text-xs"
              classNames={{
                today: "font-bold text-[#C8102E]",
                selected: "text-white",
                range_start: "bg-[#C8102E] text-white rounded-l-full",
                range_end: "bg-[#C8102E] text-white rounded-r-full",
                range_middle: "bg-[#C8102E]/15 text-[#1A1A1A]",
                day_button: "rounded-full hover:bg-[#FAF7F2]",
              }}
            />
            <div className="flex items-center justify-between gap-2 mt-1 pt-2 border-t border-[#F0EDE6]">
              <button
                type="button"
                onClick={() => {
                  setDraft(undefined);
                  onClear?.();
                  setOpen(false);
                }}
                className="text-xs text-[#9CA3AF] hover:text-[#1A1A1A] underline"
              >
                {t("ล้าง", "Clear", "清除")}
              </button>
              <button
                type="button"
                onClick={apply}
                disabled={!draft?.from}
                className="text-xs font-semibold bg-[#C8102E] text-white rounded-md px-3 py-1.5 hover:bg-[#a30d25] disabled:opacity-40"
              >
                {t("ตกลง", "Apply", "确定")}
              </button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
