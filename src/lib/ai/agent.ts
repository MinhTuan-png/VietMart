/**
 * Vòng lặp agent (manual agentic loop) cho Trợ lý AI quản trị.
 * - Claude API (Anthropic SDK) khi có ANTHROPIC_API_KEY
 * - API tương thích OpenAI (Gemini/Groq/OpenRouter/Ollama – có gói miễn phí) xem openai-agent.ts
 * - Chế độ offline khi không có key nào.
 * Kết quả được stream về client dạng NDJSON để hiển thị từng bước.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { BetaContentBlock, BetaMessageParam, BetaToolResultBlockParam, BetaToolUseBlock } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { anthropicTools, describeAction, TOOL_MAP, type Actor } from "./tools";
import { offlineAnswer } from "./offline";
import { activeProvider, openAICompatConfig } from "./provider";
import { runOpenAIAgent } from "./openai-agent";
import { runToolCalls, systemPrompt, type AgentEvent } from "./shared";

export type { AgentEvent } from "./shared";

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
const MAX_STEPS = 12;

const textOf = (content: BetaContentBlock[]) => content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("\n");

async function runTools(blocks: BetaToolUseBlock[], approvals: Record<string, boolean>, actor: Actor, emit: (e: AgentEvent) => void): Promise<BetaToolResultBlockParam[]> {
  const results = await runToolCalls(blocks.map((b) => ({ id: b.id, name: b.name, input: b.input })), approvals, actor, emit);
  return results.map((r) => ({ type: "tool_result", tool_use_id: r.id, content: r.content, ...(r.ok ? {} : { is_error: true }) }));
}

export async function runAgent(
  input: { messages: unknown[]; userText?: string; approvals?: Record<string, boolean> },
  actor: Actor,
  emit: (e: AgentEvent) => void,
) {
  const provider = activeProvider();

  if (provider === "offline") {
    const messages = [...input.messages];
    if (input.userText) {
      messages.push({ role: "user", content: input.userText });
      const answer = await offlineAnswer(input.userText, actor);
      emit({ type: "text", text: answer });
      messages.push({ role: "assistant", content: answer });
    }
    emit({ type: "done", messages });
    return;
  }

  if (provider !== "anthropic") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return runOpenAIAgent(openAICompatConfig(provider), input as any, actor, emit);
  }

  const messages = [...input.messages] as BetaMessageParam[];
  const client = new Anthropic();

  if (input.userText) {
    // Nếu còn thao tác chờ xác nhận mà admin gõ câu mới -> coi như từ chối các thao tác đó
    const last = messages[messages.length - 1];
    const pendingUses = last?.role === "assistant" && Array.isArray(last.content) ? (last.content as BetaContentBlock[]).filter((b): b is BetaToolUseBlock => b.type === "tool_use") : [];
    if (pendingUses.length) messages.push({ role: "user", content: [...(await runTools(pendingUses, {}, actor, emit)), { type: "text", text: input.userText }] });
    else messages.push({ role: "user", content: input.userText });
  } else if (input.approvals) {
    // Tiếp tục sau khi admin xác nhận/từ chối các thao tác ghi đang chờ
    const last = messages[messages.length - 1];
    if (last?.role !== "assistant" || typeof last.content === "string") throw new Error("Không có thao tác nào đang chờ xác nhận");
    const uses = (last.content as BetaContentBlock[]).filter((b): b is BetaToolUseBlock => b.type === "tool_use");
    messages.push({ role: "user", content: await runTools(uses, input.approvals, actor, emit) });
  }

  for (let step = 0; step < MAX_STEPS; step++) {
    const res = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: systemPrompt(actor),
      tools: anthropicTools(),
      messages,
      output_config: { effort: "medium" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    // Giữ nguyên toàn bộ content (kể cả thinking blocks) khi gửi lại lịch sử
    messages.push({ role: "assistant", content: res.content });
    const text = textOf(res.content);
    if (text) emit({ type: "text", text });

    if (res.stop_reason === "refusal") {
      emit({ type: "text", text: "_Yêu cầu này không thể xử lý. Vui lòng diễn đạt lại._" });
      break;
    }
    if (res.stop_reason === "pause_turn") continue;
    if (res.stop_reason !== "tool_use") break;

    const uses = res.content.filter((b): b is BetaToolUseBlock => b.type === "tool_use");
    for (const u of uses) emit({ type: "tool", id: u.id, name: u.name, input: u.input, write: !!TOOL_MAP.get(u.name)?.write });

    const writes = uses.filter((u) => TOOL_MAP.get(u.name)?.write);
    if (writes.length) {
      // Dừng lại chờ admin xác nhận (human-in-the-loop)
      emit({ type: "pending", actions: await Promise.all(writes.map(async (w) => ({ id: w.id, name: w.name, input: w.input, description: await describeAction(w.name, w.input) }))) });
      emit({ type: "done", messages });
      return;
    }
    messages.push({ role: "user", content: await runTools(uses, {}, actor, emit) });
  }
  emit({ type: "done", messages });
}
