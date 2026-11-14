import Link from "next/link";
import { listOrders } from "@/lib/admin-ops";
import { prisma } from "@/lib/db";
import { formatDate, formatVND, ORDER_STATUS, PAYMENT_STATUS } from "@/lib/utils";

export const metadata = { title: "Đơn hàng" };

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string; pay?: string }> }) {
  const sp = await searchParams;
  const page = Number(sp.page) || 1;
  const [{ items, total }, counts] = await Promise.all([
    listOrders({ status: sp.status, q: sp.q, paymentStatus: sp.pay, take: 20, skip: (page - 1) * 20 }),
    prisma.order.groupBy({ by: ["status"], _count: true }),
  ]);
  const qs = (p: Record<string, string | undefined>) => {
    const u = new URLSearchParams(Object.entries({ ...sp, ...p }).filter(([, v]) => v) as [string, string][]);
    return `/admin/orders?${u}`;
  };
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Đơn hàng</h1>
      <div className="card scrollbar-none flex overflow-x-auto text-sm">
        <Link href={qs({ status: undefined, page: undefined })} className={`border-b-2 px-4 py-3 whitespace-nowrap ${!sp.status ? "border-brand-500 text-brand-600" : "border-transparent"}`}>Tất cả</Link>
        {Object.entries(ORDER_STATUS).map(([k, v]) => (
          <Link key={k} href={qs({ status: k, page: undefined })} className={`border-b-2 px-4 py-3 whitespace-nowrap ${sp.status === k ? "border-brand-500 text-brand-600" : "border-transparent"}`}>
            {v.label} <span className="text-gray-400">({counts.find((c) => c.status === k)?._count ?? 0})</span>
          </Link>
        ))}
      </div>
      <form className="flex flex-wrap gap-2">
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        <input name="q" defaultValue={sp.q} placeholder="Tìm mã đơn, tên, SĐT..." className="input max-w-xs bg-white" />
        <select name="pay" defaultValue={sp.pay ?? ""} className="input max-w-[200px] bg-white">
          <option value="">Mọi trạng thái thanh toán</option>
          {Object.entries(PAYMENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button className="btn-primary">Lọc</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr><th className="p-3">Mã đơn</th><th>Khách hàng</th><th>Ngày đặt</th><th>SP</th><th>Thanh toán</th><th>Trạng thái</th><th className="p-3 text-right">Tổng tiền</th></tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <tr key={o.id} className="border-t hover:bg-gray-50">
                <td className="p-3"><Link href={`/admin/orders/${o.code}`} className="font-medium text-brand-600">{o.code}</Link></td>
                <td>{o.fullName}<div className="text-xs text-gray-500">{o.phone}</div></td>
                <td className="text-gray-500">{formatDate(o.createdAt)}</td>
                <td>{o._count.items}</td>
                <td>{o.paymentMethod}<div className={`text-xs ${PAYMENT_STATUS[o.paymentStatus].color}`}>{PAYMENT_STATUS[o.paymentStatus].label}</div></td>
                <td><span className={`rounded px-2 py-0.5 text-xs ${ORDER_STATUS[o.status].color}`}>{ORDER_STATUS[o.status].label}</span></td>
                <td className="p-3 text-right font-medium">{formatVND(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && <p className="p-8 text-center text-gray-500">Không có đơn hàng</p>}
      </div>
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{total} đơn hàng</span>
        <div className="flex gap-2">
          {page > 1 && <Link href={qs({ page: String(page - 1) })} className="btn-ghost">‹ Trước</Link>}
          {page * 20 < total && <Link href={qs({ page: String(page + 1) })} className="btn-ghost">Sau ›</Link>}
        </div>
      </div>
    </div>
  );
}
