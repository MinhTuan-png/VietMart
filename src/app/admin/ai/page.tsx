import AiChat from "@/components/admin/AiChat";
import { providerLabel } from "@/lib/ai/provider";

export const metadata = { title: "Trợ lý AI" };

export default function AiPage() {
  const label = providerLabel();
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
      <AiChat />
      <aside className="card h-fit space-y-3 p-5 text-sm">
        <div className="font-semibold">Trạng thái</div>
        <div className={label ? "text-emerald-600" : "text-amber-600"}>{label ? `● Đã kết nối ${label}` : "● Chế độ offline – chưa cấu hình API key"}</div>
        <div className="font-semibold">Trợ lý có thể</div>
        <ul className="list-disc space-y-1 pl-5 text-gray-600">
          <li>Báo cáo doanh thu, lợi nhuận, tăng trưởng</li>
          <li>Dự báo tồn kho, cảnh báo hết hàng, đề xuất nhập</li>
          <li>Nhập / điều chỉnh kho hàng loạt</li>
          <li>Sửa giá, ẩn/hiện, đặt nổi bật sản phẩm</li>
          <li>Xác nhận / hủy / cập nhật đơn hàng</li>
          <li>Tạo, bật/tắt mã giảm giá</li>
          <li>Phân tích đánh giá xấu của khách</li>
        </ul>
        <p className="text-xs text-gray-500">Mọi thao tác ghi đều cần bạn bấm Xác nhận và được lưu ở <b>Nhật ký hoạt động</b> (đánh dấu &quot;qua AI&quot;).</p>
      </aside>
    </div>
  );
}
