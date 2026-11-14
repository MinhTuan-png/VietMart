import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyVnpay, VNPAY_MESSAGES } from "@/lib/payment/vnpay";
import { markOrderPaid, markOrderPaymentFailed } from "@/lib/orders";

// IPN URL: VNPAY gọi server-to-server để thông báo kết quả. Phải trả về đúng định dạng RspCode/Message.
export async function GET(req: NextRequest) {
  const q = Object.fromEntries(req.nextUrl.searchParams);
  const r = verifyVnpay(q);
  if (!r.valid) return NextResponse.json({ RspCode: "97", Message: "Invalid signature" });
  const order = await prisma.order.findUnique({ where: { code: r.orderCode } });
  if (!order) return NextResponse.json({ RspCode: "01", Message: "Order not found" });
  if (order.total !== r.amount) return NextResponse.json({ RspCode: "04", Message: "Invalid amount" });
  if (order.paymentStatus === "PAID") return NextResponse.json({ RspCode: "02", Message: "Order already confirmed" });
  if (r.success) await markOrderPaid(r.orderCode, r.amount, r.transactionNo, "VNPAY");
  else await markOrderPaymentFailed(r.orderCode, VNPAY_MESSAGES[r.responseCode] ?? r.responseCode);
  return NextResponse.json({ RspCode: "00", Message: "Confirm Success" });
}
