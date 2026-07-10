"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Product } from "@/types";
import { useLanguage } from "@/store/language";

const schema = z.object({
  name: z.string().min(2),
  company: z.string().optional(),
  phone: z.string().min(9),
  email: z.string().email(),
  line_id: z.string().optional(),
  quantity: z.number().min(1),
  message: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface QuoteModalProps {
  product: Product;
  open: boolean;
  onClose: () => void;
}

export function QuoteModal({ product, open, onClose }: QuoteModalProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { quantity: 1 },
  });

  const onSubmit = async (_data: FormValues) => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    toast.success(
      t(
        "ส่งคำขอใบเสนอราคาเรียบร้อย! ทีมงานจะติดต่อกลับภายใน 24 ชม.",
        "Quote request sent! Our team will contact you within 24 hours."
      )
    );
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#1A1A1A]">
            {t("ขอใบเสนอราคา", "Request a Quote")}
          </DialogTitle>
          <p className="text-sm text-[#6B6B6B]">
            {product.sku} — {t(product.name_th, product.name_en)}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("ชื่อ-นามสกุล", "Full Name")} *</Label>
              <Input {...register("name")} className="mt-1" />
              {errors.name && (
                <p className="text-xs text-red-500 mt-1">
                  {t("กรุณากรอกชื่อ", "Name required")}
                </p>
              )}
            </div>
            <div>
              <Label>{t("บริษัท", "Company")}</Label>
              <Input {...register("company")} className="mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("เบอร์โทรศัพท์", "Phone")} *</Label>
              <Input {...register("phone")} className="mt-1" />
              {errors.phone && (
                <p className="text-xs text-red-500 mt-1">
                  {t("กรุณากรอกเบอร์โทร", "Phone required")}
                </p>
              )}
            </div>
            <div>
              <Label>LINE ID</Label>
              <Input {...register("line_id")} className="mt-1" />
            </div>
          </div>

          <div>
            <Label>Email *</Label>
            <Input {...register("email")} type="email" className="mt-1" />
            {errors.email && (
              <p className="text-xs text-red-500 mt-1">
                {t("กรุณากรอกอีเมล", "Valid email required")}
              </p>
            )}
          </div>

          <div>
            <Label>{t("จำนวนที่ต้องการ", "Quantity Needed")} *</Label>
            <Input
              {...register("quantity", { valueAsNumber: true })}
              type="number"
              min={1}
              className="mt-1"
            />
          </div>

          <div>
            <Label>{t("ข้อความเพิ่มเติม", "Additional Message")}</Label>
            <Textarea
              {...register("message")}
              placeholder={t(
                "เช่น ต้องการสีพิเศษ หรือขนาดที่แตกต่าง...",
                "e.g. special color or custom size..."
              )}
              className="mt-1"
              rows={3}
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#C8102E] hover:bg-[#a30d25] text-white"
          >
            {loading
              ? t("กำลังส่ง...", "Sending...")
              : t("ส่งคำขอ", "Send Request")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
