"use server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/** Ghi nhận lượt xem sản phẩm (phục vụ gợi ý cá nhân hóa). Gọi từ client sau khi trang đã hiển thị. */
export async function trackView(productId: number) {
  if (!Number.isInteger(productId)) return;
  const user = await getCurrentUser();
  await prisma.product.update({ where: { id: productId }, data: { views: { increment: 1 } } }).catch(() => null);
  if (user) await prisma.productView.create({ data: { userId: user.id, productId } }).catch(() => null);
}
