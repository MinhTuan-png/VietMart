import { prisma } from "@/lib/db";
import { formatDate, formatVND } from "@/lib/utils";
import { setUserRole, toggleUserLock } from "@/app/actions/admin";
import ActionButton from "@/components/admin/ActionButton";

export const metadata = { title: "Khách hàng" };

export default async function Users({ searchParams }: { searchParams: Promise<{ q?: string; role?: string }> }) {
  const sp = await searchParams;
  const users = await prisma.user.findMany({
    where: { ...(sp.q ? { OR: [{ name: { contains: sp.q, mode: "insensitive" } }, { email: { contains: sp.q, mode: "insensitive" } }, { phone: { contains: sp.q, mode: "insensitive" } }] } : {}), ...(sp.role ? { role: sp.role } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { _count: { select: { orders: true } } },
  });
  const spent = await prisma.order.groupBy({ by: ["userId"], where: { status: "DELIVERED", userId: { in: users.map((u) => u.id) } }, _sum: { total: true } });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Khách hàng & Phân quyền</h1>
      <form className="flex gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Tên, email, SĐT" className="input max-w-xs bg-white" />
        <select name="role" defaultValue={sp.role ?? ""} className="input max-w-[160px] bg-white"><option value="">Mọi vai trò</option><option>CUSTOMER</option><option>STAFF</option><option>ADMIN</option></select>
        <button className="btn-primary">Lọc</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500"><tr><th className="p-3">Người dùng</th><th>SĐT</th><th>Ngày tham gia</th><th className="text-right">Đơn</th><th className="text-right">Đã chi</th><th className="pl-4">Vai trò</th><th className="p-3" /></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={`border-t ${u.isLocked ? "bg-red-50/50" : ""}`}>
                <td className="p-3">{u.name}<div className="text-xs text-gray-500">{u.email}</div></td>
                <td>{u.phone}</td><td className="text-gray-500">{formatDate(u.createdAt, false)}</td>
                <td className="text-right">{u._count.orders}</td>
                <td className="text-right">{formatVND(spent.find((s) => s.userId === u.id)?._sum.total ?? 0)}</td>
                <td className="pl-4">
                  <div className="flex gap-1">
                    {["CUSTOMER", "STAFF", "ADMIN"].map((r) => (
                      <ActionButton key={r} action={setUserRole.bind(null, u.id, r)} className={`rounded px-2 py-0.5 text-xs ${u.role === r ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>{r}</ActionButton>
                    ))}
                  </div>
                </td>
                <td className="p-3 text-right"><ActionButton action={toggleUserLock.bind(null, u.id)} confirmText={u.isLocked ? "Mở khóa tài khoản?" : "Khóa tài khoản này?"} className={`text-xs ${u.isLocked ? "text-emerald-600" : "text-red-600"}`}>{u.isLocked ? "Mở khóa" : "Khóa"}</ActionButton></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
