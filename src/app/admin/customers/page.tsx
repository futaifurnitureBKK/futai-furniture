import { MOCK_CUSTOMERS, MOCK_ORDERS } from "@/data/mock";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">ลูกค้า</h1>
          <p className="text-sm text-[#6B6B6B] mt-0.5">
            ลูกค้าทั้งหมด {MOCK_CUSTOMERS.length} ราย
          </p>
        </div>
        <Button size="sm" variant="outline">Export CSV</Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#FAF7F2]">
              <TableHead className="text-xs">ชื่อ</TableHead>
              <TableHead className="text-xs">บริษัท</TableHead>
              <TableHead className="text-xs">โทรศัพท์</TableHead>
              <TableHead className="text-xs">อีเมล</TableHead>
              <TableHead className="text-xs">LINE ID</TableHead>
              <TableHead className="text-xs">ออเดอร์</TableHead>
              <TableHead className="text-xs">สมัครเมื่อ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_CUSTOMERS.map((customer) => {
              const orderCount = MOCK_ORDERS.filter(
                (o) => o.customer_id === customer.id
              ).length;
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
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
