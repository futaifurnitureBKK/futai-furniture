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

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    const res = await fetch("/api/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        product_sku: product.sku,
      }),
    });
    setLoading(false);

    if (!res.ok) {
      toast.error(t("ส่งคำขอไม่สำเร็จ กรุณาลองใหม่", "Failed to send request, please try again", "发送失败，请重试"));
      return;
    }

    toast.success(
      t(
        "ส่งคำขอใบเสนอราคาเรียบร้อย! ทีมงานจะติดต่อกลับภายใน 24 ชม.",
        "Quote request sent! Our team will contact you within 24 hours.",
        "报价申请已提交！我们的团队将在24小时内与您联系"
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
            {t("ขอใบเสนอราคา", "Request a Quote", "索取报价")}
          </DialogTitle>
          <p className="text-sm text-[#6B6B6B]">
            {product.sku} — {t(product.name_th, product.name_en, product.name_zh)}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("ชื่อ-นามสกุล", "Full Name", "姓名")} *</Label>
              <Input {...register("name")} className="mt-1" />
              {errors.name && (
                <p className="text-xs text-red-500 mt-1">
                  {t("กรุณากรอกชื่อ", "Name required", "请输入姓名")}
                </p>
              )}
            </div>
            <div>
              <Label>{t("บริษัท", "Company", "公司")}</Label>
              <Input {...register("company")} className="mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("เบอร์โทรศัพท์", "Phone", "电话号码")} *</Label>
              <Input {...register("phone")} className="mt-1" />
              {errors.phone && (
                <p className="text-xs text-red-500 mt-1">
                  {t("กรุณากรอกเบอร์โทร", "Phone required", "请输入电话号码")}
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
                {t("กรุณากรอกอีเมล", "Valid email required", "请输入有效邮箱")}
              </p>
            )}
          </div>

          <div>
            <Label>{t("จำนวนที่ต้องการ", "Quantity Needed", "所需数量")} *</Label>
            <Input
              {...register("quantity", { valueAsNumber: true })}
              type="number"
              min={1}
              className="mt-1"
            />
          </div>

          <div>
            <Label>{t("ข้อความเพิ่มเติม", "Additional Message", "补充说明")}</Label>
            <Textarea
              {...register("message")}
              placeholder={t(
                "เช่น ต้องการสีพิเศษ หรือขนาดที่แตกต่าง...",
                "e.g. special color or custom size...",
                "如：需要特殊颜色或定制尺寸..."
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
              ? t("กำลังส่ง...", "Sending...", "发送中...")
              : t("ส่งคำขอ", "Send Request", "发送请求")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
