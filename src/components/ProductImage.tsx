"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";

/** Ảnh sản phẩm có fallback khi không tải được (mất mạng / link hỏng). */
export default function ProductImage({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  const [err, setErr] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  // Ảnh có thể lỗi trước khi React hydrate (sự kiện onError bị bỏ lỡ) -> kiểm tra lại sau khi mount
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setErr(true);
  }, [src]);
  if (err || !src)
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-brand-50 to-orange-100 p-2 text-center ${className}`}>
        <span className="line-clamp-2 text-xs font-medium text-brand-700">{alt}</span>
      </div>
    );
  return <img ref={ref} src={src} alt={alt} loading="lazy" onError={() => setErr(true)} className={`object-contain ${className}`} />;
}
