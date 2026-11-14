"use client";
import { useEffect } from "react";
import { trackView } from "@/app/actions/track";

let lastTracked: { id: number; at: number } | null = null;

/** Ghi lượt xem sau khi trang đã render (không ghi CSDL trong lúc render server). */
export default function TrackView({ productId }: { productId: number }) {
  useEffect(() => {
    // Strict Mode (dev) chạy effect 2 lần -> bỏ qua lần lặp trong 2 giây
    const now = Date.now();
    if (lastTracked && lastTracked.id === productId && now - lastTracked.at < 2000) return;
    lastTracked = { id: productId, at: now };
    trackView(productId).catch(() => {});
  }, [productId]);
  return null;
}
