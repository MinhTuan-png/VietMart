import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

export const productCardSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  comparePrice: true,
  thumbnail: true,
  rating: true,
  ratingCount: true,
  sold: true,
  stock: true,
} satisfies Prisma.ProductSelect;

export type ProductCardData = Prisma.ProductGetPayload<{ select: typeof productCardSelect }>;

export async function getCategoryTree() {
  return prisma.category.findMany({
    where: { parentId: null },
    orderBy: { sortOrder: "asc" },
    include: { children: { orderBy: { sortOrder: "asc" } } },
  });
}

export type ProductFilter = {
  q?: string;
  categoryIds?: number[];
  brands?: string[];
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  inStock?: boolean;
  sort?: string;
  page?: number;
  pageSize?: number;
};

/** Tìm kiếm không dấu đơn giản: so khớp từng từ khóa trên tên / tags / thương hiệu. */
export async function searchProducts(f: ProductFilter) {
  const pageSize = f.pageSize ?? 24;
  const page = Math.max(1, f.page ?? 1);
  const where: Prisma.ProductWhereInput = { isActive: true };
  const and: Prisma.ProductWhereInput[] = [];
  if (f.q) {
    for (const word of f.q.trim().split(/\s+/).filter(Boolean).slice(0, 6)) {
      and.push({
        OR: [
          { name: { contains: word, mode: "insensitive" } },
          { tags: { contains: word.toLowerCase(), mode: "insensitive" } },
          { slug: { contains: word.toLowerCase(), mode: "insensitive" } },
          { brand: { name: { contains: word, mode: "insensitive" } } },
          { category: { name: { contains: word, mode: "insensitive" } } },
        ],
      });
    }
  }
  if (f.categoryIds?.length) and.push({ categoryId: { in: f.categoryIds } });
  if (f.brands?.length) and.push({ brand: { slug: { in: f.brands } } });
  if (f.minPrice) and.push({ price: { gte: f.minPrice } });
  if (f.maxPrice) and.push({ price: { lte: f.maxPrice } });
  if (f.rating) and.push({ rating: { gte: f.rating } });
  if (f.inStock) and.push({ stock: { gt: 0 } });
  if (and.length) where.AND = and;

  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    f.sort === "price_asc" ? [{ price: "asc" }]
    : f.sort === "price_desc" ? [{ price: "desc" }]
    : f.sort === "newest" ? [{ createdAt: "desc" }]
    : f.sort === "bestseller" ? [{ sold: "desc" }]
    : f.sort === "rating" ? [{ rating: "desc" }, { ratingCount: "desc" }]
    : [{ isFeatured: "desc" }, { sold: "desc" }];

  const [items, total, brandFacets] = await Promise.all([
    prisma.product.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize, select: productCardSelect }),
    prisma.product.count({ where }),
    prisma.brand.findMany({
      where: { products: { some: { isActive: true, ...(f.categoryIds?.length ? { categoryId: { in: f.categoryIds } } : {}) } } },
      select: { name: true, slug: true, _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    }),
  ]);
  return { items, total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)), brandFacets };
}
