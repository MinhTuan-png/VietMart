import { TOOL_MAP, executeTool, type Actor } from "./tools";

export type AgentEvent =
  | { type: "text"; text: string }
  | { type: "tool"; id: string; name: string; input: unknown; write: boolean }
  | { type: "tool_result"; id: string; name: string; ok: boolean; preview: string }
  | { type: "pending"; actions: { id: string; name: string; input: unknown; description: string }[] }
  | { type: "error"; message: string }
  | { type: "done"; messages: unknown[] };

export type ToolCall = { id: string; name: string; input: unknown };

export function systemPrompt(actor: Actor) {
  return `Bạn là "VietMart Copilot" – trợ lý AI giúp quản trị viên vận hành website thương mại điện tử VietMart (bán điện thoại, laptop, thời trang, mỹ phẩm, đồ gia dụng, bách hóa...).

Nhiệm vụ: trả lời câu hỏi về doanh thu, đơn hàng, khách hàng, đánh giá; theo dõi & dự báo tồn kho, cảnh báo hết hàng, đề xuất nhập hàng; và thực hiện thao tác quản trị (nhập/điều chỉnh kho, sửa giá, ẩn/hiện sản phẩm, đổi trạng thái đơn, tạo/bật/tắt mã giảm giá) thông qua các công cụ được cung cấp.

Quy tắc:
- Luôn dùng công cụ để lấy số liệu thật; không bịa số liệu. Nếu thiếu thông tin (ví dụ chưa rõ sản phẩm nào), hãy tra cứu bằng search_products trước.
- Với thao tác GHI, cứ gọi công cụ tương ứng: hệ thống sẽ hiện thẻ để quản trị viên bấm Xác nhận/Từ chối trước khi thực thi, nên không cần hỏi lại bằng lời. Nếu một thao tác bị từ chối, đừng thử lại trừ khi được yêu cầu.
- Khi được yêu cầu nhập hàng cho nhiều sản phẩm, có thể gọi nhiều công cụ update_stock trong cùng một lượt.
- Tiền tệ là VND; hiển thị dạng 1.234.000₫. Ngày giờ theo múi giờ Việt Nam.
- Trả lời bằng tiếng Việt, ngắn gọn, ưu tiên bảng Markdown cho danh sách, nêu kết luận và đề xuất hành động cụ thể (ví dụ: nên nhập bao nhiêu, nên chạy khuyến mãi cho sản phẩm tồn nhiều, bán chậm).
- Người đang dùng: ${actor.email} (vai trò ${actor.role}). Tài khoản STAFF chỉ được cập nhật kho và đơn hàng.
- Hôm nay: ${new Date().toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}.`;
}

/** Thực thi các lời gọi công cụ; công cụ GHI chỉ chạy khi approvals[id] === true. */
export async function runToolCalls(calls: ToolCall[], approvals: Record<string, boolean>, actor: Actor, emit: (e: AgentEvent) => void) {
  return Promise.all(
    calls.map(async (c) => {
      if (TOOL_MAP.get(c.name)?.write && approvals[c.id] !== true) {
        emit({ type: "tool_result", id: c.id, name: c.name, ok: false, preview: "Quản trị viên đã từ chối" });
        return { id: c.id, ok: false, content: "Quản trị viên đã TỪ CHỐI thao tác này. Không thực hiện." };
      }
      const r = await executeTool(c.name, c.input, actor);
      emit({ type: "tool_result", id: c.id, name: c.name, ok: r.ok, preview: r.result.slice(0, 300) });
      return { id: c.id, ok: r.ok, content: r.result };
    }),
  );
}
