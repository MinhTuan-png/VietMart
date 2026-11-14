/**
 * Chế độ dự phòng khi chưa cấu hình ANTHROPIC_API_KEY: nhận diện ý định bằng từ khóa
 * và trả lời bằng chính các hàm nghiệp vụ (chỉ đọc). Giúp demo đồ án khi không có mạng / API key.
 */
import { formatVND, ORDER_STATUS } from "../utils";
import { dashboardStats, findProducts, inventoryForecast, listOrders, topProducts } from "../admin-ops";
import type { Actor } from "./tools";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").toLowerCase();

export async function offlineAnswer(q: string, _actor: Actor): Promise<string> {
  void _actor;
  const t = norm(q);
  const note = "\n\n> ℹ️ Đang chạy **chế độ offline** (chưa cấu hình API key) – chỉ hỗ trợ tra cứu cơ bản. Thêm `GEMINI_API_KEY` (miễn phí) hoặc `ANTHROPIC_API_KEY` vào `.env` để dùng đầy đủ trợ lý AI.";
  const daysMatch = t.match(/(\d+)\s*ngay/);
  const days = daysMatch ? Number(daysMatch[1]) : t.includes("tuan") ? 7 : t.includes("hom nay") ? 1 : 30;

  if (/(het hang|sap het|can nhap|nhap hang|canh bao|ton kho thap|du bao)/.test(t)) {
    const list = await inventoryForecast({ onlyRisk: true, take: 15 });
    if (!list.length) return "✅ Hiện không có sản phẩm nào cần nhập thêm." + note;
    return `### ⚠️ ${list.length} sản phẩm cần chú ý tồn kho\n\n| Sản phẩm | Tồn | Bán/ngày | Còn ~ngày | Tình trạng | Gợi ý nhập |\n|---|---:|---:|---:|---|---:|\n${list.map((p) => `| ${p.name} | ${p.stock} | ${p.perDay} | ${p.daysLeft ?? "—"} | ${p.risk} | ${p.suggestedReorder} |`).join("\n")}` + note;
  }
  if (/(ban chay|top san pham)/.test(t)) {
    const top = await topProducts(days, 10);
    return `### 🔥 Top bán chạy ${days} ngày\n\n| # | Sản phẩm | Đã bán | Doanh thu | Tồn |\n|---|---|---:|---:|---:|\n${top.map((p, i) => `| ${i + 1} | ${p.name} | ${p.qty} | ${formatVND(p.revenue)} | ${p.stock} |`).join("\n")}` + note;
  }
  if (/(doanh thu|bao cao|thong ke|tong quan|loi nhuan)/.test(t)) {
    const s = await dashboardStats(days);
    return `### 📊 Tổng quan ${days} ngày\n\n- Doanh thu: **${formatVND(s.revenue)}**${s.revenueGrowth != null ? ` (${s.revenueGrowth > 0 ? "+" : ""}${s.revenueGrowth}% so với kỳ trước)` : ""}\n- Lợi nhuận ước tính: **${formatVND(s.estimatedProfit)}**\n- Đơn hàng: ${s.orders} (hủy ${s.cancelled}), giá trị TB ${formatVND(s.avgOrderValue)}\n- Khách hàng mới: ${s.newCustomers}\n- Sản phẩm hết hàng: ${s.outOfStock}, dưới ngưỡng: ${s.lowStockCount}\n\n**Theo ngành hàng:**\n${s.byCategory.map((c) => `- ${c.name}: ${formatVND(c.value)}`).join("\n")}` + note;
  }
  if (/don/.test(t)) {
    const status = t.includes("cho xac nhan") || t.includes("moi") ? "PENDING" : t.includes("dang giao") ? "SHIPPING" : t.includes("huy") ? "CANCELLED" : undefined;
    const r = await listOrders({ status, take: 10 });
    return `### 🧾 ${status ? ORDER_STATUS[status].label : "Đơn hàng gần đây"} (${r.total})\n\n| Mã | Khách | Trạng thái | Tổng |\n|---|---|---|---:|\n${r.items.map((o) => `| ${o.code} | ${o.fullName} | ${ORDER_STATUS[o.status].label} | ${formatVND(o.total)} |`).join("\n")}` + note;
  }
  const kw = q.replace(/(ton kho|tồn kho|còn bao nhiêu|con bao nhieu|của|cua|sản phẩm|san pham|\?)/gi, " ").trim();
  if (kw) {
    const list = await findProducts(kw, { take: 8 });
    if (list.length)
      return `### 📦 Kết quả cho "${kw}"\n\n| ID | Sản phẩm | SKU | Giá | Tồn | Đã bán |\n|---|---|---|---:|---:|---:|\n${list.map((p) => `| ${p.id} | ${p.name} | ${p.sku} | ${formatVND(p.price)} | ${p.stock} | ${p.sold} |`).join("\n")}` + note;
  }
  return "Mình có thể giúp: *báo cáo doanh thu 7 ngày*, *sản phẩm sắp hết hàng*, *top bán chạy*, *đơn chờ xác nhận*, hoặc gõ tên sản phẩm để xem tồn kho." + note;
}
