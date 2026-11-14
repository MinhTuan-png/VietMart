import { prisma } from "./db";
import { formatVND } from "./utils";

export type Notice = { id: string; kind: "order" | "promo"; title: string; body: string; href: string; at: Date };

const ORDER_MSG: Record<string, string> = {
  PENDING: "đã được đặt thành công, đang chờ xác nhận",
  CONFIRMED: "đã được xác nhận, shop đang chuẩn bị hàng",
  SHIPPING: "đang trên đường giao đến bạn",
  DELIVERED: "đã giao thành công, hãy đánh giá sản phẩm nhé",
  CANCELLED: "đã bị hủy",
  RETURNED: "đã được hoàn trả",
};

/** Thông báo: cập nhật đơn hàng của người dùng + mã giảm giá đang chạy. */
export async function getNotifications(userId: number | null, take = 30): Promise<Notice[]> {
  const now = new Date();
  const [history, coupons] = await Promise.all([
    userId
      ? prisma.orderStatusHistory.findMany({ where: { order: { userId } }, orderBy: { createdAt: "desc" }, take, include: { order: { select: { code: true } } } })
      : [],
    prisma.coupon.findMany({
      where: { isActive: true, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);
  const orders: Notice[] = history.map((h) => ({
    id: `o${h.id}`,
    kind: "order",
    title: `Đơn hàng ${h.order.code}`,
    body: `Đơn hàng ${h.order.code} ${ORDER_MSG[h.status] ?? h.status}.`,
    href: `/account/orders/${h.order.code}`,
    at: h.createdAt,
  }));
  const promos: Notice[] = coupons.map((c) => ({
    id: `c${c.id}`,
    kind: "promo",
    title: `Mã giảm giá ${c.code}`,
    body: `${c.description}${c.minOrder ? ` (đơn từ ${formatVND(c.minOrder)})` : ""}`,
    href: "/",
    at: c.createdAt,
  }));
  return [...orders, ...promos].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, take);
}
