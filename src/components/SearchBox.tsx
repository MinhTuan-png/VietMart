"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { formatVND } from "@/lib/utils";

type S = { products: { name: string; slug: string; thumbnail: string; price: number }[]; categories: { name: string; slug: string }[] };
const HOT = ["iPhone", "Laptop", "Nước hoa", "Đồng hồ", "Giày Nike", "Gạo ST25", "Tai nghe", "Son môi"];

export default function SearchBox() {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<S | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setHistory(JSON.parse(localStorage.getItem("vm_search") ?? "[]"));
    } catch {}
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (!q.trim()) return setData(null);
    const t = setTimeout(async () => {
      const r = await fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`);
      setData(await r.json());
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const go = (term: string) => {
    const t = term.trim();
    if (!t) return;
    const h = [t, ...history.filter((x) => x !== t)].slice(0, 6);
    setHistory(h);
    try {
      localStorage.setItem("vm_search", JSON.stringify(h));
    } catch {}
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(t)}`);
  };

  return (
    <div ref={box} className="relative flex-1">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(q);
        }}
        className="flex rounded-md bg-white p-1 shadow-sm"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Tìm sản phẩm, thương hiệu, danh mục..."
          className="min-w-0 flex-1 px-3 text-sm text-gray-800 outline-none"
        />
        <button className="rounded bg-brand-500 px-4 py-2 text-white hover:bg-brand-600 sm:px-6" aria-label="Tìm kiếm">
          <Search size={18} />
        </button>
      </form>
      {open && (
        <div className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-md border bg-white text-gray-800 shadow-xl">
          {!q.trim() ? (
            <div className="p-3">
              {history.length > 0 && (
                <>
                  <div className="mb-2 text-xs font-semibold text-gray-500 uppercase">Tìm kiếm gần đây</div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {history.map((h) => (
                      <button key={h} onClick={() => go(h)} className="rounded-full bg-gray-100 px-3 py-1 text-xs hover:bg-gray-200">{h}</button>
                    ))}
                  </div>
                </>
              )}
              <div className="mb-2 text-xs font-semibold text-gray-500 uppercase">Từ khóa hot 🔥</div>
              <div className="flex flex-wrap gap-2">
                {HOT.map((h) => (
                  <button key={h} onClick={() => go(h)} className="rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-700 hover:bg-brand-100">{h}</button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <button onClick={() => go(q)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50">
                <Search size={14} className="text-gray-400" /> Tìm &quot;<b>{q}</b>&quot;
              </button>
              {data?.categories.map((c) => (
                <button key={c.slug} onClick={() => { setOpen(false); router.push(`/c/${c.slug}`); }} className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50">
                  Danh mục: <span className="text-brand-600">{c.name}</span>
                </button>
              ))}
              {data?.products.map((p) => (
                <button key={p.slug} onClick={() => { setOpen(false); router.push(`/p/${p.slug}`); }} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50">
                  <img src={p.thumbnail} alt="" className="h-9 w-9 rounded object-contain" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
                  <span className="line-clamp-1 flex-1 text-sm">{p.name}</span>
                  <span className="text-sm font-medium text-brand-600">{formatVND(p.price)}</span>
                </button>
              ))}
              {data && !data.products.length && !data.categories.length && <div className="px-3 py-3 text-sm text-gray-500">Không có gợi ý phù hợp</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
