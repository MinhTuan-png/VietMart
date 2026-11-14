import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { nextStatuses } from "@/lib/orders";
import { formatDate, formatVND, ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } from "@/lib/utils";
import { adminMarkPaid, adminSetOrderStatus } from "@/app/actions/admin";
import ActionButton from "@/components/admin/ActionButton";
import OrderTimeline from "@/components/OrderTimeline";
import ProductImage from "@/components/ProductImage";

export default async function AdminOrderDetail({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const o = await prisma.order.findUnique({ where: { code }, include: { items: true, history: { orderBy: { createdAt: "asc" } }, user: { select: { email: true, name: true, _count: { select: { orders: true } } } } } });
  if (!o) notFound();
  const next = nextStatuses(o.status);
  return (
    <div className="space-y-4">
      <Link href="/admin/orders" className="text-sm text-gray-500">‹ Danh sách đơn</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Đơn {o.code}</h1>
        <span className={`rounded px-2 py-0.5 text-sm ${ORDER_STATUS[o.status].color}`}>{ORDER_STATUS[o.status].label}</span>
        <span className={`text-sm ${PAYMENT_STATUS[o.paymentStatus].color}`}>{PAYMENT_STATUS[o.paymentStatus].label}</span>
      </div>
      <div className="card flex flex-wrap items-center gap-2 p-4">
        <span className="mr-2 text-sm text-gray-500">Chuyển trạng thái:</span>
        {next.map((s) => (
          <ActionButton key={s} action={adminSetOrderStatus.bind(null, o.code, s, undefined)} className={s === "CANCELLED" || s === "RETURNED" ? "btn-ghost" : "btn-primary"} confirmText={`Chuyển đơn sang "${ORDER_STATUS[s].label}"?`} success="Đã cập nhật đơn hàng">
            {ORDER_STATUS[s].label}
          </ActionButton>
        ))}
        {!next.length && <span className="text-sm text-gray-400">Đơn đã kết thúc</span>}
        {o.paymentStatus !== "PAID" && o.status !== "CANCELLED" && o.paymentMethod !== "COD" && (
          <ActionButton action={adminMarkPaid.bind(null, o.code)} className="btn-outline ml-auto" confirmText="Xác nhận đã nhận tiền?">Xác nhận đã thanh toán</ActionButton>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          {o.items.map((i) => (
            <div key={i.id} className="flex items-center gap-3 border-b py-3 text-sm last:border-0">
              <ProductImage src={i.thumbnail} alt={i.name} className="h-14 w-14 rounded border" />
              <span className="flex-1">{i.name}</span>
              <span className="text-gray-500">{formatVND(i.price)} × {i.quantity}</span>
              <span className="w-28 text-right font-medium">{formatVND(i.price * i.quantity)}</span>
            </div>
          ))}
          <div className="ml-auto mt-3 max-w-xs space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Tạm tính</span><span>{formatVND(o.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Vận chuyển ({o.shippingMethod})</span><span>{formatVND(o.shippingFee)}</span></div>
            {o.discount > 0 && <div className="flex justify-between"><span className="text-gray-500">Giảm ({o.couponCode})</span><span>-{formatVND(o.discount)}</span></div>}
            <div className="flex justify-between border-t pt-2 text-base font-bold"><span>Tổng</span><span className="text-brand-600">{formatVND(o.total)}</span></div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="card space-y-1 p-5 text-sm">
            <div className="mb-2 font-semibold">Khách hàng</div>
            <div>{o.user.name} · {o.user.email}</div>
            <div className="text-gray-500">{o.user._count.orders} đơn hàng</div>
            <div className="mt-3 mb-1 font-semibold">Giao đến</div>
            <div>{o.fullName} · {o.phone}</div>
            <div className="text-gray-600">{o.address}</div>
            {o.note && <div className="mt-2 rounded bg-amber-50 p-2">📝 {o.note}</div>}
            <div className="mt-3 mb-1 font-semibold">Thanh toán</div>
            <div>{PAYMENT_METHOD[o.paymentMethod]}</div>
            {o.transactionId && <div className="text-gray-500">Mã GD: {o.transactionId}</div>}
            {o.paidAt && <div className="text-gray-500">Thanh toán lúc {formatDate(o.paidAt)}</div>}
          </div>
          <div className="card p-5"><div className="mb-3 font-semibold">Lịch sử</div><OrderTimeline status={o.status} history={o.history} /></div>
        </div>
      </div>
    </div>
  );
}
