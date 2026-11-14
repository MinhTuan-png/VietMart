import { ClipboardList, CheckCircle, Truck, PackageCheck, XCircle, Undo2 } from "lucide-react";
import { formatDate, ORDER_STATUS } from "@/lib/utils";

const STEPS = [
  ["PENDING", "Đơn hàng đã đặt", ClipboardList],
  ["CONFIRMED", "Đã xác nhận", CheckCircle],
  ["SHIPPING", "Đang vận chuyển", Truck],
  ["DELIVERED", "Đã giao hàng", PackageCheck],
] as const;

export default function OrderTimeline({ status, history }: { status: string; history: { id: number; status: string; note: string | null; createdAt: Date }[] }) {
  const idx = STEPS.findIndex((s) => s[0] === status);
  const terminal = status === "CANCELLED" || status === "RETURNED";
  return (
    <div className="space-y-6">
      {!terminal ? (
        <div className="relative flex justify-between">
          <div className="absolute top-6 right-[12%] left-[12%] h-1 bg-gray-200" />
          <div className="absolute top-6 left-[12%] h-1 bg-emerald-500 transition-all" style={{ width: `${(Math.max(0, idx) / 3) * 76}%` }} />
          {STEPS.map(([s, label, Icon], k) => {
            const done = k <= idx;
            const h = history.find((x) => x.status === s);
            return (
              <div key={s} className="relative z-10 flex w-1/4 flex-col items-center text-center">
                <span className={`flex h-12 w-12 items-center justify-center rounded-full border-4 bg-white ${done ? "border-emerald-500 text-emerald-500" : "border-gray-200 text-gray-300"}`}><Icon size={20} /></span>
                <span className="mt-2 text-xs font-medium sm:text-sm">{label}</span>
                {h && <span className="text-[11px] text-gray-400">{formatDate(h.createdAt)}</span>}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-md bg-gray-50 p-4">
          {status === "CANCELLED" ? <XCircle className="text-gray-500" /> : <Undo2 className="text-rose-500" />}
          <span className="font-medium">{ORDER_STATUS[status].label}</span>
        </div>
      )}
      <ol className="relative ml-2 border-l border-gray-200 text-sm">
        {[...history].reverse().map((h, k) => (
          <li key={h.id} className="mb-4 ml-4">
            <span className={`absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full ${k === 0 ? "bg-emerald-500" : "bg-gray-300"}`} />
            <div className={k === 0 ? "font-medium text-emerald-700" : "text-gray-600"}>{h.note ?? ORDER_STATUS[h.status]?.label}</div>
            <div className="text-xs text-gray-400">{formatDate(h.createdAt)}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}
