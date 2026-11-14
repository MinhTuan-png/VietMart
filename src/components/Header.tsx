import Link from "next/link";
import { Suspense } from "react";
import { ShoppingCart, User, Bell, HelpCircle, Store, Truck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCategoryTree } from "@/lib/products";
import { logoutAction } from "@/app/actions/auth";
import { getNotifications } from "@/lib/notifications";
import { formatDate } from "@/lib/utils";
import SearchBox from "./SearchBox";

export default async function Header() {
  const user = await getCurrentUser();
  const [cartCount, cats, notices] = await Promise.all([
    user ? prisma.cartItem.count({ where: { userId: user.id } }) : 0,
    getCategoryTree(),
    getNotifications(user?.id ?? null, 5),
  ]);
  return (
    <header className="sticky top-0 z-40 bg-gradient-to-b from-brand-600 to-brand-500 text-white shadow">
      <div className="container-x hidden items-center justify-between py-1.5 text-xs sm:flex">
        <div className="flex items-center gap-4">
          {user && (user.role === "ADMIN" || user.role === "STAFF") && (
            <Link href="/admin" className="flex items-center gap-1 hover:opacity-80"><Store size={13} /> Kênh quản trị</Link>
          )}
          <Link href="/order-tracking" className="flex items-center gap-1 hover:opacity-80"><Truck size={13} /> Tra cứu đơn hàng</Link>
          <span className="opacity-90">Hotline: 1900 6868</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="group relative">
            <Link href="/notifications" className="flex items-center gap-1 hover:opacity-80"><Bell size={13} /> Thông báo</Link>
            <div className="invisible absolute right-0 z-50 w-80 pt-2 group-hover:visible">
              <div className="overflow-hidden rounded-md bg-white text-sm text-gray-700 shadow-xl">
                <div className="border-b px-4 py-2 text-xs text-gray-400">Thông báo mới nhận</div>
                {notices.length === 0 && <div className="px-4 py-6 text-center text-gray-500">Chưa có thông báo</div>}
                {notices.map((n) => (
                  <Link key={n.id} href={n.href} className="block border-b px-4 py-2.5 last:border-0 hover:bg-gray-50">
                    <span className="block font-medium text-gray-800">{n.title}</span>
                    <span className="line-clamp-2 block text-xs text-gray-600">{n.body}</span>
                    <span className="block text-[11px] text-gray-400">{formatDate(n.at)}</span>
                  </Link>
                ))}
                <Link href="/notifications" className="block bg-gray-50 py-2 text-center text-brand-600 hover:bg-gray-100">Xem tất cả</Link>
              </div>
            </div>
          </div>
          <Link href="/help" className="flex items-center gap-1 hover:opacity-80"><HelpCircle size={13} /> Hỗ trợ</Link>
          {user ? (
            <div className="group relative">
              <Link href="/account" className="flex items-center gap-1 font-medium hover:opacity-80"><User size={13} /> {user.name}</Link>
              <div className="invisible absolute right-0 z-50 w-48 pt-2 group-hover:visible">
                <div className="overflow-hidden rounded-md bg-white text-sm text-gray-700 shadow-xl">
                  <Link href="/account" className="block px-4 py-2 hover:bg-gray-50">Tài khoản của tôi</Link>
                  <Link href="/account/orders" className="block px-4 py-2 hover:bg-gray-50">Đơn mua</Link>
                  <Link href="/account/wishlist" className="block px-4 py-2 hover:bg-gray-50">Sản phẩm yêu thích</Link>
                  <form action={logoutAction}>
                    <button className="block w-full px-4 py-2 text-left hover:bg-gray-50">Đăng xuất</button>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            <span className="flex gap-2 font-medium">
              <Link href="/register" className="hover:opacity-80">Đăng ký</Link>|<Link href="/login" className="hover:opacity-80">Đăng nhập</Link>
            </span>
          )}
        </div>
      </div>
      <div className="container-x flex items-center gap-3 py-3 sm:gap-6">
        <Link href="/" className="flex shrink-0 items-center gap-1.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-xl font-black text-brand-600">V</span>
          <span className="hidden text-2xl font-extrabold tracking-tight sm:block">VietMart</span>
        </Link>
        <Suspense fallback={<div className="h-10 flex-1 rounded-md bg-white" />}>
          <SearchBox />
        </Suspense>
        <Link href="/cart" className="relative shrink-0 p-1" aria-label="Giỏ hàng">
          <ShoppingCart size={28} />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-2 min-w-5 rounded-full border-2 border-brand-500 bg-white px-1 text-center text-xs font-bold text-brand-600">{cartCount}</span>
          )}
        </Link>
        <Link href={user ? "/account" : "/login"} className="shrink-0 sm:hidden" aria-label="Tài khoản"><User size={24} /></Link>
      </div>
      <nav className="container-x scrollbar-none flex gap-5 overflow-x-auto pb-2 text-[13px] whitespace-nowrap">
        {cats.map((c) => (
          <Link key={c.id} href={`/c/${c.slug}`} className="opacity-90 hover:opacity-100 hover:underline">{c.name}</Link>
        ))}
      </nav>
    </header>
  );
}
