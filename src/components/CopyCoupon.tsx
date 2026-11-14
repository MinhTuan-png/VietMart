"use client";
import { toast } from "./Toaster";

export default function CopyCoupon({ code }: { code: string }) {
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(code);
        toast(`Đã sao chép mã ${code}`);
      }}
      className="rounded bg-brand-500 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-600"
    >
      Sao chép
    </button>
  );
}
