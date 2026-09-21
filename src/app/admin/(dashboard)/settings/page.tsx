"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/store/language";

export default function SettingsPage() {
  const { t } = useLanguage();
  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-[#1A1A1A]">{t("ตั้งค่า", "Settings", "设置")}</h1>

      {/* Showroom info */}
      <section className="bg-white rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-[#1A1A1A]">{t("ข้อมูลโชว์รูม", "Showroom Info", "展厅信息")}</h2>
        <Separator />
        <div>
          <Label>{t("ที่อยู่โชว์รูม", "Showroom Address", "展厅地址")}</Label>
          <Textarea
            className="mt-1"
            defaultValue="ตึกฟูไท่ ชั้น 4 คลอง 8 ลำลูกกา ปทุมธานี"
            rows={2}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{t("เวลาเปิด", "Opening Time", "开门时间")}</Label>
            <Input className="mt-1" defaultValue="09:00" type="time" />
          </div>
          <div>
            <Label>{t("เวลาปิด", "Closing Time", "关门时间")}</Label>
            <Input className="mt-1" defaultValue="18:00" type="time" />
          </div>
        </div>
        <Button className="bg-[#C8102E] hover:bg-[#a30d25] text-white">{t("บันทึก", "Save", "保存")}</Button>
      </section>

      {/* Contact info */}
      <section className="bg-white rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-[#1A1A1A]">{t("ข้อมูลติดต่อ", "Contact Info", "联系信息")}</h2>
        <Separator />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{t("โทรศัพท์", "Phone", "电话")}</Label>
            <Input className="mt-1" defaultValue="061 898 0412" />
          </div>
          <div>
            <Label>LINE OA ID</Label>
            <Input className="mt-1" defaultValue="660305099" />
          </div>
        </div>
        <div>
          <Label>{t("อีเมล", "Email", "邮箱")}</Label>
          <Input className="mt-1" type="email" defaultValue="futai.furniture@gmail.com" />
        </div>
        <Button className="bg-[#C8102E] hover:bg-[#a30d25] text-white">{t("บันทึก", "Save", "保存")}</Button>
      </section>

      {/* Hero banner */}
      <section className="bg-white rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-[#1A1A1A]">{t("Hero Banner หน้าแรก", "Homepage Hero Banner", "首页主横幅")}</h2>
        <Separator />
        <div>
          <Label>{t("หัวข้อหลัก (ภาษาไทย)", "Main Heading (Thai)", "主标题（泰语）")}</Label>
          <Input className="mt-1" defaultValue="เฟอร์นิเจอร์สำนักงาน คุณภาพพรีเมียม" />
        </div>
        <div>
          <Label>{t("หัวข้อย่อย", "Subheading", "副标题")}</Label>
          <Input className="mt-1" defaultValue="คลังสินค้าในไทย · ติดตั้งฟรี · บริการหลังขายจริง" />
        </div>
        <div>
          <Label>{t("รูป Hero Banner", "Hero Banner Image", "主横幅图片")}</Label>
          <div className="mt-1 border-2 border-dashed border-[#E8E5E0] rounded-lg p-8 text-center">
            <p className="text-sm text-[#6B6B6B]">{t("ลากไฟล์มาวางหรือคลิกเพื่อเลือกไฟล์", "Drag a file here or click to choose a file", "拖放文件或点击选择文件")}</p>
            <p className="text-xs text-[#6B6B6B] mt-1">{t("PNG, JPG ขนาดแนะนำ 1920×1080", "PNG, JPG — recommended size 1920×1080", "PNG、JPG，建议尺寸 1920×1080")}</p>
            <Button size="sm" variant="outline" className="mt-4">{t("เลือกไฟล์", "Choose File", "选择文件")}</Button>
          </div>
        </div>
        <Button className="bg-[#C8102E] hover:bg-[#a30d25] text-white">{t("บันทึก", "Save", "保存")}</Button>
      </section>
    </div>
  );
}
