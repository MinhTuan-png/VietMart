import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { availableCoupons } from "@/lib/coupons";
import CheckoutForm from "@/components/CheckoutForm";

export const metadata = { title: "Thanh toán" };

export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  const [addresses, items, coupons] = await Promise.all([
    prisma.address.findMany({ where: { userId: user.id }, orderBy: { isDefault: "desc" } }),
    prisma.cartItem.findMany({ where: { userId: user.id, selected: true }, include: { product: { select: { name: true, price: true, thumbnail: true } } } }),
    availableCoupons(),
  ]);
  if (!items.length) redirect("/cart");
  return (
    <div className="container-x py-4">
      <h1 className="mb-4 text-xl font-semibold">Thanh toán</h1>
      <CheckoutForm addresses={addresses} items={items} coupons={coupons.map((c) => ({ code: c.code, description: c.description, minOrder: c.minOrder }))} />
    </div>
  );
}
