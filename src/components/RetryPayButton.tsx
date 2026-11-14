"use client";
import { useTransition } from "react";
import { retryPayment } from "@/app/actions/checkout";
import { toast } from "./Toaster";

export default function RetryPayButton({ code, label = "Thanh toán lại" }: { code: string; label?: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await retryPayment(code);
          if (!r.ok) return toast(r.error, "error");
          window.location.href = r.redirect;
        })
      }
      className="btn-primary"
    >
      {pending ? "Đang chuyển..." : label}
    </button>
  );
}
