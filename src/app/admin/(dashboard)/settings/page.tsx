import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-[#1A1A1A]">ตั้งค่า</h1>

      {/* Showroom info */}
      <section className="bg-white rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-[#1A1A1A]">ข้อมูลโชว์รูม</h2>
        <Separator />
        <div>
          <Label>ที่อยู่โชว์รูม</Label>
          <Textarea
            className="mt-1"
            defaultValue="ตึกฟูไท่ ชั้น 4 คลอง 8 ลำลูกกา ปทุมธานี"
            rows={2}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>เวลาเปิด</Label>
            <Input className="mt-1" defaultValue="09:00" type="time" />
          </div>
          <div>
            <Label>เวลาปิด</Label>
            <Input className="mt-1" defaultValue="18:00" type="time" />
          </div>
        </div>
        <Button className="bg-[#C8102E] hover:bg-[#a30d25] text-white">บันทึก</Button>
      </section>

      {/* Contact info */}
      <section className="bg-white rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-[#1A1A1A]">ข้อมูลติดต่อ</h2>
        <Separator />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>โทรศัพท์</Label>
            <Input className="mt-1" defaultValue="061 898 0412" />
          </div>
          <div>
            <Label>LINE OA ID</Label>
            <Input className="mt-1" defaultValue="660305099" />
          </div>
        </div>
        <div>
          <Label>อีเมล</Label>
          <Input className="mt-1" type="email" defaultValue="futai.furniture@gmail.com" />
        </div>
        <Button className="bg-[#C8102E] hover:bg-[#a30d25] text-white">บันทึก</Button>
      </section>

      {/* Hero banner */}
      <section className="bg-white rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-[#1A1A1A]">Hero Banner หน้าแรก</h2>
        <Separator />
        <div>
          <Label>หัวข้อหลัก (ภาษาไทย)</Label>
          <Input className="mt-1" defaultValue="เฟอร์นิเจอร์สำนักงาน คุณภาพพรีเมียม" />
        </div>
        <div>
          <Label>หัวข้อย่อย</Label>
          <Input className="mt-1" defaultValue="คลังสินค้าในไทย · ติดตั้งฟรี · บริการหลังขายจริง" />
        </div>
        <div>
          <Label>รูป Hero Banner</Label>
          <div className="mt-1 border-2 border-dashed border-[#E8E5E0] rounded-lg p-8 text-center">
            <p className="text-sm text-[#6B6B6B]">ลากไฟล์มาวางหรือคลิกเพื่อเลือกไฟล์</p>
            <p className="text-xs text-[#6B6B6B] mt-1">PNG, JPG ขนาดแนะนำ 1920×1080</p>
            <Button size="sm" variant="outline" className="mt-4">เลือกไฟล์</Button>
          </div>
        </div>
        <Button className="bg-[#C8102E] hover:bg-[#a30d25] text-white">บันทึก</Button>
      </section>
    </div>
  );
}
