import { NextResponse, type NextRequest } from "next/server";
import { verifyVnpay, VNPAY_MESSAGES } from "@/lib/payment/vnpay";
import { markOrderPaid, markOrderPaymentFailed } from "@/lib/orders";

// Khách được VNPAY redirect về đây sau khi thanh toán.
// (IPN mới là nguồn tin cậy chính; ở localhost VNPAY không gọi được IPN nên Return cũng cập nhật – thao tác idempotent.)
export async function GET(req: NextRequest) {
  const q = Object.fromEntries(req.nextUrl.searchParams);
  const r = verifyVnpay(q);
  const to = new URL(`/checkout/result?order=${r.orderCode ?? ""}`, req.url);
  if (!r.valid) {
    to.searchParams.set("status", "invalid");
    return NextResponse.redirect(to);
  }
  if (r.success) {
    const m = await markOrderPaid(r.orderCode, r.amount, r.transactionNo, "VNPAY");
    to.searchParams.set("status", m.ok ? "success" : "invalid");
  } else {
    await markOrderPaymentFailed(r.orderCode, VNPAY_MESSAGES[r.responseCode] ?? `Mã lỗi ${r.responseCode}`);
    to.searchParams.set("status", "failed");
    to.searchParams.set("msg", VNPAY_MESSAGES[r.responseCode] ?? "");
  }
  return NextResponse.redirect(to);
}
