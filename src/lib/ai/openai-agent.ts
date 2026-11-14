/**
 * Vòng lặp agent cho các API tương thích OpenAI Chat Completions (Gemini, Groq, OpenRouter, Ollama...).
 * Cùng bộ công cụ & cơ chế xác nhận như bản Claude.
 */
import { TOOLS, TOOL_MAP, describeAction, type Actor } from "./tools";
import type { OpenAICompatConfig } from "./provider";
import { runToolCalls, systemPrompt, type AgentEvent, type ToolCall } from "./shared";

type Msg =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[] }
  | { role: "tool"; tool_call_id: string; content: string };

const MAX_STEPS = 5;

// Rút gọn mô tả công cụ để mỗi lượt hỏi tốn ít token (gói miễn phí như Groq chỉ cho ~8K token/phút).
const shortDesc = (d: string) => d.split(/(?<=\.)\s/).slice(0, 2).join(" ").slice(0, 180);
const slimSchema = (schema: unknown) => JSON.parse(JSON.stringify(schema, (k, v) => (k === "description" && typeof v === "string" ? undefined : v)));
const tools = () => TOOLS.map((t) => ({ type: "function" as const, function: { name: t.name, description: shortDesc(t.description), parameters: slimSchema(t.input_schema) } }));
const MAX_TOOL_CHARS = 2500;

const parseArgs = (s: string) => {
  try {
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function chat(cfg: OpenAICompatConfig, actor: Actor, messages: Msg[], retry = 0): Promise<{ content: string | null; tool_calls?: { id?: string; function: { name: string; arguments: string } }[] }> {
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({ model: cfg.model, messages: [{ role: "system", content: systemPrompt(actor) }, ...messages], tools: tools(), tool_choice: "auto", temperature: 0.2 }),
  });
  if (res.status === 429 && retry < 2) {
    // Hết hạn mức token/phút: chờ theo retry-after (tối đa 30s) rồi thử lại thay vì báo lỗi ngay.
    const wait = Math.min(Number(res.headers.get("retry-after")) || 8, 30);
    await sleep(wait * 1000);
    return chat(cfg, actor, messages, retry + 1);
  }
  if (!res.ok) {
    const txt = await res.text();
    if (res.status === 401 || res.status === 403) throw new Error(`${cfg.label}: API key không hợp lệ (${res.status})`);
    if (res.status === 429) throw new Error(`${cfg.label}: đã hết lượt miễn phí / bị giới hạn tần suất, thử lại sau ít phút`);
    throw new Error(`${cfg.label} lỗi ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message as { content: string | null; tool_calls?: { id?: string; function: { name: string; arguments: string } }[] };
}

export async function runOpenAIAgent(
  cfg: OpenAICompatConfig,
  input: { messages: Msg[]; userText?: string; approvals?: Record<string, boolean> },
  actor: Actor,
  emit: (e: AgentEvent) => void,
) {
  const messages: Msg[] = [...input.messages];
  const pendingCalls = (): ToolCall[] => {
    const last = messages[messages.length - 1];
    return last?.role === "assistant" && last.tool_calls?.length ? last.tool_calls.map((c) => ({ id: c.id, name: c.function.name, input: parseArgs(c.function.arguments) })) : [];
  };
  const pushResults = (results: { id: string; content: string }[]) => results.forEach((r) => messages.push({ role: "tool", tool_call_id: r.id, content: r.content.slice(0, MAX_TOOL_CHARS) }));

  if (input.userText) {
    const pend = pendingCalls();
    if (pend.length) pushResults(await runToolCalls(pend, {}, actor, emit));
    messages.push({ role: "user", content: input.userText });
  } else if (input.approvals) {
    const pend = pendingCalls();
    if (!pend.length) throw new Error("Không có thao tác nào đang chờ xác nhận");
    pushResults(await runToolCalls(pend, input.approvals, actor, emit));
  }

  for (let step = 0; step < MAX_STEPS; step++) {
    const m = await chat(cfg, actor, messages);
    const calls = (m.tool_calls ?? []).map((c, i) => ({ id: c.id || `call_${Date.now()}_${i}`, name: c.function.name, arguments: c.function.arguments || "{}" }));
    messages.push({ role: "assistant", content: m.content ?? null, ...(calls.length ? { tool_calls: calls.map((c) => ({ id: c.id, type: "function" as const, function: { name: c.name, arguments: c.arguments } })) } : {}) });
    if (m.content) emit({ type: "text", text: m.content });
    if (!calls.length) break;

    const parsed: ToolCall[] = calls.map((c) => ({ id: c.id, name: c.name, input: parseArgs(c.arguments) }));
    for (const c of parsed) emit({ type: "tool", id: c.id, name: c.name, input: c.input, write: !!TOOL_MAP.get(c.name)?.write });
    const writes = parsed.filter((c) => TOOL_MAP.get(c.name)?.write);
    if (writes.length) {
      emit({ type: "pending", actions: await Promise.all(writes.map(async (w) => ({ id: w.id, name: w.name, input: w.input, description: await describeAction(w.name, w.input) }))) });
      emit({ type: "done", messages });
      return;
    }
    pushResults(await runToolCalls(parsed, {}, actor, emit));
  }
  emit({ type: "done", messages });
}
