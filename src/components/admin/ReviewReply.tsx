"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { moderateReview } from "@/app/actions/admin";

export default function ReviewReply({ id, reply }: { id: number; reply: string | null }) {
  const [v, setV] = useState(reply ?? "");
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  if (!open) return <button onClick={() => setOpen(true)} className="text-xs text-brand-600">{reply ? "Sửa phản hồi" : "Phản hồi"}</button>;
  return (
    <div className="mt-2 flex gap-2">
      <input value={v} onChange={(e) => setV(e.target.value)} className="input py-1 text-xs" placeholder="Cảm ơn bạn đã ủng hộ shop..." />
      <button disabled={pending} onClick={() => start(async () => { await moderateReview(id, { reply: v }); setOpen(false); router.refresh(); })} className="btn-primary py-1 text-xs">Gửi</button>
    </div>
  );
}
