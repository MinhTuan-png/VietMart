import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDate, parseJSON } from "@/lib/utils";
import ProductForm from "@/components/admin/ProductForm";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const [p, cats, logs] = await Promise.all([
    prisma.product.findUnique({ where: { id }, include: { brand: true } }),
    prisma.category.findMany({ where: { parentId: null }, include: { children: true }, orderBy: { sortOrder: "asc" } }),
    prisma.inventoryLog.findMany({ where: { productId: id }, orderBy: { createdAt: "desc" }, take: 15 }),
  ]);
  if (!p) notFound();
  const specs = Object.entries(parseJSON<Record<string, string>>(p.specs, {})).map(([k, v]) => `${k}: ${v}`).join("\n");
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sửa sản phẩm</h1>
        <Link href={`/p/${p.slug}`} target="_blank" className="text-sm text-brand-600">Xem trên shop ↗</Link>
      </div>
      <ProductForm cats={cats} p={{ ...p, brand: p.brand?.name, images: parseJSON<string[]>(p.images, []).join("\n"), specs }} />
      <div className="card p-5">
        <div className="mb-3 font-semibold">Lịch sử kho gần đây</div>
        <table className="w-full text-sm">
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t"><td className="py-2 text-gray-500">{formatDate(l.createdAt)}</td><td>{l.type}</td><td className={l.change > 0 ? "text-emerald-600" : "text-red-600"}>{l.change > 0 ? "+" : ""}{l.change}</td><td>→ {l.stockAfter}</td><td className="text-gray-500">{l.note}</td><td className="text-gray-400">{l.actor}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
