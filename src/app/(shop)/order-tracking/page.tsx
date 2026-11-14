import { prisma } from "@/lib/db";
import { formatVND, ORDER_STATUS } from "@/lib/utils";
import OrderTimeline from "@/components/OrderTimeline";

export const metadata = { title: "Tra cứu đơn hàng" };

export default async function TrackingPage({ searchParams }: { searchParams: Promise<{ code?: string; phone?: string }> }) {
  const { code, phone } = await searchParams;
  const order = code && phone ? await prisma.order.findFirst({ where: { code: code.trim().toUpperCase(), phone: phone.trim() }, include: { history: { orderBy: { createdAt: "asc" } }, items: true } }) : null;
  return (
    <div className="container-x py-8">
      <div className="card mx-auto max-w-2xl p-6">
        <h1 className="mb-1 text-xl font-semibold">Tra cứu đơn hàng</h1>
        <p className="mb-4 text-sm text-gray-500">Nhập mã đơn hàng và số điện thoại đặt hàng để xem hành trình đơn.</p>
        <form className="flex flex-col gap-2 sm:flex-row">
          <input name="code" defaultValue={code} placeholder="Mã đơn hàng (VD: VM2610...)" className="input" required />
          <input name="phone" defaultValue={phone} placeholder="Số điện thoại" className="input" required />
          <button className="btn-primary shrink-0">Tra cứu</button>
        </form>
        {code && phone && !order && <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-600">Không tìm thấy đơn hàng phù hợp.</p>}
        {order && (
          <div className="mt-6 space-y-4">
            <div className="flex justify-between text-sm"><span>Đơn <b>{order.code}</b> · {order.items.length} sản phẩm · <b className="text-brand-600">{formatVND(order.total)}</b></span><span className={`rounded px-2 py-0.5 text-xs ${ORDER_STATUS[order.status].color}`}>{ORDER_STATUS[order.status].label}</span></div>
            <OrderTimeline status={order.status} history={order.history} />
          </div>
        )}
      </div>
    </div>
  );
}
