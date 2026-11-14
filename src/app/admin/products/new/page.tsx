import { prisma } from "@/lib/db";
import ProductForm from "@/components/admin/ProductForm";

export const metadata = { title: "Thêm sản phẩm" };

export default async function NewProduct() {
  const cats = await prisma.category.findMany({ where: { parentId: null }, include: { children: true }, orderBy: { sortOrder: "asc" } });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Thêm sản phẩm</h1>
      <ProductForm cats={cats} />
    </div>
  );
}
