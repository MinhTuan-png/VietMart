import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { cartRecommendations, bestSellers } from "@/lib/recommend";
import CartView from "@/components/CartView";
import { ProductGrid, Section } from "@/components/ProductCard";

export const metadata = { title: "Giỏ hàng" };

export default async function CartPage() {
  const user = await requireUser("/cart");
  const items = await prisma.cartItem.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { product: { select: { name: true, slug: true, price: true, comparePrice: true, thumbnail: true, stock: true, isActive: true } } },
  });
  const recs = items.length ? await cartRecommendations(user.id, 12) : await bestSellers(12);
  return (
    <div className="container-x space-y-4 py-4">
      <h1 className="flex items-center gap-2 text-xl font-semibold"><ShoppingCart className="text-brand-500" /> Giỏ hàng</h1>
      {items.length ? (
        <CartView items={items} />
      ) : (
        <div className="card flex flex-col items-center gap-3 py-14 text-gray-500">
          <ShoppingCart size={64} className="text-gray-300" />
          Giỏ hàng của bạn còn trống
          <Link href="/" className="btn-primary px-10">Mua ngay</Link>
        </div>
      )}
      <Section title={items.length ? "Có thể bạn cũng cần" : "Sản phẩm bán chạy"}>
        <ProductGrid items={recs} />
      </Section>
    </div>
  );
}
