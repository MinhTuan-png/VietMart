import Link from "next/link";
import { User, Package, MapPin, Heart, LogOut } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { requireUser } from "@/lib/auth";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/account");
  const links = [
    ["/account", "Hồ sơ của tôi", User],
    ["/account/orders", "Đơn mua", Package],
    ["/account/addresses", "Sổ địa chỉ", MapPin],
    ["/account/wishlist", "Sản phẩm yêu thích", Heart],
  ] as const;
  return (
    <div className="container-x grid gap-4 py-4 md:grid-cols-[220px_1fr]">
      <aside className="h-fit">
        <div className="mb-4 flex items-center gap-3 border-b pb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-lg font-bold text-white">{user.name.split(" ").pop()?.[0]}</div>
          <div><div className="font-semibold">{user.name}</div><div className="text-xs text-gray-500">{user.email}</div></div>
        </div>
        <nav className="flex gap-1 overflow-x-auto md:flex-col">
          {links.map(([href, label, Icon]) => (
            <Link key={href} href={href} className="flex shrink-0 items-center gap-2 rounded px-3 py-2 text-sm hover:bg-white hover:text-brand-600">
              <Icon size={16} className="text-brand-500" /> {label}
            </Link>
          ))}
          <form action={logoutAction} className="shrink-0">
            <button className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-red-600 hover:bg-white"><LogOut size={16} /> Đăng xuất</button>
          </form>
        </nav>
      </aside>
      <div>{children}</div>
    </div>
  );
}
