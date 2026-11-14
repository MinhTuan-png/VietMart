import { prisma } from "@/lib/db";
import { formatDate, formatVND } from "@/lib/utils";
import { toggleCoupon } from "@/app/actions/admin";
import ActionButton from "@/components/admin/ActionButton";
import { CouponForm } from "@/components/admin/SimpleForms";

export const metadata = { title: "Mã giảm giá" };

export default async function Coupons() {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  const usage = await prisma.order.groupBy({ by: ["couponCode"], where: { couponCode: { not: null }, status: { not: "CANCELLED" } }, _sum: { discount: true } });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Mã giảm giá</h1>
      <div className="card p-5"><div className="mb-3 font-semibold">Tạo / cập nhật mã (nhập mã đã có để sửa)</div><CouponForm /></div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500"><tr><th className="p-3">Mã</th><th>Ưu đãi</th><th className="text-right">Đơn tối thiểu</th><th className="text-right">Đã dùng</th><th className="text-right">Tổng giảm</th><th className="pl-4">Hết hạn</th><th>Trạng thái</th><th /></tr></thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3 font-mono font-bold">{c.code}<div className="font-sans text-xs font-normal text-gray-500">{c.description}</div></td>
                <td>{c.type === "PERCENT" ? `${c.value}%${c.maxDiscount ? ` (tối đa ${formatVND(c.maxDiscount)})` : ""}` : c.type === "FIXED" ? formatVND(c.value) : "Miễn phí ship"}</td>
                <td className="text-right">{formatVND(c.minOrder)}</td>
                <td className="text-right">{c.usedCount}{c.usageLimit ? `/${c.usageLimit}` : ""}</td>
                <td className="text-right">{formatVND(usage.find((u) => u.couponCode === c.code)?._sum.discount ?? 0)}</td>
                <td className="pl-4 text-gray-500">{c.endsAt ? formatDate(c.endsAt, false) : "Không giới hạn"}</td>
                <td><span className={`rounded px-2 py-0.5 text-xs ${c.isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}>{c.isActive ? "Đang chạy" : "Tạm tắt"}</span></td>
                <td className="p-3"><ActionButton action={toggleCoupon.bind(null, c.id)}>{c.isActive ? "Tắt" : "Bật"}</ActionButton></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
