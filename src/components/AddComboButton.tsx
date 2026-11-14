"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToCart } from "@/app/actions/cart";
import { toast } from "./Toaster";

export default function AddComboButton({ ids }: { ids: number[] }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          for (const id of ids) {
            const r = await addToCart(id, 1);
            if (r.needLogin) return router.push("/login");
            if (!r.ok) return toast(r.error!, "error");
          }
          toast(`Đã thêm ${ids.length} sản phẩm vào giỏ`);
          router.refresh();
        })
      }
      className="btn-primary w-full"
    >
      Thêm tất cả vào giỏ
    </button>
  );
}
