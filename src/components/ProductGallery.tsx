"use client";
import { useState } from "react";
import ProductImage from "./ProductImage";

export default function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [i, setI] = useState(0);
  return (
    <div>
      <div className="aspect-square overflow-hidden rounded-lg border bg-white">
        <ProductImage src={images[i]} alt={name} className="h-full w-full p-4" />
      </div>
      {images.length > 1 && (
        <div className="scrollbar-none mt-2 flex gap-2 overflow-x-auto">
          {images.map((src, k) => (
            <button key={k} onMouseEnter={() => setI(k)} onClick={() => setI(k)} className={`h-16 w-16 shrink-0 overflow-hidden rounded border-2 ${k === i ? "border-brand-500" : "border-transparent"}`}>
              <ProductImage src={src} alt={`${name} ${k + 1}`} className="h-full w-full" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
