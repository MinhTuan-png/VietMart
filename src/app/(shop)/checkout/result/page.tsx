import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatVND, PAYMENT_METHOD } from "@/lib/utils";
import RetryPayButton from "@/components/RetryPayButton";

export const metadata = { title: "Kết quả đặt hàng" };

export default async function ResultPage({ searchParams }: { searchParams: Promise<{ order?: string; status?: string; msg?: string; payerr?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser("/account/orders");
  const order = await prisma.order.findFirst({ where: { code: sp.order ?? "", userId: user.id } });
  if (!order) notFound();
  const paid = order.paymentStatus === "PAID";
  const cod = order.paymentMethod === "COD";
  const ok = cod || paid;
  return (
    <div className="container-x py-10">
      <div className="card mx-auto max-w-lg p-8 text-center">
        {ok ? <CheckCircle2 size={64} className="mx-auto text-emerald-500" /> : sp.status === "failed" || sp.payerr ? <XCircle size={64} className="mx-auto text-red-500" /> : <Clock size={64} className="mx-auto text-amber-500" />}
        <h1 className="mt-4 text-2xl font-semibold">
          {ok ? (cod ? "Đặt hàng thành công!" : "Thanh toán thành công!") : sp.status === "invalid" ? "Chữ ký giao dịch không hợp lệ" : "Thanh toán chưa hoàn tất"}
        </h1>
        <p className="mt-2 text-gray-600">
          {ok
            ? "Cảm ơn bạn đã mua sắm tại VietMart. Đơn hàng sẽ sớm được xác nhận và giao đến bạn."
            : sp.msg || (sp.payerr ? "Không kết nối được cổng thanh toán. Bạn có thể thử lại." : "Đơn hàng đã được tạo, bạn có thể thanh toán lại bất cứ lúc nào.")}
        </p>
        <div className="mt-6 space-y-2 rounded-lg bg-gray-50 p-4 text-left text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Mã đơn hàng</span><b>{order.code}</b></div>
          <div className="flex justify-between"><span className="text-gray-500">Phương thức</span><span>{PAYMENT_METHOD[order.paymentMethod]}</span></div>
          {order.transactionId && <div className="flex justify-between"><span className="text-gray-500">Mã giao dịch</span><span>{order.transactionId}</span></div>}
          <div className="flex justify-between"><span className="text-gray-500">Tổng tiền</span><b className="text-brand-600">{formatVND(order.total)}</b></div>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {!ok && order.status !== "CANCELLED" && <RetryPayButton code={order.code} />}
          <Link href={`/account/orders/${order.code}`} className="btn-ghost">Xem đơn hàng</Link>
          <Link href="/" className="btn-outline">Tiếp tục mua sắm</Link>
        </div>
      </div>
    </div>
  );
}
