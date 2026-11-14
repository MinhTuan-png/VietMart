import Link from "next/link";
import type { ProductCardData } from "@/lib/products";
import { compactNumber, discountPercent, formatVND } from "@/lib/utils";
import ProductImage from "./ProductImage";
import Stars from "./Stars";

export default function ProductCard({ p }: { p: ProductCardData }) {
  const off = discountPercent(p.price, p.comparePrice);
  return (
    <Link
      href={`/p/${p.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-transparent bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-md"
    >
      <div className="relative aspect-square bg-white">
        <ProductImage src={p.thumbnail} alt={p.name} className="h-full w-full p-2 transition group-hover:scale-105" />
        {off > 0 && (
          <span className="absolute top-2 right-2 rounded bg-brand-500 px-1.5 py-0.5 text-[11px] font-bold text-white">-{off}%</span>
        )}
        {p.stock === 0 && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/60">
            <span className="rounded-full bg-gray-800/80 px-3 py-1 text-xs font-semibold text-white">Hết hàng</span>
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-[13px] leading-5 text-gray-800">{p.name}</h3>
        <div className="mt-auto">
          <div className="text-base font-semibold text-brand-600">{formatVND(p.price)}</div>
          {off > 0 && <div className="text-xs text-gray-400 line-through">{formatVND(p.comparePrice!)}</div>}
          <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
            <span className="flex items-center gap-1">
              <Stars value={p.rating} size={10} />
              {p.ratingCount > 0 && <span>({p.ratingCount})</span>}
            </span>
            <span>Đã bán {compactNumber(p.sold)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function ProductGrid({ items, cols = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6" }: { items: ProductCardData[]; cols?: string }) {
  return (
    <div className={`grid gap-2.5 ${cols}`}>
      {items.map((p) => (
        <ProductCard key={p.id} p={p} />
      ))}
    </div>
  );
}

export function ProductRow({ items }: { items: ProductCardData[] }) {
  return (
    <div className="scrollbar-none -mx-1 flex snap-x gap-2.5 overflow-x-auto px-1 pb-1">
      {items.map((p) => (
        <div key={p.id} className="w-[46%] shrink-0 snap-start sm:w-[31%] md:w-[23%] lg:w-[15.8%]">
          <ProductCard p={p} />
        </div>
      ))}
    </div>
  );
}

export function Section({ title, href, children, accent }: { title: React.ReactNode; href?: string; children: React.ReactNode; accent?: string }) {
  return (
    <section className="card p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className={`text-base font-bold uppercase sm:text-lg ${accent ?? "text-gray-800"}`}>{title}</h2>
        {href && (
          <Link href={href} className="text-sm text-brand-600 hover:underline">
            Xem tất cả ›
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
