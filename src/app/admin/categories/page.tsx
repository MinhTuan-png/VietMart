import Link from "next/link";
import { prisma } from "@/lib/db";
import { CategoryForm } from "@/components/admin/SimpleForms";

export const metadata = { title: "Danh mục" };

export default async function Categories() {
  const cats = await prisma.category.findMany({ where: { parentId: null }, orderBy: { sortOrder: "asc" }, include: { children: { include: { _count: { select: { products: true } } } } } });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Danh mục</h1>
      <div className="card p-5"><CategoryForm parents={cats} /></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cats.map((c) => (
          <div key={c.id} className="card p-5">
            <div className="mb-2 font-semibold">{c.icon} {c.name}</div>
            <ul className="space-y-1 text-sm">
              {c.children.map((ch) => (
                <li key={ch.id} className="flex justify-between"><Link href={`/admin/products?cat=${ch.id}`} className="hover:text-brand-600">{ch.name}</Link><span className="text-gray-400">{ch._count.products} SP</span></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
