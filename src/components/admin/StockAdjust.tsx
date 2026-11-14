"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { stockMovement } from "@/app/actions/admin";
import { toast } from "../Toaster";

export default function StockAdjust({ productId, suggested }: { productId: number; suggested: number }) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(suggested || 10);
  const [type, setType] = useState<"IMPORT" | "ADJUST">("IMPORT");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  if (!open) return <button onClick={() => setOpen(true)} className="btn-outline py-1 text-xs">Nhập / Điều chỉnh</button>;
  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      <select value={type} onChange={(e) => setType(e.target.value as "IMPORT" | "ADJUST")} className="input w-auto px-1 py-1 text-xs">
        <option value="IMPORT">Nhập +</option><option value="ADJUST">Điều chỉnh ±</option>
      </select>
      <input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} className="input w-20 px-2 py-1 text-xs" />
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú" className="input w-28 px-2 py-1 text-xs" />
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await stockMovement(productId, type === "IMPORT" ? Math.abs(qty) : qty, type, note);
            toast(r.ok ? "Đã cập nhật kho" : r.error!, r.ok ? "success" : "error");
            if (r.ok) setOpen(false);
            router.refresh();
          })
        }
        className="btn-primary px-2 py-1 text-xs"
      >
        Lưu
      </button>
      <button onClick={() => setOpen(false)} className="px-1 text-xs text-gray-500">✕</button>
    </div>
  );
}
