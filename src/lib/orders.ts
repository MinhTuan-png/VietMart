import { sendOrderMail } from "./mail";
import { prisma } from "./db";
import { applyCoupon } from "./coupons";
import { shippingFee, SHIPPING_METHODS } from "./utils";

export class OrderError extends Error {}

const genCode = () => {
  const d = new Date();
  const ymd = d.toISOString().slice(2, 10).replace(/-/g, "");
  return `VM${ymd}${Math.floor(Math.random() * 1e6).toString().padStart(6, "0")}`;
};

/**
 * Tạo đơn từ các sản phẩm đã chọn trong giỏ. Trừ kho ngay khi đặt (giữ hàng),
 * ghi nhật ký kho, tăng lượt dùng coupon, xóa các món khỏi giỏ — tất cả trong 1 transaction.
 */
export async function createOrderFromCart(input: {
  userId: number;
  addressId: number;
  paymentMethod: "COD" | "VNPAY";
  shippingMethod: keyof typeof SHIPPING_METHODS;
  couponCode?: string;
  note?: string;
}) {
  const address = await prisma.address.findFirst({ where: { id: input.addressId, userId: input.userId } });
  if (!address) throw new OrderError("Vui lòng chọn địa chỉ giao hàng");
  const cart = await prisma.cartItem.findMany({ where: { userId: input.userId, selected: true }, include: { product: true } });
  if (!cart.length) throw new OrderError("Giỏ hàng trống hoặc chưa chọn sản phẩm");
  for (const c of cart) {
    if (!c.product.isActive) throw new OrderError(`"${c.product.name}" đã ngừng kinh doanh`);
    if (c.product.stock < c.quantity) throw new OrderError(`"${c.product.name}" chỉ còn ${c.product.stock} sản phẩm`);
  }
  const subtotal = cart.reduce((s, c) => s + c.product.price * c.quantity, 0);
  const ship = shippingFee(input.shippingMethod, subtotal);
  let discount = 0;
  let couponCode: string | undefined;
  if (input.couponCode) {
    const r = await applyCoupon(input.couponCode, input.userId, subtotal, ship);
    if (!r.ok) throw new OrderError(r.error);
    discount = r.discount;
    couponCode = r.code;
  }
  const total = Math.max(0, subtotal + ship - discount);

  return prisma.$transaction(async (tx) => {
    for (const c of cart) {
      // trừ kho có điều kiện để tránh bán vượt tồn (race condition)
      const res = await tx.product.updateMany({
        where: { id: c.productId, stock: { gte: c.quantity } },
        data: { stock: { decrement: c.quantity }, sold: { increment: c.quantity } },
      });
      if (res.count === 0) throw new OrderError(`"${c.product.name}" vừa hết hàng`);
    }
    const order = await tx.order.create({
      data: {
        code: genCode(),
        userId: input.userId,
        paymentMethod: input.paymentMethod,
        shippingMethod: input.shippingMethod,
        subtotal,
        shippingFee: ship,
        discount,
        total,
        couponCode,
        note: input.note,
        fullName: address.fullName,
        phone: address.phone,
        address: `${address.street}, ${address.ward}, ${address.district}, ${address.province}`,
        items: {
          create: cart.map((c) => ({ productId: c.productId, name: c.product.name, thumbnail: c.product.thumbnail, price: c.product.price, quantity: c.quantity })),
        },
        history: { create: { status: "PENDING", note: input.paymentMethod === "COD" ? "Đặt hàng thành công" : "Đơn hàng đã tạo, chờ thanh toán" } },
      },
    });
    for (const c of cart) {
      const p = await tx.product.findUniqueOrThrow({ where: { id: c.productId }, select: { stock: true } });
      await tx.inventoryLog.create({ data: { productId: c.productId, change: -c.quantity, stockAfter: p.stock, type: "SALE", note: `Đơn ${order.code}`, actor: "system" } });
    }
    if (couponCode) await tx.coupon.update({ where: { code: couponCode }, data: { usedCount: { increment: 1 } } });
    await tx.cartItem.deleteMany({ where: { userId: input.userId, selected: true } });
    return order;
  });
}

const STATUS_NOTE: Record<string, string> = {
  CONFIRMED: "Shop đã xác nhận đơn hàng",
  SHIPPING: "Đã bàn giao cho đơn vị vận chuyển",
  DELIVERED: "Giao hàng thành công",
  CANCELLED: "Đơn hàng đã bị hủy",
  RETURNED: "Đơn hàng đã được trả lại",
};

const ALLOWED: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SHIPPING", "CANCELLED"],
  SHIPPING: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED"],
  CANCELLED: [],
  RETURNED: [],
};

export const nextStatuses = (s: string) => ALLOWED[s] ?? [];

/** Đổi trạng thái đơn; hủy/trả hàng sẽ hoàn kho. */
export async function updateOrderStatus(orderId: number, status: string, opts: { note?: string; actor?: string } = {}) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw new OrderError("Không tìm thấy đơn hàng");
  if (!nextStatuses(order.status).includes(status))
    throw new OrderError(`Không thể chuyển đơn từ ${order.status} sang ${status}`);
  const result = await prisma.$transaction(async (tx) => {
    if (status === "CANCELLED" || status === "RETURNED") {
      for (const it of order.items) {
        const p = await tx.product.update({
          where: { id: it.productId },
          data: { stock: { increment: it.quantity }, sold: { decrement: it.quantity } },
        });
        await tx.inventoryLog.create({
          data: { productId: it.productId, change: it.quantity, stockAfter: p.stock, type: status === "CANCELLED" ? "CANCEL" : "RETURN", note: `Đơn ${order.code}`, actor: opts.actor },
        });
      }
      if (order.couponCode && status === "CANCELLED")
        await tx.coupon.update({ where: { code: order.couponCode }, data: { usedCount: { decrement: 1 } } }).catch(() => null);
    }
    const paymentStatus =
      status === "DELIVERED" && order.paymentMethod === "COD" ? "PAID"
      : (status === "RETURNED" || status === "CANCELLED") && order.paymentStatus === "PAID" ? "REFUNDED"
      : order.paymentStatus;
    return tx.order.update({
      where: { id: orderId },
      data: {
        status,
        paymentStatus,
        paidAt: paymentStatus === "PAID" && !order.paidAt ? new Date() : order.paidAt,
        cancelReason: status === "CANCELLED" ? opts.note : order.cancelReason,
        history: { create: { status, note: opts.note || STATUS_NOTE[status] } },
      },
    });
  });
  await sendOrderMail(orderId, "status");
  return result;
}

/** Xác nhận thanh toán online thành công (idempotent – IPN và return URL có thể gọi trùng). */
export async function markOrderPaid(code: string, amount: number, transactionId: string, gateway: string) {
  const order = await prisma.order.findUnique({ where: { code } });
  if (!order) return { ok: false as const, reason: "NOT_FOUND" };
  if (order.total !== amount) return { ok: false as const, reason: "AMOUNT_MISMATCH" };
  if (order.paymentStatus === "PAID") return { ok: true as const, order, already: true };
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: "PAID",
      paidAt: new Date(),
      transactionId,
      history: { create: { status: order.status, note: `Thanh toán thành công qua ${gateway} (mã GD ${transactionId})` } },
    },
  });
  await sendOrderMail(updated.id, "paid");
  return { ok: true as const, order: updated, already: false };
}

export async function markOrderPaymentFailed(code: string, reason: string) {
  const order = await prisma.order.findUnique({ where: { code } });
  if (!order || order.paymentStatus === "PAID") return;
  await prisma.order.update({
    where: { id: order.id },
    data: { paymentStatus: "FAILED", history: { create: { status: order.status, note: `Thanh toán thất bại: ${reason}` } } },
  });
}
