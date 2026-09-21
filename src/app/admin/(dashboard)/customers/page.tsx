"use client";
import { useEffect, useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/store/language";
import type { Customer, Order } from "@/types";

export default function CustomersPage() {
  const { t } = useLanguage();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [customersRes, ordersRes] = await Promise.all([
        fetch("/api/admin/customers"),
        fetch("/api/admin/orders"),
      ]);
      const customersData = await customersRes.json();
      const ordersData = await ordersRes.json();
      if (!cancelled) {
        setCustomers(customersRes.ok ? customersData.customers : []);
        setOrders(ordersRes.ok ? ordersData.orders : []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">{t("ลูกค้า", "Customers", "客户")}</h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">
            {t(`ลูกค้าทั้งหมด ${customers.length} ราย`, `${customers.length} customers total`, `共 ${customers.length} 位客户`)}
          </p>
        </div>
        <Button size="sm" variant="outline">{t("ส่งออก CSV", "Export CSV", "导出CSV")}</Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#FAF7F2]">
              <TableHead className="text-xs">{t("ชื่อ", "Name", "姓名")}</TableHead>
              <TableHead className="text-xs">{t("บริษัท", "Company", "公司")}</TableHead>
              <TableHead className="text-xs">{t("โทรศัพท์", "Phone", "电话")}</TableHead>
              <TableHead className="text-xs">{t("อีเมล", "Email", "邮箱")}</TableHead>
              <TableHead className="text-xs">LINE ID</TableHead>
              <TableHead className="text-xs">{t("ออเดอร์", "Orders", "订单")}</TableHead>
              <TableHead className="text-xs">{t("สมัครเมื่อ", "Joined", "注册日期")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-[#6B6B6B]">
                  {t("กำลังโหลด...", "Loading...", "加载中...")}
                </TableCell>
              </TableRow>
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-[#6B6B6B]">
                  {t("ยังไม่มีลูกค้า", "No customers yet", "暂无客户")}
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => {
                const orderCount = orders.filter((o) => o.customer_id === customer.id).length;
                return (
                  <TableRow key={customer.id} className="hover:bg-[#FAF7F2]/50">
                    <TableCell className="font-medium text-sm">{customer.name}</TableCell>
                    <TableCell className="text-sm text-[#6B6B6B]">{customer.company}</TableCell>
                    <TableCell>
                      <a
                        href={`tel:${customer.phone}`}
                        className="text-sm text-[#C8102E] hover:underline"
                      >
                        {customer.phone}
                      </a>
                    </TableCell>
                    <TableCell className="text-xs text-[#6B6B6B]">{customer.email}</TableCell>
                    <TableCell className="text-xs">{customer.line_id}</TableCell>
                    <TableCell className="text-center text-sm">
                      <span className="px-2 py-1 bg-[#E8E5E0] rounded text-xs font-medium">
                        {orderCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-[#6B6B6B]">
                      {new Date(customer.created_at).toLocaleDateString("th-TH")}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
