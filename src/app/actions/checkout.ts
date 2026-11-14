"use server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { applyCoupon } from "@/lib/coupons";
import { createOrderFromCart, OrderError } from "@/lib/orders";
import { sendOrderMail } from "@/lib/mail";
import { buildVnpayUrl, vnpConfig } from "@/lib/payment/vnpay";
import { shippingFee, SHIPPING_METHODS } from "@/lib/utils";

async function baseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return process.env.NEXT_PUBLIC_SITE_URL && !host.startsWith("localhost") ? process.env.NEXT_PUBLIC_SITE_URL : `${proto}://${host}`;
}

async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? "127.0.0.1").replace("::1", "127.0.0.1").replace("::ffff:", "");
}

/** Tạo URL thanh toán cho đơn (dùng cả khi đặt mới lẫn "Thanh toán lại"). */
async function paymentUrl(order: { code: string; total: number; paymentMethod: string }) {
  const base = await baseUrl();
  if (order.paymentMethod === "VNPAY") {
    if (vnpConfig().mock) return `/payment/mock?gateway=vnpay&order=${order.code}`;
    return buildVnpayUrl({ orderCode: order.code, amount: order.total, ipAddr: await clientIp(), returnUrl: `${base}/api/payment/vnpay/return` });
  }
  return `/checkout/result?order=${order.code}`;
}

export async function previewCoupon(code: string, shippingMethod: keyof typeof SHIPPING_METHODS) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Vui lòng đăng nhập" };
  const cart = await prisma.cartItem.findMany({ where: { userId: user.id, selected: true }, include: { product: { select: { price: true } } } });
  const subtotal = cart.reduce((s, c) => s + c.product.price * c.quantity, 0);
  return applyCoupon(code, user.id, subtotal, shippingFee(shippingMethod, subtotal));
}

export async function placeOrder(input: {
  addressId: number;
  paymentMethod: "COD" | "VNPAY";
  shippingMethod: keyof typeof SHIPPING_METHODS;
  couponCode?: string;
  note?: string;
}): Promise<{ ok: true; redirect: string } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Vui lòng đăng nhập" };
  if (!["COD", "VNPAY"].includes(input.paymentMethod)) return { ok: false, error: "Phương thức thanh toán không hợp lệ" };
  try {
    const order = await createOrderFromCart({ ...input, userId: user.id });
    await sendOrderMail(order.id, "placed");
    try {
      return { ok: true, redirect: await paymentUrl(order) };
    } catch (e) {
      // đơn đã tạo nhưng cổng thanh toán lỗi -> cho khách thanh toán lại trong trang đơn hàng
      console.error(e);
      return { ok: true, redirect: `/checkout/result?order=${order.code}&payerr=1` };
    }
  } catch (e) {
    if (e instanceof OrderError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "Có lỗi xảy ra, vui lòng thử lại" };
  }
}

export async function retryPayment(orderCode: string): Promise<{ ok: true; redirect: string } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Vui lòng đăng nhập" };
  const order = await prisma.order.findFirst({ where: { code: orderCode, userId: user.id } });
  if (!order) return { ok: false, error: "Không tìm thấy đơn hàng" };
  if (order.paymentStatus === "PAID" || order.status === "CANCELLED") return { ok: false, error: "Đơn hàng không cần thanh toán" };
  try {
    return { ok: true, redirect: await paymentUrl(order) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
