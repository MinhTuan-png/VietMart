import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatVND } from "@/lib/utils";
import { mockVnpayReturn } from "@/lib/payment/vnpay";

export const metadata = { title: "Cổng thanh toán (giả lập)" };

/**
 * Cổng thanh toán giả lập – dùng khi chưa cấu hình key sandbox hoặc PAYMENT_MODE=mock.
 * Trang này tạo dữ liệu trả về được KÝ bằng đúng thuật toán của VNPAY, nên luồng
 * xác thực chữ ký ở Return URL được kiểm thử giống hệt môi trường thật.
 */
export default async function MockGateway({ searchParams }: { searchParams: Promise<{ gateway?: string; order?: string }> }) {
  const { gateway, order: code } = await searchParams;
  const order = code ? await prisma.order.findUnique({ where: { code } }) : null;
  if (!order || gateway !== "vnpay") notFound();
  const ok = `/api/payment/vnpay/return?${mockVnpayReturn(order.code, order.total, true)}`;
  const fail = `/api/payment/vnpay/return?${mockVnpayReturn(order.code, order.total, false)}`;
  return (
    <div className="container-x py-10">
      <div className="mx-auto max-w-md overflow-hidden rounded-2xl bg-white shadow-lg">
        <div className="bg-[#005baa] px-6 py-5 text-white">
          <div className="text-xl font-bold">VNPAY <span className="text-sm font-normal opacity-80">· Môi trường giả lập</span></div>
          <div className="mt-1 text-sm opacity-90">Đơn hàng {order.code}</div>
        </div>
        <div className="space-y-4 p-6">
          <div className="flex justify-between text-sm"><span className="text-gray-500">Nhà cung cấp</span><span className="font-medium">VietMart</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-500">Số tiền</span><span className="text-xl font-bold text-gray-900">{formatVND(order.total)}</span></div>
          <div className="space-y-2 rounded-lg border p-4 text-sm">
            <div className="font-medium">Thẻ ATM nội địa – Ngân hàng NCB</div>
            <div className="text-gray-500">Số thẻ: 9704 1985 2619 1432 198</div>
            <div className="text-gray-500">Chủ thẻ: NGUYEN VAN A · Ngày phát hành: 07/15</div>
            <div className="text-gray-500">OTP: 123456</div>
          </div>
          <a href={ok} className="btn w-full bg-[#005baa] py-3 text-white hover:bg-[#004a8c]">Xác nhận thanh toán</a>
          <a href={fail} className="btn-ghost w-full">Hủy giao dịch</a>
          <p className="text-center text-xs text-gray-400">
            Cấu hình key sandbox trong <code>.env</code> để chuyển sang cổng thật. <Link href="/" className="underline">Về trang chủ</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
