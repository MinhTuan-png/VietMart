import { prisma } from "./db";

export type CouponResult =
  | { ok: true; code: string; discount: number; freeShip: boolean; description: string }
  | { ok: false; error: string };

/** Kiểm tra & tính giảm giá. shippingFee dùng cho mã FREESHIP. */
export async function applyCoupon(code: string, userId: number, subtotal: number, shippingFee: number): Promise<CouponResult> {
  const c = await prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  const now = new Date();
  if (!c || !c.isActive) return { ok: false, error: "Mã giảm giá không tồn tại hoặc đã bị vô hiệu" };
  if (c.startsAt > now) return { ok: false, error: "Mã giảm giá chưa đến thời gian áp dụng" };
  if (c.endsAt && c.endsAt < now) return { ok: false, error: "Mã giảm giá đã hết hạn" };
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) return { ok: false, error: "Mã giảm giá đã hết lượt sử dụng" };
  if (subtotal < c.minOrder) return { ok: false, error: `Đơn hàng tối thiểu ${new Intl.NumberFormat("vi-VN").format(c.minOrder)}₫ để dùng mã này` };
  const used = await prisma.order.count({ where: { userId, couponCode: c.code, status: { not: "CANCELLED" } } });
  if (used >= c.perUserLimit) return { ok: false, error: "Bạn đã dùng hết lượt cho mã này" };

  let discount = 0;
  if (c.type === "PERCENT") discount = Math.min(Math.round((subtotal * c.value) / 100), c.maxDiscount ?? Infinity);
  else if (c.type === "FIXED") discount = Math.min(c.value, subtotal);
  else if (c.type === "FREESHIP") discount = shippingFee;
  return { ok: true, code: c.code, discount, freeShip: c.type === "FREESHIP", description: c.description };
}

export async function availableCoupons() {
  const now = new Date();
  const list = await prisma.coupon.findMany({
    where: { isActive: true, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
    orderBy: { minOrder: "asc" },
  });
  return list.filter((c) => c.usageLimit == null || c.usedCount < c.usageLimit);
}
