"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelMyOrder } from "@/app/actions/account";
import { toast } from "./Toaster";

const REASONS = ["Muốn thay đổi địa chỉ giao hàng", "Muốn nhập/thay đổi mã giảm giá", "Muốn thay đổi sản phẩm", "Tìm thấy giá rẻ hơn ở chỗ khác", "Đổi ý, không muốn mua nữa"];

export default function CancelOrderButton({ orderId }: { orderId: number }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [pending, start] = useTransition();
  const router = useRouter();
  if (!open) return <button onClick={() => setOpen(true)} className="btn-ghost">Hủy đơn hàng</button>;
  return (
    <div className="w-full space-y-2 rounded-md border p-3">
      <div className="text-sm font-medium">Lý do hủy</div>
      {REASONS.map((r) => (
        <label key={r} className="flex items-center gap-2 text-sm"><input type="radio" checked={reason === r} onChange={() => setReason(r)} className="accent-brand-500" /> {r}</label>
      ))}
      <div className="flex gap-2">
        <button onClick={() => setOpen(false)} className="btn-ghost">Không phải bây giờ</button>
        <button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await cancelMyOrder(orderId, reason);
              toast(r.ok ? "Đã hủy đơn hàng" : r.error!, r.ok ? "success" : "error");
              router.refresh();
            })
          }
          className="btn-primary"
        >
          Xác nhận hủy
        </button>
      </div>
    </div>
  );
}
