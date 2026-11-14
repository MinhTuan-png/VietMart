"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useState } from "react";

type Slide = { title: string; sub: string; cta: string; href: string; bg: string; img: string };

export default function HomeBanner({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 4500);
    return () => clearInterval(t);
  }, [slides.length]);
  return (
    <div className="relative h-48 overflow-hidden rounded-lg sm:h-64 lg:h-72">
      {slides.map((s, k) => (
        <Link
          key={k}
          href={s.href}
          className={`absolute inset-0 flex items-center justify-between px-6 transition-opacity duration-700 sm:px-12 ${s.bg} ${k === i ? "opacity-100" : "pointer-events-none opacity-0"}`}
        >
          <div className="max-w-[60%] text-white">
            <div className="mb-1 text-xs font-semibold tracking-widest uppercase opacity-90">VietMart Deals</div>
            <h2 className="text-xl font-extrabold sm:text-3xl lg:text-4xl">{s.title}</h2>
            <p className="mt-2 text-sm opacity-90 sm:text-base">{s.sub}</p>
            <span className="mt-4 inline-block rounded-full bg-white px-5 py-2 text-sm font-semibold text-gray-900">{s.cta}</span>
          </div>
          <img src={s.img} alt="" className="h-36 w-36 object-contain drop-shadow-2xl sm:h-56 sm:w-56" onError={(e) => (e.currentTarget.style.display = "none")} />
        </Link>
      ))}
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
        {slides.map((_, k) => (
          <button key={k} onClick={() => setI(k)} aria-label={`Slide ${k + 1}`} className={`h-2 rounded-full transition-all ${k === i ? "w-6 bg-white" : "w-2 bg-white/50"}`} />
        ))}
      </div>
    </div>
  );
}
