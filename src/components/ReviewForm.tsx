"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { submitReview } from "@/app/actions/account";
import { toast } from "./Toaster";

export default function ReviewForm({ productId, existing }: { productId: number; existing?: { rating: number; comment: string } }) {
  const [rating, setRating] = useState(existing?.rating ?? 5);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="rounded-lg border border-brand-200 bg-brand-50/40 p-4">
      <div className="mb-2 text-sm font-semibold">{existing ? "Sửa đánh giá của bạn" : "Viết đánh giá"}</div>
      <div className="mb-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} onClick={() => setRating(i)} aria-label={`${i} sao`}>
            <Star size={24} className={i <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"} />
          </button>
        ))}
      </div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Chia sẻ cảm nhận về sản phẩm..." className="input mb-2" />
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await submitReview(productId, rating, comment);
            toast(r.ok ? "Cảm ơn bạn đã đánh giá!" : r.error!, r.ok ? "success" : "error");
            if (r.ok) router.refresh();
          })
        }
        className="btn-primary"
      >
        Gửi đánh giá
      </button>
    </div>
  );
}
