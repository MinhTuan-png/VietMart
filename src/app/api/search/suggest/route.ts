import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 1) return NextResponse.json({ products: [], categories: [] });
  const words = q.split(/\s+/).slice(0, 4);
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true, AND: words.map((w) => ({ OR: [{ name: { contains: w, mode: "insensitive" } }, { slug: { contains: w.toLowerCase(), mode: "insensitive" } }, { tags: { contains: w.toLowerCase(), mode: "insensitive" } }] })) },
      orderBy: { sold: "desc" },
      take: 6,
      select: { name: true, slug: true, thumbnail: true, price: true },
    }),
    prisma.category.findMany({ where: { name: { contains: q, mode: "insensitive" } }, take: 3, select: { name: true, slug: true } }),
  ]);
  return NextResponse.json({ products, categories });
}
