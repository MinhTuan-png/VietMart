"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { updateOrderStatus, OrderError } from "@/lib/orders";
import type { FormState } from "./auth";

export async function toggleWishlist(productId: number) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needLogin: true, liked: false };
  const key = { userId_productId: { userId: user.id, productId } };
  const exists = await prisma.wishlist.findUnique({ where: key });
  if (exists) await prisma.wishlist.delete({ where: key });
  else await prisma.wishlist.create({ data: { userId: user.id, productId } });
  revalidatePath("/account/wishlist");
  return { ok: true, liked: !exists };
}

export async function updateProfile(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Chưa đăng nhập" };
  const name = String(fd.get("name") ?? "").trim();
  const phone = String(fd.get("phone") ?? "").trim();
  if (name.length < 2) return { error: "Họ tên không hợp lệ" };
  if (phone && !/^0\d{9}$/.test(phone)) return { error: "Số điện thoại không hợp lệ" };
  await prisma.user.update({ where: { id: user.id }, data: { name, phone: phone || null } });
  revalidatePath("/account");
  return { ok: true, message: "Đã cập nhật hồ sơ" };
}

export async function changePassword(_: FormState, fd: FormData): Promise<FormState> {
  const s = await getCurrentUser();
  if (!s) return { error: "Chưa đăng nhập" };
  const user = await prisma.user.findUniqueOrThrow({ where: { id: s.id } });
  const cur = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  if (!(await bcrypt.compare(cur, user.password))) return { error: "Mật khẩu hiện tại không đúng" };
  if (next.length < 6) return { error: "Mật khẩu mới tối thiểu 6 ký tự" };
  await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(next, 10) } });
  return { ok: true, message: "Đã đổi mật khẩu" };
}

const AddressSchema = z.object({
  fullName: z.string().trim().min(2, "Nhập họ tên người nhận"),
  phone: z.string().trim().regex(/^0\d{9}$/, "Số điện thoại không hợp lệ"),
  province: z.string().trim().min(2, "Nhập Tỉnh/Thành phố"),
  district: z.string().trim().min(2, "Nhập Quận/Huyện"),
  ward: z.string().trim().min(2, "Nhập Phường/Xã"),
  street: z.string().trim().min(3, "Nhập số nhà, tên đường"),
});

export async function saveAddress(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Chưa đăng nhập" };
  const parsed = AddressSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const id = Number(fd.get("id") || 0);
  const count = await prisma.address.count({ where: { userId: user.id } });
  const isDefault = fd.get("isDefault") === "on" || count === 0;
  if (isDefault) await prisma.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
  if (id) await prisma.address.updateMany({ where: { id, userId: user.id }, data: { ...parsed.data, isDefault } });
  else await prisma.address.create({ data: { ...parsed.data, userId: user.id, isDefault } });
  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
  return { ok: true, message: "Đã lưu địa chỉ" };
}

export async function deleteAddress(id: number) {
  const user = await getCurrentUser();
  if (!user) return;
  await prisma.address.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/account/addresses");
}

export async function setDefaultAddress(id: number) {
  const user = await getCurrentUser();
  if (!user) return;
  await prisma.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
  await prisma.address.updateMany({ where: { id, userId: user.id }, data: { isDefault: true } });
  revalidatePath("/account/addresses");
}

export async function cancelMyOrder(orderId: number, reason: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Chưa đăng nhập" };
  const order = await prisma.order.findFirst({ where: { id: orderId, userId: user.id } });
  if (!order) return { ok: false, error: "Không tìm thấy đơn hàng" };
  if (order.status !== "PENDING" && order.status !== "CONFIRMED") return { ok: false, error: "Đơn hàng đang giao, không thể hủy" };
  try {
    await updateOrderStatus(orderId, "CANCELLED", { note: `Khách hủy: ${reason || "không nêu lý do"}`, actor: user.email });
  } catch (e) {
    return { ok: false, error: e instanceof OrderError ? e.message : "Lỗi hủy đơn" };
  }
  revalidatePath(`/account/orders`);
  return { ok: true };
}

export async function submitReview(productId: number, rating: number, comment: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Vui lòng đăng nhập" };
  if (rating < 1 || rating > 5) return { ok: false, error: "Số sao không hợp lệ" };
  if (comment.trim().length < 5) return { ok: false, error: "Nội dung đánh giá tối thiểu 5 ký tự" };
  const bought = await prisma.orderItem.findFirst({ where: { productId, order: { userId: user.id, status: "DELIVERED" } }, select: { orderId: true } });
  if (!bought) return { ok: false, error: "Bạn cần mua và nhận hàng thành công để đánh giá sản phẩm" };
  await prisma.review.upsert({
    where: { userId_productId: { userId: user.id, productId } },
    create: { userId: user.id, productId, rating, comment: comment.trim(), orderId: bought.orderId },
    update: { rating, comment: comment.trim() },
  });
  const agg = await prisma.review.aggregate({ where: { productId, isHidden: false }, _avg: { rating: true }, _count: true });
  const p = await prisma.product.update({
    where: { id: productId },
    data: { rating: Math.round((agg._avg.rating ?? 0) * 10) / 10, ratingCount: agg._count },
  });
  revalidatePath(`/p/${p.slug}`);
  return { ok: true };
}
