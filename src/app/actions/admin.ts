"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { adjustStock, audit, changeOrderStatus } from "@/lib/admin-ops";
import { slugify } from "@/lib/utils";
import type { FormState } from "./auth";

type R = { ok: boolean; error?: string };
const fail = (e: unknown): R => ({ ok: false, error: e instanceof Error ? e.message : "Có lỗi xảy ra" });

const ProductSchema = z.object({
  name: z.string().trim().min(3, "Tên sản phẩm tối thiểu 3 ký tự"),
  sku: z.string().trim().min(3, "Nhập mã SKU").transform((s) => s.toUpperCase()),
  price: z.coerce.number().int().positive("Giá bán phải > 0"),
  comparePrice: z.coerce.number().int().nonnegative().optional().transform((v) => v || null),
  costPrice: z.coerce.number().int().nonnegative().optional().transform((v) => v || null),
  stock: z.coerce.number().int().nonnegative(),
  lowStockThreshold: z.coerce.number().int().nonnegative(),
  sold: z.coerce.number().int().nonnegative().optional(),
  categoryId: z.coerce.number().int().positive("Chọn danh mục"),
  brand: z.string().trim().optional(),
  thumbnail: z.string().trim().min(1, "Nhập URL ảnh đại diện"),
  images: z.string().optional(),
  shortDesc: z.string().optional(),
  description: z.string().min(10, "Mô tả tối thiểu 10 ký tự"),
  tags: z.string().optional(),
  warranty: z.string().optional(),
  specs: z.string().optional(),
});

export async function saveProduct(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = ProductSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const id = Number(fd.get("id") || 0);
  const images = (d.images ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
  const specs: Record<string, string> = {};
  for (const line of (d.specs ?? "").split("\n")) {
    const [k, ...v] = line.split(":");
    if (k?.trim() && v.length) specs[k.trim()] = v.join(":").trim();
  }
  let brandId: number | null = null;
  if (d.brand) {
    const b = await prisma.brand.upsert({ where: { name: d.brand }, create: { name: d.brand, slug: slugify(d.brand) }, update: {} });
    brandId = b.id;
  }
  const data = {
    name: d.name, sku: d.sku, price: d.price, comparePrice: d.comparePrice, costPrice: d.costPrice, lowStockThreshold: d.lowStockThreshold, ...(d.sold !== undefined ? { sold: d.sold } : {}),
    categoryId: d.categoryId, brandId, thumbnail: d.thumbnail, images: JSON.stringify(images.length ? images : [d.thumbnail]),
    shortDesc: d.shortDesc, description: d.description, tags: (d.tags ?? "").toLowerCase(), warranty: d.warranty, specs: JSON.stringify(specs),
    isActive: fd.get("isActive") === "on", isFeatured: fd.get("isFeatured") === "on",
  };
  try {
    if (id) {
      const before = await prisma.product.findUniqueOrThrow({ where: { id } });
      await prisma.product.update({ where: { id }, data });
      if (before.stock !== d.stock) await adjustStock(id, d.stock - before.stock, "ADJUST", "Sửa trực tiếp trên form sản phẩm", admin);
      await audit(admin.id, "Cập nhật sản phẩm", `${d.name} (${d.sku})`);
    } else {
      let slug = slugify(d.name);
      if (await prisma.product.findUnique({ where: { slug } })) slug += "-" + Date.now().toString(36);
      const p = await prisma.product.create({ data: { ...data, slug, stock: d.stock } });
      await prisma.inventoryLog.create({ data: { productId: p.id, change: d.stock, stockAfter: d.stock, type: "IMPORT", note: "Tạo sản phẩm mới", actor: admin.email } });
      await audit(admin.id, "Thêm sản phẩm", `${d.name} (${d.sku})`);
    }
  } catch (e) {
    if (String(e).includes("Unique constraint")) return { error: "Mã SKU đã tồn tại" };
    return { error: (e as Error).message };
  }
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function toggleProductActive(id: number): Promise<R> {
  const admin = await requireAdmin();
  const p = await prisma.product.update({ where: { id }, data: { isActive: { set: !(await prisma.product.findUniqueOrThrow({ where: { id } })).isActive } } });
  await audit(admin.id, p.isActive ? "Hiện sản phẩm" : "Ẩn sản phẩm", `${p.name} (${p.sku})`);
  revalidatePath("/admin/products");
  return { ok: true };
}

export async function stockMovement(productId: number, change: number, type: "IMPORT" | "ADJUST", note: string): Promise<R> {
  const admin = await requireAdmin();
  if (!Number.isInteger(change) || change === 0) return { ok: false, error: "Số lượng không hợp lệ" };
  try {
    await adjustStock(productId, change, type, note || (type === "IMPORT" ? "Nhập hàng" : "Điều chỉnh kiểm kê"), admin);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/admin/inventory");
  return { ok: true };
}

export async function adminSetOrderStatus(code: string, status: string, note?: string): Promise<R> {
  const admin = await requireAdmin();
  try {
    await changeOrderStatus(code, status, note, admin);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/admin/orders");
  return { ok: true };
}

export async function adminMarkPaid(code: string): Promise<R> {
  const admin = await requireAdmin();
  const o = await prisma.order.update({ where: { code }, data: { paymentStatus: "PAID", paidAt: new Date(), history: { create: { status: (await prisma.order.findUniqueOrThrow({ where: { code } })).status, note: "Xác nhận đã nhận thanh toán (thủ công)" } } } });
  await audit(admin.id, "Xác nhận thanh toán", o.code);
  revalidatePath(`/admin/orders/${code}`);
  return { ok: true };
}

export async function setUserRole(userId: number, role: string): Promise<R> {
  const admin = await requireAdmin();
  if (admin.role !== "ADMIN") return { ok: false, error: "Chỉ ADMIN được phân quyền" };
  if (userId === admin.id) return { ok: false, error: "Không thể tự đổi quyền của mình" };
  if (!["CUSTOMER", "STAFF", "ADMIN"].includes(role)) return { ok: false, error: "Quyền không hợp lệ" };
  const u = await prisma.user.update({ where: { id: userId }, data: { role } });
  await audit(admin.id, "Phân quyền", `${u.email} → ${role}`);
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function toggleUserLock(userId: number): Promise<R> {
  const admin = await requireAdmin();
  if (userId === admin.id) return { ok: false, error: "Không thể tự khóa tài khoản" };
  const cur = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const u = await prisma.user.update({ where: { id: userId }, data: { isLocked: !cur.isLocked } });
  await audit(admin.id, u.isLocked ? "Khóa tài khoản" : "Mở khóa tài khoản", u.email);
  revalidatePath("/admin/users");
  return { ok: true };
}

const CouponSchema = z.object({
  code: z.string().trim().min(3).max(20).regex(/^[A-Za-z0-9]+$/, "Mã chỉ gồm chữ và số").transform((s) => s.toUpperCase()),
  description: z.string().trim().min(5, "Nhập mô tả"),
  type: z.enum(["PERCENT", "FIXED", "FREESHIP"]),
  value: z.coerce.number().int().nonnegative(),
  maxDiscount: z.coerce.number().int().nonnegative().optional().transform((v) => v || null),
  minOrder: z.coerce.number().int().nonnegative(),
  usageLimit: z.coerce.number().int().nonnegative().optional().transform((v) => v || null),
  perUserLimit: z.coerce.number().int().positive(),
  endsAt: z.string().optional().transform((v) => (v ? new Date(v) : null)),
});

export async function saveCoupon(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = CouponSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (d.type === "PERCENT" && (d.value <= 0 || d.value > 100)) return { error: "Phần trăm giảm phải từ 1-100" };
  try {
    await prisma.coupon.upsert({ where: { code: d.code }, create: d, update: d });
  } catch (e) {
    return { error: (e as Error).message };
  }
  await audit(admin.id, "Lưu mã giảm giá", `${d.code}: ${d.description}`);
  revalidatePath("/admin/coupons");
  return { ok: true, message: `Đã lưu mã ${d.code}` };
}

export async function toggleCoupon(id: number): Promise<R> {
  const admin = await requireAdmin();
  const c = await prisma.coupon.findUniqueOrThrow({ where: { id } });
  await prisma.coupon.update({ where: { id }, data: { isActive: !c.isActive } });
  await audit(admin.id, c.isActive ? "Tắt mã giảm giá" : "Bật mã giảm giá", c.code);
  revalidatePath("/admin/coupons");
  return { ok: true };
}

export async function moderateReview(id: number, action: { hide?: boolean; reply?: string }): Promise<R> {
  const admin = await requireAdmin();
  const r = await prisma.review.update({ where: { id }, data: { ...(action.hide != null ? { isHidden: action.hide } : {}), ...(action.reply != null ? { reply: action.reply } : {}) } });
  const agg = await prisma.review.aggregate({ where: { productId: r.productId, isHidden: false }, _avg: { rating: true }, _count: true });
  await prisma.product.update({ where: { id: r.productId }, data: { rating: Math.round((agg._avg.rating ?? 0) * 10) / 10, ratingCount: agg._count } });
  await audit(admin.id, "Kiểm duyệt đánh giá", `#${id} ${action.hide != null ? (action.hide ? "ẩn" : "hiện") : "phản hồi"}`);
  revalidatePath("/admin/reviews");
  return { ok: true };
}

export async function saveCategory(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const name = String(fd.get("name") ?? "").trim();
  const parentId = Number(fd.get("parentId") || 0) || null;
  if (name.length < 2) return { error: "Tên danh mục không hợp lệ" };
  const slug = slugify(name);
  if (await prisma.category.findUnique({ where: { slug } })) return { error: "Danh mục đã tồn tại" };
  await prisma.category.create({ data: { name, slug, parentId, icon: String(fd.get("icon") ?? "") || null } });
  await audit(admin.id, "Thêm danh mục", name);
  revalidatePath("/admin/categories");
  return { ok: true, message: "Đã thêm danh mục" };
}
