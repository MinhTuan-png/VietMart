import Link from "next/link";
import { LayoutDashboard, Package, ShoppingBag, Warehouse, FolderTree, Users, Ticket, MessageSquare, Bot, History, Store } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logoutAdminAction } from "@/app/actions/auth";
import AiWidget from "@/components/admin/AiWidget";

export const metadata = { title: { default: "Quản trị", template: "%s | Quản trị VietMart" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const [pending, low] = await Promise.all([
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.product.count({ where: { isActive: true, stock: { lte: prisma.product.fields.lowStockThreshold } } }),
  ]);
  const nav = [
    ["/admin", "Tổng quan", LayoutDashboard, 0],
    ["/admin/orders", "Đơn hàng", ShoppingBag, pending],
    ["/admin/products", "Sản phẩm", Package, 0],
    ["/admin/inventory", "Kho hàng", Warehouse, low],
    ["/admin/categories", "Danh mục", FolderTree, 0],
    ["/admin/users", "Khách hàng", Users, 0],
    ["/admin/coupons", "Mã giảm giá", Ticket, 0],
    ["/admin/reviews", "Đánh giá", MessageSquare, 0],
    ["/admin/ai", "Trợ lý AI", Bot, 0],
    ["/admin/logs", "Nhật ký hoạt động", History, 0],
  ] as const;
  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-gray-900 text-gray-300 md:flex">
        <Link href="/admin" className="flex items-center gap-2 px-5 py-5 text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 font-black">V</span>
          <span className="text-lg font-bold">VietMart <span className="text-xs font-normal text-gray-400">Admin</span></span>
        </Link>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
          {nav.map(([href, label, Icon, badge]) => (
            <Link key={href} href={href} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-gray-800 hover:text-white">
              <Icon size={17} /> <span className="flex-1">{label}</span>
              {badge > 0 && <span className="rounded-full bg-brand-500 px-2 text-xs text-white">{badge}</span>}
            </Link>
          ))}
        </nav>
        <div className="border-t border-gray-800 p-4 text-sm">
          <div className="text-white">{admin.name}</div>
          <div className="mb-2 text-xs text-gray-500">{admin.role}</div>
          <div className="flex gap-3 text-xs">
            <Link href="/" className="flex items-center gap-1 hover:text-white"><Store size={13} /> Xem shop</Link>
            <form action={logoutAdminAction}><button className="hover:text-white">Đăng xuất</button></form>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="scrollbar-none flex gap-2 overflow-x-auto bg-gray-900 p-2 md:hidden">
          {nav.map(([href, label]) => (
            <Link key={href} href={href} className="shrink-0 rounded px-3 py-1 text-xs text-gray-200 hover:bg-gray-700">{label}</Link>
          ))}
        </div>
        <main className="p-4 lg:p-6">{children}</main>
      </div>
      <AiWidget />
    </div>
  );
}
