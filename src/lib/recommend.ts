/**
 * Hệ thống gợi ý sản phẩm (kết hợp nhiều chiến lược như Shopee/Tiki/Amazon):
 *  1. similarProducts      – Content-based: cùng danh mục, thương hiệu, tag, khoảng giá gần nhau.
 *  2. boughtTogether       – Item-to-item collaborative filtering: đếm số đơn hàng có chứa đồng thời 2 sản phẩm
 *                            ("Khách hàng thường mua cùng" như Amazon).
 *  3. personalized         – Dành cho bạn: xây hồ sơ sở thích từ lượt xem, yêu thích, giỏ hàng, lịch sử mua
 *                            (có trọng số & suy giảm theo thời gian), chấm điểm sản phẩm theo danh mục/thương hiệu
 *                            ưa thích + độ phổ biến, loại bỏ sản phẩm đã mua.
 *  4. cartRecommendations  – Gợi ý mua kèm cho giỏ hàng (gộp boughtTogether của từng món).
 *  5. trending / bestSellers – Fallback cho khách mới (cold-start).
 */
import { prisma } from "./db";
import { productCardSelect, type ProductCardData } from "./products";

const active = { isActive: true, stock: { gt: 0 } };

export async function bestSellers(take = 12, categoryIds?: number[]) {
  return prisma.product.findMany({
    where: { ...active, ...(categoryIds ? { categoryId: { in: categoryIds } } : {}) },
    orderBy: { sold: "desc" },
    take,
    select: productCardSelect,
  });
}

/** Xu hướng: bán chạy nhất trong 14 ngày gần đây. */
export async function trending(take = 12) {
  const since = new Date(Date.now() - 14 * 86400000);
  const rows = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: { order: { createdAt: { gte: since }, status: { not: "CANCELLED" } } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: take * 2,
  });
  return hydrate(rows.map((r) => r.productId), take);
}

async function hydrate(ids: number[], take: number, exclude: Set<number> = new Set()) {
  const list = ids.filter((id) => !exclude.has(id));
  const products = await prisma.product.findMany({ where: { id: { in: list }, ...active }, select: productCardSelect });
  const byId = new Map(products.map((p) => [p.id, p]));
  return list.map((id) => byId.get(id)).filter(Boolean).slice(0, take) as ProductCardData[];
}

export async function similarProducts(productId: number, take = 12) {
  const p = await prisma.product.findUnique({ where: { id: productId }, include: { category: true } });
  if (!p) return [];
  const candidates = await prisma.product.findMany({
    where: {
      ...active,
      id: { not: p.id },
      OR: [{ categoryId: p.categoryId }, { brandId: p.brandId ?? -1 }, ...(p.category.parentId ? [{ category: { parentId: p.category.parentId } }] : [])],
    },
    select: { ...productCardSelect, categoryId: true, brandId: true, tags: true },
    take: 200,
  });
  const tags = new Set(p.tags.split(",").filter(Boolean));
  const scored = candidates.map((c) => {
    let s = 0;
    if (c.categoryId === p.categoryId) s += 5;
    else s += 2; // cùng danh mục cha
    if (p.brandId && c.brandId === p.brandId) s += 3;
    s += c.tags.split(",").filter((t) => tags.has(t)).length * 1.5;
    const ratio = Math.min(c.price, p.price) / Math.max(c.price, p.price);
    s += ratio * 3; // giá càng gần càng điểm cao
    s += Math.min(c.rating, 5) * 0.3 + Math.log10(c.sold + 1) * 0.5;
    return { c, s };
  });
  return scored.sort((a, b) => b.s - a.s).slice(0, take).map((x) => x.c);
}

export async function boughtTogether(productIds: number[], take = 8) {
  if (!productIds.length) return [];
  const orders = await prisma.orderItem.findMany({
    where: { productId: { in: productIds }, order: { status: { not: "CANCELLED" } } },
    select: { orderId: true },
    take: 2000,
  });
  const orderIds = [...new Set(orders.map((o) => o.orderId))];
  if (!orderIds.length) return [];
  const co = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: { orderId: { in: orderIds }, productId: { notIn: productIds } },
    _count: { productId: true },
    orderBy: { _count: { productId: "desc" } },
    take: take * 2,
  });
  return hydrate(co.filter((r) => r._count.productId >= 2).map((r) => r.productId), take);
}

export async function cartRecommendations(userId: number, take = 8) {
  const cart = await prisma.cartItem.findMany({ where: { userId }, select: { productId: true } });
  const ids = cart.map((c) => c.productId);
  const recs = await boughtTogether(ids, take);
  if (recs.length >= 4 || !ids.length) return recs;
  return [...recs, ...(await similarProducts(ids[0], take - recs.length))];
}

export async function personalized(userId: number | null, take = 18) {
  if (!userId) return trendingOrBest(take);
  const now = Date.now();
  const decay = (d: Date) => Math.exp(-(now - d.getTime()) / (30 * 86400000)); // nửa đời ~ 3 tuần
  const [views, wishes, carts, orders] = await Promise.all([
    prisma.productView.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100, include: { product: { select: { categoryId: true, brandId: true } } } }),
    prisma.wishlist.findMany({ where: { userId }, include: { product: { select: { categoryId: true, brandId: true } } } }),
    prisma.cartItem.findMany({ where: { userId }, include: { product: { select: { categoryId: true, brandId: true } } } }),
    prisma.orderItem.findMany({ where: { order: { userId } }, include: { product: { select: { categoryId: true, brandId: true } }, order: { select: { createdAt: true } } }, take: 200 }),
  ]);
  const cat = new Map<number, number>();
  const brand = new Map<number, number>();
  const add = (p: { categoryId: number; brandId: number | null }, w: number) => {
    cat.set(p.categoryId, (cat.get(p.categoryId) ?? 0) + w);
    if (p.brandId) brand.set(p.brandId, (brand.get(p.brandId) ?? 0) + w);
  };
  views.forEach((v) => add(v.product, 1 * decay(v.createdAt)));
  wishes.forEach((w) => add(w.product, 3 * decay(w.createdAt)));
  carts.forEach((c) => add(c.product, 4 * decay(c.createdAt)));
  orders.forEach((o) => add(o.product, 2 * decay(o.order.createdAt)));
  if (!cat.size) return trendingOrBest(take);

  const purchased = new Set(orders.map((o) => o.productId));
  const topCats = [...cat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => id);
  const candidates = await prisma.product.findMany({
    where: { ...active, OR: [{ categoryId: { in: topCats } }, { brandId: { in: [...brand.keys()] } }] },
    select: { ...productCardSelect, categoryId: true, brandId: true },
    take: 300,
  });
  const maxC = Math.max(...cat.values());
  const maxB = Math.max(1, ...brand.values());
  const scored = candidates
    .filter((c) => !purchased.has(c.id))
    .map((c) => ({
      c,
      s: ((cat.get(c.categoryId) ?? 0) / maxC) * 5 + ((c.brandId ? brand.get(c.brandId) ?? 0 : 0) / maxB) * 2 + c.rating * 0.2 + Math.log10(c.sold + 1) * 0.4 + Math.random() * 0.8,
    }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.c);
  // Đa dạng hóa: tối đa 4 sản phẩm / danh mục
  const perCat = new Map<number, number>();
  const result: ProductCardData[] = [];
  for (const p of scored) {
    if ((perCat.get(p.categoryId) ?? 0) >= 4) continue;
    perCat.set(p.categoryId, (perCat.get(p.categoryId) ?? 0) + 1);
    result.push(p);
    if (result.length >= take) break;
  }
  if (result.length < take) {
    const seen = new Set(result.map((r) => r.id));
    result.push(...(await bestSellers(take * 2)).filter((p) => !seen.has(p.id)).slice(0, take - result.length));
  }
  return result;
}

async function trendingOrBest(take: number) {
  const t = await trending(take);
  return t.length >= take / 2 ? t : bestSellers(take);
}

export async function recentlyViewed(userId: number | null, take = 12) {
  if (!userId) return [];
  const views = await prisma.productView.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 60, select: { productId: true } });
  return hydrate([...new Set(views.map((v) => v.productId))], take);
}
