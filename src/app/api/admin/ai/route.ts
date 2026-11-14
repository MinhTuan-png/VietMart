import { type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUser } from "@/lib/auth";
import { runAgent, type AgentEvent } from "@/lib/ai/agent";
import { activeProvider } from "@/lib/ai/provider";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser("admin");
  if (!user || (user.role !== "ADMIN" && user.role !== "STAFF")) return new Response("Forbidden", { status: 403 });
  const body = await req.json();
  const provider = activeProvider();
  // Lịch sử hội thoại phụ thuộc định dạng của từng nhà cung cấp -> đổi provider thì bắt đầu hội thoại mới
  const history = Array.isArray(body.messages) && (!body.provider || body.provider === provider) ? body.messages : [];
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: AgentEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      try {
        await runAgent({ messages: history, userText: body.userText, approvals: body.approvals }, { id: user.id, email: user.email, role: user.role }, emit);
      } catch (e) {
        let message = (e as Error).message;
        if (e instanceof Anthropic.AuthenticationError) message = "API key không hợp lệ. Kiểm tra ANTHROPIC_API_KEY trong .env";
        else if (e instanceof Anthropic.RateLimitError) message = "Đang bị giới hạn tần suất gọi API, vui lòng thử lại sau ít phút";
        else if (e instanceof Anthropic.APIConnectionError) message = "Không kết nối được tới Claude API";
        else if (e instanceof Anthropic.APIError) message = `Lỗi Claude API (${e.status}): ${e.message}`;
        emit({ type: "error", message });
        emit({ type: "done", messages: history });
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-AI-Provider": provider } });
}
