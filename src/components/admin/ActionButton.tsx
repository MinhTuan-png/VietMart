"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "../Toaster";

export default function ActionButton({ action, children, className = "btn-ghost py-1 text-xs", confirmText, success }: { action: () => Promise<{ ok: boolean; error?: string }>; children: React.ReactNode; className?: string; confirmText?: string; success?: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      disabled={pending}
      className={className}
      onClick={() => {
        if (confirmText && !confirm(confirmText)) return;
        start(async () => {
          const r = await action();
          if (!r.ok) toast(r.error ?? "Lỗi", "error");
          else if (success) toast(success);
          router.refresh();
        });
      }}
    >
      {children}
    </button>
  );
}
