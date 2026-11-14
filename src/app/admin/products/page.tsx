import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatVND } from "@/lib/utils";
import { toggleProductActive } from "@/app/actions/admin";
import ActionButton from "@/components/admin/ActionButton";
import ProductImage from "@/components/ProductImage";
import type { Prisma } from "@prisma/client";

export const metadata = { title: "Sản phẩm" };

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string; status?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = Number(sp.page) || 1;
  const where: Prisma.ProductWhereInput = {
    ...(sp.q ? { OR: [{ name: { contains: sp.q, mode: "insensitive" } }, { sku: { contains: sp.q.toUpperCase(), mode: "insensitive" } }] } : {}),
    ...(sp.cat ? { OR: [{ categoryId: Number(sp.cat) }, { category: { parentId: Number(sp.cat) } }] } : {}),
    ...(sp.status === "hidden" ? { isActive: false } : sp.status === "out" ? { stock: 0 } : sp.status === "featured" ? { isFeatured: true } : {}),
  };
  const [items, total, cats] = await Promise.all([
    prisma.product.findMany({ where, orderBy: { updatedAt: "desc" }, take: 25, skip: (page - 1) * 25, include: { category: true, brand: true } }),
    prisma.product.count({ where }),
    prisma.category.findMany({ where: { parentId: null }, include: { children: true } }),
  ]);
  const qs = (p: Record<string, string | undefined>) => `/admin/products?${new URLSearchParams(Object.entries({ ...sp, ...p }).filter(([, v]) => v) as [string, string][])}`;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sản phẩm <span className="text-base font-normal text-gray-500">({total})</span></h1>
        <Link href="/admin/products/new" className="btn-primary">+ Thêm sản phẩm</Link>
      </div>
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Tên hoặc SKU..." className="input max-w-xs bg-white" />
        <select name="cat" defaultValue={sp.cat ?? ""} className="input max-w-[220px] bg-white">
          <option value="">Tất cả danh mục</option>
          {cats.map((c) => (
            <optgroup key={c.id} label={c.name}>
              <option value={c.id}>Tất cả {c.name}</option>
              {c.children.map((ch) => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
            </optgroup>
          ))}
        </select>
        <select name="status" defaultValue={sp.status ?? ""} className="input max-w-[180px] bg-white">
          <option value="">Mọi trạng thái</option><option value="out">Hết hàng</option><option value="hidden">Đang ẩn</option><option value="featured">Nổi bật</option>
        </select>
        <button className="btn-primary">Lọc</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr><th className="p-3">Sản phẩm</th><th>Danh mục</th><th className="text-right">Giá bán</th><th className="text-right">Tồn kho</th><th className="text-right">Đã bán</th><th className="text-center">Trạng thái</th><th className="p-3" /></tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <ProductImage src={p.thumbnail} alt={p.name} className="h-11 w-11 shrink-0 rounded border" />
                    <div><div className="line-clamp-1 font-medium">{p.name}</div><div className="text-xs text-gray-500">{p.sku} {p.brand && `· ${p.brand.name}`}</div></div>
                  </div>
                </td>
                <td className="text-gray-600">{p.category.name}</td>
                <td className="text-right">{formatVND(p.price)}</td>
                <td className={`text-right font-medium ${p.stock === 0 ? "text-red-600" : p.stock <= p.lowStockThreshold ? "text-amber-600" : ""}`}>{p.stock}</td>
                <td className="text-right">{p.sold}</td>
                <td className="text-center">
                  <span className={`rounded px-2 py-0.5 text-xs ${p.isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>{p.isActive ? "Đang bán" : "Đã ẩn"}</span>
                  {p.isFeatured && <span className="ml-1 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">★</span>}
                </td>
                <td className="p-3 text-right whitespace-nowrap">
                  <Link href={`/admin/products/${p.id}`} className="mr-3 text-brand-600">Sửa</Link>
                  <ActionButton action={toggleProductActive.bind(null, p.id)} className="text-gray-500 hover:text-gray-800">{p.isActive ? "Ẩn" : "Hiện"}</ActionButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end gap-2">
        {page > 1 && <Link href={qs({ page: String(page - 1) })} className="btn-ghost">‹ Trước</Link>}
        {page * 25 < total && <Link href={qs({ page: String(page + 1) })} className="btn-ghost">Sau ›</Link>}
      </div>
    </div>
  );
}
