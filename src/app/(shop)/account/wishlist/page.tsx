import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { productCardSelect } from "@/lib/products";
import { ProductGrid } from "@/components/ProductCard";

export const metadata = { title: "Sản phẩm yêu thích" };

export default async function WishlistPage() {
  const user = await requireUser("/account/wishlist");
  const list = await prisma.wishlist.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { product: { select: productCardSelect } } });
  return (
    <div className="card p-4">
      <h1 className="mb-4 text-lg font-semibold">Sản phẩm yêu thích ({list.length})</h1>
      {list.length ? <ProductGrid items={list.map((w) => w.product)} cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" /> : <p className="py-10 text-center text-gray-500">❤️ Bạn chưa thích sản phẩm nào</p>}
    </div>
  );
}
