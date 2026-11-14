"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type R = { ok: boolean; error?: string; needLogin?: boolean; count?: number };

export async function addToCart(productId: number, quantity = 1): Promise<R> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needLogin: true, error: "Vui lòng đăng nhập để thêm vào giỏ hàng" };
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.isActive) return { ok: false, error: "Sản phẩm không tồn tại" };
  const existing = await prisma.cartItem.findUnique({ where: { userId_productId: { userId: user.id, productId } } });
  const newQty = (existing?.quantity ?? 0) + quantity;
  if (newQty > product.stock) return { ok: false, error: `Chỉ còn ${product.stock} sản phẩm trong kho` };
  await prisma.cartItem.upsert({
    where: { userId_productId: { userId: user.id, productId } },
    create: { userId: user.id, productId, quantity },
    update: { quantity: newQty, selected: true },
  });
  revalidatePath("/", "layout");
  return { ok: true, count: await prisma.cartItem.count({ where: { userId: user.id } }) };
}

/** Mua ngay: thêm vào giỏ và chỉ chọn sản phẩm này. */
export async function buyNow(productId: number, quantity = 1): Promise<R> {
  const r = await addToCart(productId, 0 + quantity);
  if (!r.ok) return r;
  const user = (await getCurrentUser())!;
  await prisma.cartItem.updateMany({ where: { userId: user.id, productId: { not: productId } }, data: { selected: false } });
  return r;
}

export async function updateCartQty(productId: number, quantity: number): Promise<R> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needLogin: true };
  if (quantity <= 0) {
    await prisma.cartItem.deleteMany({ where: { userId: user.id, productId } });
  } else {
    const p = await prisma.product.findUnique({ where: { id: productId }, select: { stock: true } });
    if (!p || quantity > p.stock) return { ok: false, error: `Chỉ còn ${p?.stock ?? 0} sản phẩm trong kho` };
    await prisma.cartItem.update({ where: { userId_productId: { userId: user.id, productId } }, data: { quantity } });
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function toggleCartSelect(productId: number | "all", selected: boolean): Promise<R> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needLogin: true };
  await prisma.cartItem.updateMany({ where: { userId: user.id, ...(productId === "all" ? {} : { productId }) }, data: { selected } });
  revalidatePath("/cart");
  return { ok: true };
}

export async function removeSelected(): Promise<R> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, needLogin: true };
  await prisma.cartItem.deleteMany({ where: { userId: user.id, selected: true } });
  revalidatePath("/", "layout");
  return { ok: true };
}
