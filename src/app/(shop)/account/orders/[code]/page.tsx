import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatVND, ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS, SHIPPING_METHODS } from "@/lib/utils";
import OrderTimeline from "@/components/OrderTimeline";
import CancelOrderButton from "@/components/CancelOrderButton";
import RetryPayButton from "@/components/RetryPayButton";
import ProductImage from "@/components/ProductImage";

export default async function OrderDetail({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await requireUser(`/account/orders/${code}`);
  const o = await prisma.order.findFirst({
    where: { code, userId: user.id },
    include: { items: { include: { product: { select: { slug: true } } } }, history: { orderBy: { createdAt: "asc" } } },
  });
  if (!o) notFound();
  const canCancel = o.status === "PENDING" || o.status === "CONFIRMED";
  const needPay = o.paymentMethod !== "COD" && o.paymentStatus !== "PAID" && o.status === "PENDING";
  return (
    <div className="space-y-3">
      <div className="card flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
        <Link href="/account/orders" className="text-gray-500 hover:text-brand-600">‹ Trở lại</Link>
        <span>Mã đơn hàng: <b>{o.code}</b> | <span className="font-medium text-brand-600 uppercase">{ORDER_STATUS[o.status].label}</span></span>
      </div>
      <div className="card p-6"><OrderTimeline status={o.status} history={o.history} /></div>
      {(needPay || canCancel) && (
        <div className="card flex flex-wrap items-center gap-3 p-4">
          {needPay && <><span className="text-sm text-amber-600">Đơn hàng chưa được thanh toán.</span><RetryPayButton code={o.code} label={`Thanh toán ngay ${formatVND(o.total)}`} /></>}
          {canCancel && <CancelOrderButton orderId={o.id} />}
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="card p-4 text-sm">
          <div className="mb-2 font-semibold">Địa chỉ nhận hàng</div>
          <div className="font-medium">{o.fullName}</div>
          <div className="text-gray-600">{o.phone}</div>
          <div className="text-gray-600">{o.address}</div>
          {o.note && <div className="mt-2 text-gray-500">Ghi chú: {o.note}</div>}
        </div>
        <div className="card p-4 text-sm">
          <div className="mb-2 font-semibold">Thanh toán & vận chuyển</div>
          <div>{PAYMENT_METHOD[o.paymentMethod]}</div>
          <div className={PAYMENT_STATUS[o.paymentStatus].color}>{PAYMENT_STATUS[o.paymentStatus].label}{o.transactionId ? ` · Mã GD ${o.transactionId}` : ""}</div>
          <div className="text-gray-600">{SHIPPING_METHODS[o.shippingMethod as keyof typeof SHIPPING_METHODS]?.label}</div>
          {o.cancelReason && <div className="mt-2 text-gray-500">Lý do hủy: {o.cancelReason}</div>}
        </div>
      </div>
      <div className="card p-4">
        {o.items.map((i) => (
          <div key={i.id} className="flex items-center gap-3 border-b py-3 text-sm last:border-0">
            <ProductImage src={i.thumbnail} alt={i.name} className="h-16 w-16 rounded border" />
            <div className="flex-1">
              <Link href={`/p/${i.product.slug}`} className="line-clamp-2 hover:text-brand-600">{i.name}</Link>
              <div className="text-gray-500">x{i.quantity}</div>
            </div>
            <div className="text-right">
              <div className="text-brand-600">{formatVND(i.price * i.quantity)}</div>
              {o.status === "DELIVERED" && <Link href={`/p/${i.product.slug}#reviews`} className="text-xs text-brand-600 underline">Đánh giá</Link>}
            </div>
          </div>
        ))}
        <div className="ml-auto mt-3 max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Tổng tiền hàng</span><span>{formatVND(o.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Phí vận chuyển</span><span>{formatVND(o.shippingFee)}</span></div>
          {o.discount > 0 && <div className="flex justify-between"><span className="text-gray-500">Giảm giá {o.couponCode && `(${o.couponCode})`}</span><span>-{formatVND(o.discount)}</span></div>}
          <div className="flex justify-between border-t pt-2"><span>Thành tiền</span><span className="text-xl font-semibold text-brand-600">{formatVND(o.total)}</span></div>
        </div>
      </div>
    </div>
  );
}
