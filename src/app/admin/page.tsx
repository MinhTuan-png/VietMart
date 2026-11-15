import Link from "next/link";
import { TrendingUp, TrendingDown, ShoppingBag, Users, AlertTriangle, Wallet } from "lucide-react";
import { dashboardStats, inventoryForecast, topCustomers, topProducts } from "@/lib/admin-ops";
import { prisma } from "@/lib/db";
import { formatDate, formatVND, ORDER_STATUS } from "@/lib/utils";
import { CategoryPie, RevenueChart, SimpleBar } from "@/components/admin/Charts";

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const days = Number((await searchParams).days) || 30;
  const [s, top, customers, risk, recent] = await Promise.all([
    dashboardStats(days),
    topProducts(days, 8),
    topCustomers(days, 5),
    inventoryForecast({ onlyRisk: true, take: 8 }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);
  const cards = [
    { label: "Doanh thu", value: formatVND(s.revenue), sub: s.revenueGrowth != null ? `${s.revenueGrowth > 0 ? "+" : ""}${s.revenueGrowth}% so với kỳ trước` : "", up: (s.revenueGrowth ?? 0) >= 0, icon: Wallet, color: "bg-brand-500" },
    { label: "Lợi nhuận ước tính", value: formatVND(s.estimatedProfit), sub: `Biên LN ${s.revenue ? Math.round((s.estimatedProfit / s.revenue) * 100) : 0}%`, icon: TrendingUp, color: "bg-emerald-500" },
    { label: "Đơn hàng", value: s.orders, sub: `Giá trị TB ${formatVND(s.avgOrderValue)} · ${s.cancelled} hủy`, icon: ShoppingBag, color: "bg-blue-500" },
    { label: "Khách hàng mới", value: s.newCustomers, sub: `${s.productsCount} sản phẩm đang bán`, icon: Users, color: "bg-violet-500" },
  ];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Tổng quan</h1>
        <div className="flex gap-1 rounded-md bg-white p-1 text-sm shadow-sm">
          {[7, 30, 90].map((d) => (
            <Link key={d} href={`/admin?days=${d}`} className={`rounded px-3 py-1 ${d === days ? "bg-brand-500 text-white" : "hover:bg-gray-100"}`}>{d} ngày</Link>
          ))}
        </div>
      </div>
      {(s.outOfStock > 0 || s.lowStockCount > 0) && (
        <Link href="/admin/inventory" className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertTriangle size={20} /> Cảnh báo kho: <b>{s.outOfStock}</b> sản phẩm hết hàng, <b>{s.lowStockCount}</b> sản phẩm dưới ngưỡng tồn tối thiểu. Xem chi tiết ›
        </Link>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card flex gap-4 p-5">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-white ${c.color}`}><c.icon size={22} /></span>
            <div className="min-w-0">
              <div className="text-sm text-gray-500">{c.label}</div>
              <div className="text-base font-bold leading-tight xl:text-lg" title={String(c.value)}>{c.value}</div>
              <div className={`flex items-center gap-1 text-xs ${c.up === false ? "text-red-500" : c.up ? "text-emerald-600" : "text-gray-500"}`}>
                {c.up === false && <TrendingDown size={12} />}{c.sub}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="card p-5 xl:col-span-2">
          <div className="mb-2 font-semibold">Doanh thu {days} ngày</div>
          <RevenueChart data={s.daily} />
        </div>
        <div className="card p-5">
          <div className="mb-2 font-semibold">Doanh thu theo ngành hàng</div>
          <CategoryPie data={s.byCategory} />
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="card p-5">
          <div className="mb-2 font-semibold">Trạng thái đơn (toàn thời gian)</div>
          <SimpleBar data={Object.entries(s.statusCounts).map(([k, v]) => ({ name: ORDER_STATUS[k]?.label ?? k, value: v }))} />
        </div>
        <div className="card p-5">
          <div className="mb-2 font-semibold">Phương thức thanh toán</div>
          <SimpleBar data={s.byPayment} color="#10b981" />
        </div>
        <div className="card p-5">
          <div className="mb-3 font-semibold">Khách hàng chi tiêu nhiều</div>
          <div className="space-y-2 text-sm">
            {customers.map((c, i) => (
              <div key={c.id} className="flex items-center gap-2">
                <span className="w-5 text-gray-400">{i + 1}</span>
                <span className="flex-1 truncate">{c.name}</span>
                <span className="text-xs text-gray-500">{c.orders} đơn</span>
                <span className="w-28 text-right font-medium">{formatVND(c.spent)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="card p-5">
          <div className="mb-3 font-semibold">Sản phẩm bán chạy</div>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500"><th className="pb-2">Sản phẩm</th><th className="pb-2 text-right">Đã bán</th><th className="pb-2 text-right">Tồn</th><th className="pb-2 text-right">Doanh thu</th></tr></thead>
            <tbody>
              {top.map((p) => (
                <tr key={p.id} className="border-t"><td className="max-w-[220px] truncate py-2">{p.name}</td><td className="text-right">{p.qty}</td><td className={`text-right ${p.stock < 10 ? "text-red-500" : ""}`}>{p.stock}</td><td className="text-right">{formatVND(p.revenue)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between font-semibold">Dự báo cần nhập hàng <Link href="/admin/inventory?risk=1" className="text-sm font-normal text-brand-600">Xem tất cả</Link></div>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500"><th className="pb-2">Sản phẩm</th><th className="pb-2 text-right">Tồn</th><th className="pb-2 text-right">Còn ~ngày</th><th className="pb-2 text-right">Nên nhập</th></tr></thead>
            <tbody>
              {risk.map((p) => (
                <tr key={p.id} className="border-t"><td className="max-w-[220px] truncate py-2">{p.name}</td><td className={`text-right ${p.stock === 0 ? "font-semibold text-red-600" : ""}`}>{p.stock}</td><td className="text-right">{p.daysLeft ?? "—"}</td><td className="text-right font-medium text-brand-600">{p.suggestedReorder}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between font-semibold">Đơn hàng mới nhất <Link href="/admin/orders" className="text-sm font-normal text-brand-600">Xem tất cả</Link></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {recent.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="py-2"><Link href={`/admin/orders/${o.code}`} className="font-medium text-brand-600">{o.code}</Link></td>
                  <td>{o.fullName}</td><td className="text-gray-500">{formatDate(o.createdAt)}</td><td>{o.paymentMethod}</td>
                  <td><span className={`rounded px-2 py-0.5 text-xs ${ORDER_STATUS[o.status].color}`}>{ORDER_STATUS[o.status].label}</span></td>
                  <td className="text-right font-medium">{formatVND(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
