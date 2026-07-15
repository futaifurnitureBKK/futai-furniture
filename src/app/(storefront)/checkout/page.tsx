"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCart } from "@/store/cart";
import { useLanguage } from "@/store/language";
import { FadeIn } from "@/components/animations/FadeIn";

const schema = z.object({
  name: z.string().min(2),
  company: z.string().optional(),
  phone: z.string().min(9),
  email: z.string().email(),
  line_id: z.string().optional(),
  address: z.string().optional(),
  delivery_method: z.enum(["pickup", "delivery"]),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function CheckoutPage() {
  const { items, clearCart, hasUnpricedItems } = useCart();
  const { t } = useLanguage();
  const [submitted, setSubmitted] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [submitError, setSubmitError] = useState("");

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { delivery_method: "delivery" },
  });

  const onSubmit = async (data: FormValues) => {
    setSubmitError("");
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        items: items.map((i) => ({
          sku: i.product.sku,
          quantity: i.quantity,
        })),
      }),
    });

    if (!res.ok) {
      setSubmitError(t("ส่งคำสั่งซื้อไม่สำเร็จ กรุณาลองใหม่", "Failed to submit order, please try again", "提交失败，请重试"));
      return;
    }

    const { order } = await res.json();
    setOrderNumber(order.order_number);
    clearCart();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="bg-[#FAF7F2] min-h-screen flex flex-col items-center justify-center text-center px-4 pt-16">
        <div className="bg-white rounded-2xl p-10 max-w-md w-full shadow-sm">
          <CheckCircle2 size={56} className="text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">
            {t("ส่งคำสั่งซื้อเรียบร้อย!", "Order Submitted!", "订单已提交！")}
          </h1>
          <p className="text-[#6B6B6B] text-sm mb-1">
            {t("หมายเลขคำสั่งซื้อ", "Order Number", "订单编号")}
          </p>
          <p className="text-2xl font-mono font-bold text-[#C8102E] mb-6">
            {orderNumber}
          </p>
          <p className="text-sm text-[#6B6B6B] mb-8">
            {t(
              "ทีมงานจะติดต่อกลับภายใน 24 ชั่วโมง ผ่านทางโทรศัพท์หรือ LINE",
              "Our team will contact you within 24 hours via phone or LINE.",
              "我们的团队将在24小时内通过电话或LINE与您联系"
            )}
          </p>
          <a
            href="https://line.me/R/ti/p/660305099"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-[#06C755] hover:bg-[#05b34d] text-white text-center py-3 rounded-lg font-medium transition-colors"
          >
            {t("ติดตามผ่าน LINE OA", "Follow up on LINE OA", "通过 LINE OA 跟进")}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF7F2] min-h-screen pt-20">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <FadeIn>
          <h1 className="text-3xl font-bold text-[#1A1A1A] mb-8">
            {hasUnpricedItems()
              ? t("ส่งคำขอใบเสนอราคา", "Request Quote", "索取报价")
              : t("ดำเนินการสั่งซื้อ", "Checkout", "结算")}
          </h1>
        </FadeIn>

        <FadeIn delay={0.1}>
          <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl p-6 shadow-sm space-y-5">
            <h2 className="font-semibold text-[#1A1A1A] text-lg border-b border-[#E8E5E0] pb-3">
              {t("ข้อมูลติดต่อ", "Contact Information", "联系信息")}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{t("ชื่อ-นามสกุล", "Full Name", "姓名")} *</Label>
                <Input {...register("name")} className="mt-1" />
                {errors.name && <p className="text-xs text-red-500 mt-1">{t("กรุณากรอกชื่อ", "Required", "必填")}</p>}
              </div>
              <div>
                <Label>{t("ชื่อบริษัท", "Company", "公司名称")}</Label>
                <Input {...register("company")} className="mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{t("เบอร์โทรศัพท์", "Phone", "电话号码")} *</Label>
                <Input {...register("phone")} className="mt-1" />
                {errors.phone && <p className="text-xs text-red-500 mt-1">{t("กรุณากรอกเบอร์โทร", "Required", "必填")}</p>}
              </div>
              <div>
                <Label>LINE ID</Label>
                <Input {...register("line_id")} className="mt-1" />
              </div>
            </div>

            <div>
              <Label>Email *</Label>
              <Input {...register("email")} type="email" className="mt-1" />
              {errors.email && <p className="text-xs text-red-500 mt-1">{t("กรุณากรอกอีเมล", "Required", "必填")}</p>}
            </div>

            <div>
              <Label className="mb-3 block">
                {t("วิธีรับสินค้า", "Delivery Method", "收货方式")} *
              </Label>
              <RadioGroup defaultValue="delivery" className="grid grid-cols-2 gap-3">
                <Label className="flex items-center gap-3 border border-[#E8E5E0] rounded-lg p-3 cursor-pointer has-[[data-state=checked]]:border-[#C8102E] has-[[data-state=checked]]:bg-[#C8102E]/5">
                  <RadioGroupItem value="delivery" {...register("delivery_method")} />
                  <div>
                    <p className="font-medium text-sm">{t("จัดส่งถึงบ้าน", "Delivery", "配送")}</p>
                    <p className="text-xs text-[#6B6B6B]">{t("นัดวันกับทีมงาน", "Schedule with team", "与团队预约时间")}</p>
                  </div>
                </Label>
                <Label className="flex items-center gap-3 border border-[#E8E5E0] rounded-lg p-3 cursor-pointer has-[[data-state=checked]]:border-[#C8102E] has-[[data-state=checked]]:bg-[#C8102E]/5">
                  <RadioGroupItem value="pickup" {...register("delivery_method")} />
                  <div>
                    <p className="font-medium text-sm">{t("รับที่โชว์รูม", "Pickup", "到店自取")}</p>
                    <p className="text-xs text-[#6B6B6B]">{t("ลำลูกกา ปทุมธานี", "Lam Luk Ka, Pathum Thani", "兰鲁卡，巴吞他尼")}</p>
                  </div>
                </Label>
              </RadioGroup>
            </div>

            {watch("delivery_method") === "delivery" && (
              <div>
                <Label>{t("ที่อยู่จัดส่ง", "Delivery Address", "送货地址")}</Label>
                <Textarea {...register("address")} className="mt-1" rows={3} />
              </div>
            )}

            <div>
              <Label>{t("หมายเหตุเพิ่มเติม", "Notes", "备注")}</Label>
              <Textarea
                {...register("notes")}
                placeholder={t(
                  "เช่น ต้องการใบกำกับภาษี, นัดเวลาส่ง...",
                  "e.g. VAT invoice required, preferred delivery time...",
                  "如：需要增值税发票、指定送货时间..."
                )}
                className="mt-1"
                rows={3}
              />
            </div>

            {submitError && <p className="text-sm text-red-500">{submitError}</p>}

            <Button
              type="submit"
              disabled={isSubmitting || items.length === 0}
              className="w-full h-12 bg-[#C8102E] hover:bg-[#a30d25] text-white text-base"
            >
              {isSubmitting
                ? t("กำลังส่ง...", "Submitting...", "提交中...")
                : hasUnpricedItems()
                ? t("ส่งคำขอ", "Submit Request", "提交申请")
                : t("ยืนยันคำสั่งซื้อ", "Place Order", "确认下单")}
            </Button>
          </form>
        </FadeIn>
      </div>
    </div>
  );
}
