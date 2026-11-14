/**
 * Nghiệp vụ quản trị dùng chung cho trang Admin và Trợ lý AI (tool calls).
 * Mọi thao tác ghi đều được ghi AuditLog.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { updateOrderStatus } from "./orders";

const REVENUE_STATUSES = ["PENDING", "CONFIRMED", "SHIPPING", "DELIVERED"];
const dayKey = (d: Date) => new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10);

export async function audit(userId: number | null, action: string, detail: string, viaAI = false) {
  await prisma.auditLog.create({ data: { userId, action, detail, viaAI } });
}

export async function dashboardStats(days = 30) {
  const since = new Date(Date.now() - days * 86400000);
  const prevSince = new Date(Date.now() - 2 * days * 86400000);
  const [orders, prevOrders, newCustomers, statusCounts, productsCount, lowStockCount, outOfStock] = await Promise.all([
    prisma.order.findMany({ where: { createdAt: { gte: since } }, select: { total: true, status: true, createdAt: true, paymentMethod: true, items: { select: { quantity: true, price: true, product: { select: { costPrice: true, category: { select: { parent: { select: { name: true } } } } } } } } } }),
    prisma.order.findMany({ where: { createdAt: { gte: prevSince, lt: since }, status: { in: REVENUE_STATUSES } }, select: { total: true } }),
    prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: since } } }),
    prisma.order.groupBy({ by: ["status"], _count: true }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.count({ where: { isActive: true, stock: { gt: 0 }, AND: { stock: { lte: prisma.product.fields.lowStockThreshold } } } }),
    prisma.product.count({ where: { isActive: true, stock: 0 } }),
  ]);
  const valid = orders.filter((o) => REVENUE_STATUSES.includes(o.status));
  const revenue = valid.reduce((s, o) => s + o.total, 0);
  const prevRevenue = prevOrders.reduce((s, o) => s + o.total, 0);
  const profit = valid.reduce((s, o) => s + o.items.reduce((a, i) => a + (i.price - (i.product.costPrice ?? i.price * 0.7)) * i.quantity, 0), 0);
  const byDay = new Map<string, { revenue: number; orders: number }>();
  for (let i = days - 1; i >= 0; i--) byDay.set(dayKey(new Date(Date.now() - i * 86400000)), { revenue: 0, orders: 0 });
  for (const o of valid) {
    const k = dayKey(o.createdAt);
    const v = byDay.get(k);
    if (v) { v.revenue += o.total; v.orders++; }
  }
  const byCategory = new Map<string, number>();
  for (const o of valid) for (const i of o.items) {
    const n = i.product.category.parent?.name ?? "Khác";
    byCategory.set(n, (byCategory.get(n) ?? 0) + i.price * i.quantity);
  }
  const byPayment = new Map<string, number>();
  for (const o of valid) byPayment.set(o.paymentMethod, (byPayment.get(o.paymentMethod) ?? 0) + 1);
  return {
    days,
    revenue,
    prevRevenue,
    revenueGrowth: prevRevenue ? Math.round(((revenue - prevRevenue) / prevRevenue) * 1000) / 10 : null,
    estimatedProfit: Math.round(profit),
    orders: orders.length,
    validOrders: valid.length,
    cancelled: orders.filter((o) => o.status === "CANCELLED").length,
    avgOrderValue: valid.length ? Math.round(revenue / valid.length) : 0,
    newCustomers,
    productsCount,
    lowStockCount,
    outOfStock,
    statusCounts: Object.fromEntries(statusCounts.map((s) => [s.status, s._count])),
    daily: [...byDay.entries()].map(([date, v]) => ({ date, ...v })),
    byCategory: [...byCategory.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    byPayment: [...byPayment.entries()].map(([name, value]) => ({ name, value })),
  };
}

export async function topProducts(days = 30, take = 10) {
  const since = new Date(Date.now() - days * 86400000);
  const rows = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: { order: { createdAt: { gte: since }, status: { in: REVENUE_STATUSES } } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take,
  });
  const products = await prisma.product.findMany({ where: { id: { in: rows.map((r) => r.productId) } }, select: { id: true, name: true, sku: true, price: true, stock: true, thumbnail: true, slug: true } });
  return rows.map((r) => ({ ...products.find((p) => p.id === r.productId)!, qty: r._sum.quantity ?? 0, revenue: (r._sum.quantity ?? 0) * (products.find((p) => p.id === r.productId)?.price ?? 0) }));
}

export async function topCustomers(days = 90, take = 10) {
  const since = new Date(Date.now() - days * 86400000);
  const rows = await prisma.order.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: since }, status: { in: REVENUE_STATUSES } },
    _sum: { total: true },
    _count: true,
    orderBy: { _sum: { total: "desc" } },
    take,
  });
  const users = await prisma.user.findMany({ where: { id: { in: rows.map((r) => r.userId) } }, select: { id: true, name: true, email: true, phone: true } });
  return rows.map((r) => ({ ...users.find((u) => u.id === r.userId)!, orders: r._count, spent: r._sum.total ?? 0 }));
}

/** Tốc độ bán (30 ngày) -> số ngày còn đủ hàng & gợi ý số lượng nhập. */
export async function inventoryForecast(opts: { onlyRisk?: boolean; leadTimeDays?: number; coverDays?: number; take?: number } = {}) {
  const lead = opts.leadTimeDays ?? 7;
  const cover = opts.coverDays ?? 30;
  const since = new Date(Date.now() - 30 * 86400000);
  const [products, sales] = await Promise.all([
    prisma.product.findMany({ where: { isActive: true }, select: { id: true, name: true, sku: true, stock: true, lowStockThreshold: true, price: true, costPrice: true, category: { select: { name: true } } } }),
    prisma.orderItem.groupBy({ by: ["productId"], where: { order: { createdAt: { gte: since }, status: { in: REVENUE_STATUSES } } }, _sum: { quantity: true } }),
  ]);
  const sold = new Map(sales.map((s) => [s.productId, s._sum.quantity ?? 0]));
  const list = products.map((p) => {
    const perDay = (sold.get(p.id) ?? 0) / 30;
    const daysLeft = perDay > 0 ? Math.floor(p.stock / perDay) : null;
    const reorder = Math.max(0, Math.ceil(perDay * (lead + cover) - p.stock));
    const risk = p.stock === 0 ? "HẾT HÀNG" : p.stock <= p.lowStockThreshold || (daysLeft !== null && daysLeft <= lead) ? "CẦN NHẬP GẤP" : daysLeft !== null && daysLeft <= lead + 14 ? "SẮP CẦN NHẬP" : "ỔN ĐỊNH";
    return { id: p.id, name: p.name, sku: p.sku, category: p.category.name, stock: p.stock, threshold: p.lowStockThreshold, sold30d: sold.get(p.id) ?? 0, perDay: Math.round(perDay * 100) / 100, daysLeft, suggestedReorder: risk === "ỔN ĐỊNH" ? 0 : Math.max(reorder, p.lowStockThreshold * 2 - p.stock), risk, reorderCost: 0 as number, _cost: p.costPrice ?? Math.round(p.price * 0.7) };
  });
  const order = { "HẾT HÀNG": 0, "CẦN NHẬP GẤP": 1, "SẮP CẦN NHẬP": 2, "ỔN ĐỊNH": 3 } as Record<string, number>;
  return list
    .filter((x) => !opts.onlyRisk || x.risk !== "ỔN ĐỊNH")
    .map(({ _cost, ...x }) => ({ ...x, reorderCost: x.suggestedReorder * _cost }))
    .sort((a, b) => order[a.risk] - order[b.risk] || (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999))
    .slice(0, opts.take ?? 500);
}

export async function findProducts(q: string | undefined, opts: { categorySlug?: string; stockBelow?: number; active?: boolean; take?: number; sort?: string } = {}) {
  const where: Prisma.ProductWhereInput = {};
  const and: Prisma.ProductWhereInput[] = [];
  if (q) for (const w of q.split(/\s+/).filter(Boolean)) and.push({ OR: [{ name: { contains: w, mode: "insensitive" } }, { sku: { contains: w.toUpperCase(), mode: "insensitive" } }, { slug: { contains: w.toLowerCase(), mode: "insensitive" } }, { brand: { name: { contains: w, mode: "insensitive" } } }] });
  if (opts.categorySlug) and.push({ OR: [{ category: { slug: opts.categorySlug } }, { category: { parent: { slug: opts.categorySlug } } }] });
  if (opts.stockBelow != null) and.push({ stock: { lte: opts.stockBelow } });
  if (opts.active != null) and.push({ isActive: opts.active });
  if (and.length) where.AND = and;
  return prisma.product.findMany({
    where,
    take: opts.take ?? 20,
    orderBy: opts.sort === "stock" ? { stock: "asc" } : opts.sort === "sold" ? { sold: "desc" } : { updatedAt: "desc" },
    select: { id: true, name: true, sku: true, price: true, comparePrice: true, stock: true, sold: true, isActive: true, isFeatured: true, rating: true, lowStockThreshold: true, category: { select: { name: true } }, brand: { select: { name: true } } },
  });
}

export async function resolveProduct(ref: { id?: number; sku?: string; name?: string }) {
  if (ref.id) return prisma.product.findUnique({ where: { id: ref.id } });
  if (ref.sku) return prisma.product.findUnique({ where: { sku: ref.sku.toUpperCase() } });
  if (ref.name) return prisma.product.findFirst({ where: { name: { contains: ref.name, mode: "insensitive" } } });
  return null;
}

export async function adjustStock(productId: number, change: number, type: "IMPORT" | "ADJUST", note: string, actor: { id: number | null; email: string }, viaAI = false) {
  const p = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
  if (p.stock + change < 0) throw new Error(`Tồn kho không đủ (hiện có ${p.stock})`);
  const updated = await prisma.product.update({ where: { id: productId }, data: { stock: { increment: change } } });
  await prisma.inventoryLog.create({ data: { productId, change, stockAfter: updated.stock, type, note, actor: viaAI ? `AI (${actor.email})` : actor.email } });
  await audit(actor.id, type === "IMPORT" ? "Nhập kho" : "Điều chỉnh kho", `${p.name} (${p.sku}): ${change > 0 ? "+" : ""}${change} → ${updated.stock}. ${note}`, viaAI);
  return { id: p.id, name: p.name, sku: p.sku, before: p.stock, after: updated.stock };
}

export type ProductPatch = Partial<{ name: string; price: number; comparePrice: number | null; costPrice: number; isActive: boolean; isFeatured: boolean; lowStockThreshold: number; shortDesc: string; description: string; tags: string }>;

export async function patchProduct(productId: number, patch: ProductPatch, actor: { id: number | null }, viaAI = false) {
  const p = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
  if (patch.price != null && patch.price <= 0) throw new Error("Giá phải lớn hơn 0");
  const updated = await prisma.product.update({ where: { id: productId }, data: patch });
  const changes = Object.entries(patch).map(([k, v]) => `${k}: ${String((p as Record<string, unknown>)[k]).slice(0, 40)} → ${String(v).slice(0, 40)}`).join("; ");
  await audit(actor.id, "Cập nhật sản phẩm", `${p.name} (${p.sku}): ${changes}`, viaAI);
  return updated;
}

export async function listOrders(f: { status?: string; q?: string; paymentStatus?: string; days?: number; take?: number; skip?: number }) {
  const where: Prisma.OrderWhereInput = {
    ...(f.status ? { status: f.status } : {}),
    ...(f.paymentStatus ? { paymentStatus: f.paymentStatus } : {}),
    ...(f.days ? { createdAt: { gte: new Date(Date.now() - f.days * 86400000) } } : {}),
    ...(f.q ? { OR: [{ code: { contains: f.q.toUpperCase(), mode: "insensitive" } }, { fullName: { contains: f.q, mode: "insensitive" } }, { phone: { contains: f.q, mode: "insensitive" } }] } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { createdAt: "desc" }, take: f.take ?? 20, skip: f.skip ?? 0, include: { _count: { select: { items: true } } } }),
    prisma.order.count({ where }),
  ]);
  return { items, total };
}

export async function changeOrderStatus(code: string, status: string, note: string | undefined, actor: { id: number | null; email: string }, viaAI = false) {
  const o = await prisma.order.findUniqueOrThrow({ where: { code } });
  const updated = await updateOrderStatus(o.id, status, { note, actor: viaAI ? `AI (${actor.email})` : actor.email });
  await audit(actor.id, "Cập nhật đơn hàng", `${code}: ${o.status} → ${status}${note ? ` (${note})` : ""}`, viaAI);
  return updated;
}
