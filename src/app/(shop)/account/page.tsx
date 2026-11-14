import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatVND } from "@/lib/utils";
import { ProfileForm, PasswordForm } from "@/components/ProfileForms";

export const metadata = { title: "Tài khoản" };

export default async function AccountPage() {
  const user = await requireUser("/account");
  const [orders, spent] = await Promise.all([
    prisma.order.count({ where: { userId: user.id } }),
    prisma.order.aggregate({ where: { userId: user.id, status: "DELIVERED" }, _sum: { total: true } }),
  ]);
  const total = spent._sum.total ?? 0;
  const tier = total >= 50_000_000 ? "Kim cương 💎" : total >= 15_000_000 ? "Vàng 🥇" : total >= 3_000_000 ? "Bạc 🥈" : "Thành viên";
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4"><div className="text-sm text-gray-500">Hạng thành viên</div><div className="text-lg font-semibold">{tier}</div></div>
        <div className="card p-4"><div className="text-sm text-gray-500">Tổng đơn hàng</div><div className="text-lg font-semibold">{orders}</div></div>
        <div className="card p-4"><div className="text-sm text-gray-500">Đã chi tiêu</div><div className="text-lg font-semibold text-brand-600">{formatVND(total)}</div></div>
      </div>
      <div className="card p-6">
        <h1 className="mb-1 text-lg font-semibold">Hồ sơ của tôi</h1>
        <p className="mb-4 border-b pb-4 text-sm text-gray-500">Quản lý thông tin hồ sơ để bảo mật tài khoản</p>
        <ProfileForm name={user.name} phone={user.phone} email={user.email} />
      </div>
      <div className="card p-6">
        <h2 className="mb-4 text-lg font-semibold">Đổi mật khẩu</h2>
        <PasswordForm />
      </div>
    </div>
  );
}
