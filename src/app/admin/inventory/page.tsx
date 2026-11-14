import Link from "next/link";
import { inventoryForecast } from "@/lib/admin-ops";
import { prisma } from "@/lib/db";
import { formatDate, formatVND } from "@/lib/utils";
import StockAdjust from "@/components/admin/StockAdjust";

export const metadata = { title: "Kho hàng" };

const RISK_COLOR: Record<string, string> = { "HẾT HÀNG": "bg-red-100 text-red-700", "CẦN NHẬP GẤP": "bg-orange-100 text-orange-700", "SẮP CẦN NHẬP": "bg-amber-100 text-amber-700", "ỔN ĐỊNH": "bg-green-100 text-green-700" };

export default async function Inventory({ searchParams }: { searchParams: Promise<{ tab?: string; risk?: string; q?: string }> }) {
  const sp = await searchParams;
  const tab = sp.tab ?? "forecast";
  const list = tab === "forecast" ? await inventoryForecast({ onlyRisk: sp.risk === "1" }) : [];
  const filtered = sp.q ? list.filter((p) => p.name.toLowerCase().includes(sp.q!.toLowerCase()) || p.sku.includes(sp.q!.toUpperCase())) : list;
  const logs = tab === "logs" ? await prisma.inventoryLog.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { product: { select: { name: true, sku: true } } } }) : [];
  const totals = await prisma.product.aggregate({ where: { isActive: true }, _sum: { stock: true } });
  const value = await prisma.$queryRaw<{ v: number | null }[]>`SELECT SUM("stock"::bigint * COALESCE("costPrice", "price"))::float8 AS v FROM "Product" WHERE "isActive" = true`;
  const counts = list.reduce((m, p) => ((m[p.risk] = (m[p.risk] ?? 0) + 1), m), {} as Record<string, number>);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Kho hàng</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4"><div className="text-sm text-gray-500">Tổng tồn kho</div><div className="text-xl font-bold">{totals._sum.stock?.toLocaleString("vi-VN")} SP</div></div>
        <div className="card p-4"><div className="text-sm text-gray-500">Giá trị tồn (giá vốn)</div><div className="text-xl font-bold">{formatVND(Number(value[0]?.v ?? 0))}</div></div>
        <div className="card p-4"><div className="text-sm text-gray-500">Hết hàng</div><div className="text-xl font-bold text-red-600">{counts["HẾT HÀNG"] ?? "—"}</div></div>
        <div className="card p-4"><div className="text-sm text-gray-500">Cần nhập gấp</div><div className="text-xl font-bold text-orange-600">{counts["CẦN NHẬP GẤP"] ?? "—"}</div></div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/admin/inventory" className={`rounded px-3 py-1.5 text-sm ${tab === "forecast" && !sp.risk ? "bg-brand-500 text-white" : "bg-white"}`}>Tất cả tồn kho & dự báo</Link>
        <Link href="/admin/inventory?risk=1" className={`rounded px-3 py-1.5 text-sm ${sp.risk ? "bg-brand-500 text-white" : "bg-white"}`}>Chỉ hàng cần nhập</Link>
        <Link href="/admin/inventory?tab=logs" className={`rounded px-3 py-1.5 text-sm ${tab === "logs" ? "bg-brand-500 text-white" : "bg-white"}`}>Nhật ký xuất nhập</Link>
        {tab === "forecast" && (
          <form className="ml-auto flex gap-2">
            {sp.risk && <input type="hidden" name="risk" value="1" />}
            <input name="q" defaultValue={sp.q} placeholder="Tìm sản phẩm/SKU" className="input bg-white" />
          </form>
        )}
      </div>
      {tab === "forecast" ? (
        <div className="card overflow-x-auto">
          <p className="border-b p-3 text-xs text-gray-500">Dự báo dựa trên tốc độ bán 30 ngày gần nhất. Gợi ý nhập = đủ bán trong (7 ngày chờ hàng + 30 ngày) – tồn hiện tại.</p>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr><th className="p-3">Sản phẩm</th><th className="text-right">Tồn</th><th className="text-right">Ngưỡng</th><th className="text-right">Bán 30 ngày</th><th className="text-right">TB/ngày</th><th className="text-right">Còn ~ngày</th><th className="text-center">Tình trạng</th><th className="text-right">Gợi ý nhập</th><th className="p-3" /></tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="p-3"><Link href={`/admin/products/${p.id}`} className="font-medium hover:text-brand-600">{p.name}</Link><div className="text-xs text-gray-500">{p.sku} · {p.category}</div></td>
                  <td className="text-right font-semibold">{p.stock}</td>
                  <td className="text-right text-gray-500">{p.threshold}</td>
                  <td className="text-right">{p.sold30d}</td>
                  <td className="text-right">{p.perDay}</td>
                  <td className="text-right">{p.daysLeft ?? "—"}</td>
                  <td className="text-center"><span className={`rounded px-2 py-0.5 text-xs whitespace-nowrap ${RISK_COLOR[p.risk]}`}>{p.risk}</span></td>
                  <td className="text-right font-medium text-brand-600">{p.suggestedReorder || ""}</td>
                  <td className="p-3"><StockAdjust productId={p.id} suggested={p.suggestedReorder} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500"><tr><th className="p-3">Thời gian</th><th>Sản phẩm</th><th>Loại</th><th className="text-right">Thay đổi</th><th className="text-right">Tồn sau</th><th className="pl-4">Ghi chú</th><th>Người thực hiện</th></tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="p-3 text-gray-500">{formatDate(l.createdAt)}</td><td>{l.product.name}</td><td>{l.type}</td>
                  <td className={`text-right font-medium ${l.change > 0 ? "text-emerald-600" : "text-red-600"}`}>{l.change > 0 ? "+" : ""}{l.change}</td>
                  <td className="text-right">{l.stockAfter}</td><td className="pl-4 text-gray-500">{l.note}</td><td className="text-gray-400">{l.actor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
