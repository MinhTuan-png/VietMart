import Link from "next/link";
import { Bell, Tag, Package } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getNotifications } from "@/lib/notifications";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Thông báo" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  const list = await getNotifications(user?.id ?? null, 50);
  return (
    <div className="container-x py-6">
      <h1 className="mb-4 flex items-center gap-2 text-xl font-bold"><Bell size={22} /> Thông báo</h1>
      {!user && (
        <div className="card mb-3 p-4 text-sm text-gray-600">
          <Link href="/login?next=/notifications" className="font-medium text-brand-600 hover:underline">Đăng nhập</Link> để nhận thông báo về đơn hàng của bạn.
        </div>
      )}
      <div className="card divide-y">
        {list.length === 0 && <div className="p-6 text-center text-sm text-gray-500">Chưa có thông báo nào.</div>}
        {list.map((n) => (
          <Link key={n.id} href={n.href} className="flex gap-3 p-4 hover:bg-gray-50">
            <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${n.kind === "order" ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-brand-600"}`}>
              {n.kind === "order" ? <Package size={18} /> : <Tag size={18} />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-gray-800">{n.title}</span>
              <span className="block text-sm text-gray-600">{n.body}</span>
              <span className="mt-0.5 block text-xs text-gray-400">{formatDate(n.at)}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
