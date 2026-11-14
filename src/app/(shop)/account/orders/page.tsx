import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatVND, ORDER_STATUS, PAYMENT_STATUS } from "@/lib/utils";
import ProductImage from "@/components/ProductImage";

export const metadata = { title: "Đơn mua" };

const TABS = [["", "Tất cả"], ["PENDING", "Chờ xác nhận"], ["CONFIRMED", "Chờ lấy hàng"], ["SHIPPING", "Đang giao"], ["DELIVERED", "Hoàn thành"], ["CANCELLED", "Đã hủy"], ["RETURNED", "Trả hàng"]];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const user = await requireUser("/account/orders");
  const orders = await prisma.order.findMany({
    where: { userId: user.id, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    include: { items: true },
    take: 50,
  });
  return (
    <div className="space-y-3">
      <div className="card scrollbar-none flex overflow-x-auto">
        {TABS.map(([v, label]) => (
          <Link key={v} href={v ? `/account/orders?status=${v}` : "/account/orders"} className={`flex-1 border-b-2 px-4 py-3 text-center text-sm whitespace-nowrap ${(status ?? "") === v ? "border-brand-500 text-brand-600" : "border-transparent hover:text-brand-600"}`}>{label}</Link>
        ))}
      </div>
      {orders.map((o) => (
        <Link key={o.id} href={`/account/orders/${o.code}`} className="card block p-4 hover:shadow-md">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-3 text-sm">
            <span className="text-gray-500">Mã đơn <b className="text-gray-800">{o.code}</b> · {formatDate(o.createdAt)}</span>
            <span className="flex items-center gap-2">
              <span className={`text-xs ${PAYMENT_STATUS[o.paymentStatus].color}`}>{PAYMENT_STATUS[o.paymentStatus].label}</span>
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${ORDER_STATUS[o.status].color}`}>{ORDER_STATUS[o.status].label}</span>
            </span>
          </div>
          {o.items.slice(0, 3).map((i) => (
            <div key={i.id} className="flex items-center gap-3 py-1.5 text-sm">
              <ProductImage src={i.thumbnail} alt={i.name} className="h-14 w-14 rounded border" />
              <span className="line-clamp-1 flex-1">{i.name} <span className="text-gray-500">x{i.quantity}</span></span>
              <span>{formatVND(i.price)}</span>
            </div>
          ))}
          {o.items.length > 3 && <div className="text-xs text-gray-500">+{o.items.length - 3} sản phẩm khác</div>}
          <div className="mt-2 text-right text-sm">Thành tiền: <span className="text-lg font-semibold text-brand-600">{formatVND(o.total)}</span></div>
        </Link>
      ))}
      {!orders.length && <div className="card py-16 text-center text-gray-500">📦 Chưa có đơn hàng</div>}
    </div>
  );
}
