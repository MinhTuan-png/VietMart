"use client";
import { useEffect, useState } from "react";

type T = { id: number; msg: string; type: "success" | "error" | "info" };

export function toast(msg: string, type: T["type"] = "success") {
  window.dispatchEvent(new CustomEvent("vm-toast", { detail: { msg, type } }));
}

export default function Toaster() {
  const [items, setItems] = useState<T[]>([]);
  useEffect(() => {
    const h = (e: Event) => {
      const d = (e as CustomEvent).detail;
      const id = Date.now() + Math.random();
      setItems((s) => [...s, { id, ...d }]);
      setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 3000);
    };
    window.addEventListener("vm-toast", h);
    return () => window.removeEventListener("vm-toast", h);
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-[100] flex flex-col items-center gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto rounded-lg px-5 py-3 text-sm font-medium text-white shadow-lg ${
            t.type === "error" ? "bg-red-600" : t.type === "info" ? "bg-gray-800" : "bg-emerald-600"
          }`}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}
