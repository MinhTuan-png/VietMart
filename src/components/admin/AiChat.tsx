"use client";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, Send, Wrench, Check, X, Loader2, Trash2, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";

type Pending = { id: string; name: string; input: unknown; description: string };
type Part =
  | { kind: "text"; text: string }
  | { kind: "tool"; id: string; name: string; write: boolean; ok?: boolean; preview?: string }
  | { kind: "pending"; actions: Pending[]; resolved?: Record<string, boolean> }
  | { kind: "error"; text: string };
type Item = { role: "user"; text: string } | { role: "assistant"; parts: Part[] };

const TOOL_LABEL: Record<string, string> = {
  get_dashboard_stats: "Xem số liệu tổng quan",
  get_sales_report: "Lập báo cáo bán hàng",
  search_products: "Tìm sản phẩm",
  get_product_detail: "Xem chi tiết sản phẩm",
  get_inventory_alerts: "Phân tích tồn kho & dự báo",
  list_orders: "Tra cứu đơn hàng",
  get_order_detail: "Xem chi tiết đơn",
  list_coupons: "Xem mã giảm giá",
  get_review_insights: "Phân tích đánh giá",
  list_categories: "Xem danh mục",
  update_stock: "Cập nhật kho",
  update_product: "Cập nhật sản phẩm",
  update_order_status: "Cập nhật đơn hàng",
  create_coupon: "Tạo mã giảm giá",
  toggle_coupon: "Bật/tắt mã giảm giá",
};

const SUGGESTIONS = [
  "Sản phẩm nào sắp hết hàng? Đề xuất số lượng cần nhập",
  "Báo cáo doanh thu 7 ngày qua so với tuần trước",
  "Top 5 sản phẩm bán chạy tháng này và tồn kho của chúng",
  "Có bao nhiêu đơn đang chờ xác nhận?",
  "Nhập thêm 50 cái cho tất cả sản phẩm đang hết hàng",
  "Tạo mã giảm 20% tối đa 100K cho đơn từ 500K, hiệu lực 7 ngày",
  "Những sản phẩm nào bị đánh giá thấp gần đây?",
];

const STORE = "vm_ai_chat_v1";

export default function AiChat({ compact = false }: { compact?: boolean }) {
  const [items, setItems] = useState<Item[]>([]);
  const [history, setHistory] = useState<unknown[]>([]);
  const [provider, setProvider] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const bottom = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(STORE) ?? "null");
      if (s) { setItems(s.items); setHistory(s.history); setProvider(s.provider ?? null); }
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem(STORE, JSON.stringify({ items, history, provider })); } catch {}
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [items, history, provider]);

  const patchLast = (fn: (parts: Part[]) => Part[]) =>
    setItems((its) => {
      const copy = [...its];
      const last = copy[copy.length - 1];
      if (last?.role === "assistant") copy[copy.length - 1] = { ...last, parts: fn(last.parts) };
      return copy;
    });

  async function call(body: object) {
    setBusy(true);
    setItems((its) => [...its, { role: "assistant", parts: [] }]);
    let wrote = false;
    try {
      const res = await fetch("/api/admin/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: history, provider, ...body }) });
      if (!res.ok || !res.body) throw new Error(res.status === 403 ? "Bạn không có quyền dùng trợ lý" : `Lỗi ${res.status}`);
      setProvider(res.headers.get("X-AI-Provider"));
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const e = JSON.parse(line);
          if (e.type === "text") patchLast((p) => [...p, { kind: "text", text: e.text }]);
          else if (e.type === "tool") patchLast((p) => [...p, { kind: "tool", id: e.id, name: e.name, write: e.write }]);
          else if (e.type === "tool_result") {
            if (e.ok && /^(update_|create_|toggle_)/.test(e.name)) wrote = true;
            patchLast((p) => {
              const idx = p.findIndex((x) => x.kind === "tool" && x.id === e.id);
              if (idx >= 0) return p.map((x, i) => (i === idx ? { ...(x as Extract<Part, { kind: "tool" }>), ok: e.ok, preview: e.preview } : x));
              return [...p, { kind: "tool", id: e.id, name: e.name, write: true, ok: e.ok, preview: e.preview }];
            });
          } else if (e.type === "pending") {
            setSelected(Object.fromEntries(e.actions.map((a: Pending) => [a.id, true])));
            patchLast((p) => [...p, { kind: "pending", actions: e.actions }]);
          } else if (e.type === "error") patchLast((p) => [...p, { kind: "error", text: e.message }]);
          else if (e.type === "done") setHistory(e.messages);
        }
      }
    } catch (err) {
      patchLast((p) => [...p, { kind: "error", text: (err as Error).message }]);
    } finally {
      setBusy(false);
      if (wrote) router.refresh();
    }
  }

  const send = (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    setInput("");
    // đánh dấu các thẻ chờ xác nhận cũ là đã bỏ qua
    setItems((its) => [...its.map((it) => (it.role === "assistant" ? { ...it, parts: it.parts.map((p) => (p.kind === "pending" && !p.resolved ? { ...p, resolved: {} } : p)) } : it)), { role: "user", text: t }]);
    call({ userText: t });
  };

  const decide = (approveSelected: boolean) => {
    const approvals: Record<string, boolean> = {};
    for (const it of items)
      if (it.role === "assistant")
        for (const p of it.parts) if (p.kind === "pending" && !p.resolved) for (const a of p.actions) approvals[a.id] = approveSelected && !!selected[a.id];
    setItems((its) =>
      its.map((it) =>
        it.role === "assistant" ? { ...it, parts: it.parts.map((p) => (p.kind === "pending" && !p.resolved ? { ...p, resolved: approvals } : p)) } : it,
      ),
    );
    call({ approvals });
  };

  const reset = () => { setItems([]); setHistory([]); setProvider(null); };

  return (
    <div className={`flex flex-col ${compact ? "h-full" : "h-[calc(100vh-140px)]"} overflow-hidden rounded-lg bg-white shadow-sm`}>
      <div className="flex items-center gap-2 border-b bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-white">
        <Bot size={20} /> <div className="flex-1"><div className="font-semibold">VietMart Copilot</div><div className="text-xs opacity-80">Trợ lý AI quản lý cửa hàng & kho</div></div>
        <button onClick={reset} title="Cuộc trò chuyện mới" className="rounded p-1 hover:bg-white/20"><Trash2 size={16} /></button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50 p-4">
        {!items.length && (
          <div className="space-y-3">
            <div className="rounded-lg bg-white p-4 text-sm text-gray-700 shadow-sm">
              Xin chào 👋 Mình là trợ lý AI của VietMart. Mình có thể <b>phân tích doanh thu</b>, <b>cảnh báo & dự báo tồn kho</b>, <b>nhập kho</b>, <b>sửa giá / ẩn sản phẩm</b>, <b>xử lý đơn hàng</b> và <b>tạo mã giảm giá</b>. Mọi thao tác thay đổi dữ liệu đều cần bạn xác nhận.
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.slice(0, compact ? 4 : 7).map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-left text-xs text-violet-700 hover:bg-violet-50">{s}</button>
              ))}
            </div>
          </div>
        )}
        {items.map((it, k) =>
          it.role === "user" ? (
            <div key={k} className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-br-sm bg-violet-600 px-4 py-2 text-sm text-white">{it.text}</div></div>
          ) : (
            <div key={k} className="space-y-2">
              {it.parts.map((p, j) =>
                p.kind === "text" ? (
                  <div key={j} className="prose-chat max-w-full overflow-x-auto rounded-2xl rounded-bl-sm bg-white px-4 py-3 text-sm shadow-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{p.text}</ReactMarkdown>
                  </div>
                ) : p.kind === "tool" ? (
                  <div key={j} className="flex items-center gap-2 text-xs text-gray-500">
                    {p.ok === undefined ? <Loader2 size={13} className="animate-spin" /> : p.ok ? <Check size={13} className="text-emerald-600" /> : <X size={13} className="text-red-500" />}
                    <Wrench size={12} /> {TOOL_LABEL[p.name] ?? p.name}
                    {p.ok === false && p.preview && <span className="text-red-500">– {p.preview}</span>}
                  </div>
                ) : p.kind === "pending" ? (
                  <div key={j} className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
                    <div className="mb-2 flex items-center gap-2 font-semibold text-amber-800"><ShieldAlert size={16} /> Cần bạn xác nhận {p.actions.length} thao tác</div>
                    <div className="space-y-1.5">
                      {p.actions.map((a) => (
                        <label key={a.id} className="flex items-start gap-2">
                          {p.resolved ? (
                            p.resolved[a.id] ? <Check size={16} className="mt-0.5 shrink-0 text-emerald-600" /> : <X size={16} className="mt-0.5 shrink-0 text-gray-400" />
                          ) : (
                            <input type="checkbox" checked={!!selected[a.id]} onChange={(e) => setSelected((s) => ({ ...s, [a.id]: e.target.checked }))} className="mt-1 accent-violet-600" />
                          )}
                          <span className={p.resolved && !p.resolved[a.id] ? "text-gray-400 line-through" : ""}>{a.description}</span>
                        </label>
                      ))}
                    </div>
                    {!p.resolved && (
                      <div className="mt-3 flex gap-2">
                        <button disabled={busy} onClick={() => decide(true)} className="btn bg-emerald-600 py-1.5 text-white hover:bg-emerald-700">Xác nhận{p.actions.length > 1 ? " mục đã chọn" : ""}</button>
                        <button disabled={busy} onClick={() => decide(false)} className="btn-ghost py-1.5">Từ chối</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div key={j} className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">⚠️ {p.text}</div>
                ),
              )}
              {busy && k === items.length - 1 && <div className="flex items-center gap-2 text-xs text-gray-400"><Loader2 size={13} className="animate-spin" /> Đang suy nghĩ...</div>}
            </div>
          ),
        )}
        <div ref={bottom} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2 border-t p-3">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Hỏi về doanh thu, tồn kho, đơn hàng... hoặc yêu cầu thao tác" className="input" disabled={busy} />
        <button disabled={busy || !input.trim()} className="btn bg-violet-600 text-white hover:bg-violet-700"><Send size={16} /></button>
      </form>
    </div>
  );
}
