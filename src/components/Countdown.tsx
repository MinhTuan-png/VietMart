"use client";
import { useEffect, useState } from "react";

/** Đếm ngược đến nửa đêm (flash sale theo ngày). */
export default function Countdown() {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(24, 0, 0, 0);
      setLeft(Math.floor((+end - +now) / 1000));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  if (left === null) return null;
  const parts = [Math.floor(left / 3600), Math.floor((left % 3600) / 60), left % 60].map((n) => String(n).padStart(2, "0"));
  return (
    <span className="flex items-center gap-1">
      {parts.map((p, k) => (
        <span key={k} className="rounded bg-gray-900 px-1.5 py-0.5 font-mono text-sm font-bold text-white">{p}</span>
      ))}
    </span>
  );
}
