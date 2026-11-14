"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart, Minus, Plus, ShoppingCart } from "lucide-react";
import { addToCart, buyNow } from "@/app/actions/cart";
import { toggleWishlist } from "@/app/actions/account";
import { toast } from "./Toaster";

export default function BuyBox({ productId, stock, liked: initLiked, slug }: { productId: number; stock: number; liked: boolean; slug: string }) {
  const [qty, setQty] = useState(1);
  const [liked, setLiked] = useState(initLiked);
  const [pending, start] = useTransition();
  const router = useRouter();
  const needLogin = () => router.push(`/login?next=/p/${slug}`);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 text-sm">
        <span className="w-24 text-gray-500">Số lượng</span>
        <div className="flex items-center rounded border">
          <button className="px-3 py-1.5 hover:bg-gray-50" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Giảm"><Minus size={14} /></button>
          <input value={qty} onChange={(e) => setQty(Math.max(1, Math.min(stock, Number(e.target.value) || 1)))} className="w-12 border-x py-1.5 text-center outline-none" />
          <button className="px-3 py-1.5 hover:bg-gray-50" onClick={() => setQty((q) => Math.min(stock, q + 1))} aria-label="Tăng"><Plus size={14} /></button>
        </div>
        <span className={stock > 0 ? "text-gray-500" : "font-medium text-red-500"}>{stock > 0 ? `${stock} sản phẩm có sẵn` : "Hết hàng"}</span>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          disabled={pending || stock === 0}
          onClick={() =>
            start(async () => {
              const r = await addToCart(productId, qty);
              if (r.needLogin) return needLogin();
              toast(r.ok ? "Đã thêm vào giỏ hàng" : r.error!, r.ok ? "success" : "error");
              router.refresh();
            })
          }
          className="btn-outline px-6 py-3"
        >
          <ShoppingCart size={18} /> Thêm vào giỏ hàng
        </button>
        <button
          disabled={pending || stock === 0}
          onClick={() =>
            start(async () => {
              const r = await buyNow(productId, qty);
              if (r.needLogin) return needLogin();
              if (!r.ok) return toast(r.error!, "error");
              router.push("/checkout");
            })
          }
          className="btn-primary px-10 py-3"
        >
          Mua ngay
        </button>
        <button
          onClick={() =>
            start(async () => {
              const r = await toggleWishlist(productId);
              if (r.needLogin) return needLogin();
              setLiked(r.liked);
              toast(r.liked ? "Đã thêm vào yêu thích" : "Đã bỏ yêu thích", "info");
            })
          }
          className="btn-ghost px-3"
          aria-label="Yêu thích"
        >
          <Heart size={18} className={liked ? "fill-red-500 text-red-500" : ""} />
        </button>
      </div>
    </div>
  );
}
