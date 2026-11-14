import Link from "next/link";
import { Filter, Star } from "lucide-react";
import { searchProducts, type ProductFilter } from "@/lib/products";
import { ProductGrid } from "./ProductCard";

export type SP = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const many = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? v.split(",") : []);

export function parseFilter(sp: SP): ProductFilter {
  return {
    q: one(sp.q),
    brands: many(sp.brand),
    minPrice: Number(one(sp.min)) || undefined,
    maxPrice: Number(one(sp.max)) || undefined,
    rating: Number(one(sp.rating)) || undefined,
    inStock: one(sp.instock) === "1",
    sort: one(sp.sort),
    page: Number(one(sp.page)) || 1,
  };
}

const SORTS = [
  ["", "Phổ biến"],
  ["bestseller", "Bán chạy"],
  ["newest", "Mới nhất"],
  ["rating", "Đánh giá cao"],
  ["price_asc", "Giá thấp → cao"],
  ["price_desc", "Giá cao → thấp"],
];
const PRICE_RANGES: [number, number, string][] = [
  [0, 200_000, "Dưới 200K"],
  [200_000, 1_000_000, "200K - 1 triệu"],
  [1_000_000, 5_000_000, "1 - 5 triệu"],
  [5_000_000, 20_000_000, "5 - 20 triệu"],
  [20_000_000, 0, "Trên 20 triệu"],
];

export default async function Listing({ basePath, sp, categoryIds, title, extraTop }: { basePath: string; sp: SP; categoryIds?: number[]; title: React.ReactNode; extraTop?: React.ReactNode }) {
  const f = parseFilter(sp);
  const res = await searchProducts({ ...f, categoryIds });
  const href = (patch: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v != null && k !== "page") u.set(k, Array.isArray(v) ? v.join(",") : v);
    for (const [k, v] of Object.entries(patch)) {
      if (v) u.set(k, v);
      else u.delete(k);
    }
    return `${basePath}?${u.toString()}`;
  };
  const toggleBrand = (slug: string) => {
    const set = new Set(f.brands);
    if (set.has(slug)) set.delete(slug);
    else set.add(slug);
    return href({ brand: [...set].join(",") || undefined });
  };
  const hasFilter = !!(f.brands?.length || f.minPrice || f.maxPrice || f.rating || f.inStock);

  return (
    <div className="container-x grid gap-4 py-4 md:grid-cols-[220px_1fr]">
      <aside className="card h-fit space-y-5 p-4 text-sm">
        <div className="flex items-center gap-2 font-bold uppercase"><Filter size={16} /> Bộ lọc tìm kiếm</div>
        {extraTop}
        {res.brandFacets.length > 0 && (
          <div>
            <div className="mb-2 font-semibold">Thương hiệu</div>
            <div className="max-h-56 space-y-1.5 overflow-y-auto">
              {res.brandFacets.map((b) => (
                <Link key={b.slug} href={toggleBrand(b.slug)} className="flex items-center gap-2 hover:text-brand-600">
                  <span className={`h-4 w-4 rounded border ${f.brands?.includes(b.slug) ? "border-brand-500 bg-brand-500" : "border-gray-300"}`} />
                  {b.name}
                </Link>
              ))}
            </div>
          </div>
        )}
        <div>
          <div className="mb-2 font-semibold">Khoảng giá</div>
          <div className="space-y-1.5">
            {PRICE_RANGES.map(([a, b, label]) => {
              const active = (f.minPrice ?? 0) === a && (f.maxPrice ?? 0) === b;
              return (
                <Link key={label} href={href(active ? { min: undefined, max: undefined } : { min: a ? String(a) : undefined, max: b ? String(b) : undefined })} className={`block rounded px-2 py-1 ${active ? "bg-brand-50 font-medium text-brand-600" : "hover:bg-gray-50"}`}>
                  {label}
                </Link>
              );
            })}
          </div>
          <form action={basePath} className="mt-2 flex items-center gap-1">
            {Object.entries(sp).filter(([k]) => !["min", "max", "page"].includes(k)).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={Array.isArray(v) ? v.join(",") : v} />
            ))}
            <input name="min" type="number" placeholder="₫ TỪ" defaultValue={f.minPrice} className="input px-2 py-1 text-xs" />
            <span>-</span>
            <input name="max" type="number" placeholder="₫ ĐẾN" defaultValue={f.maxPrice} className="input px-2 py-1 text-xs" />
            <button className="btn-primary px-2 py-1 text-xs">OK</button>
          </form>
        </div>
        <div>
          <div className="mb-2 font-semibold">Đánh giá</div>
          {[5, 4, 3].map((r) => (
            <Link key={r} href={href({ rating: f.rating === r ? undefined : String(r) })} className={`flex items-center gap-1 rounded px-2 py-1 ${f.rating === r ? "bg-brand-50" : "hover:bg-gray-50"}`}>
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} size={13} className={i < r ? "fill-amber-400 text-amber-400" : "text-gray-300"} />
              ))}
              {r < 5 && <span className="text-xs">trở lên</span>}
            </Link>
          ))}
        </div>
        <Link href={href({ instock: f.inStock ? undefined : "1" })} className="flex items-center gap-2">
          <span className={`h-4 w-4 rounded border ${f.inStock ? "border-brand-500 bg-brand-500" : "border-gray-300"}`} /> Chỉ hiện hàng còn
        </Link>
        {hasFilter && (
          <Link href={`${basePath}${f.q ? `?q=${encodeURIComponent(f.q)}` : ""}`} className="btn-primary w-full">Xóa tất cả</Link>
        )}
      </aside>

      <div className="space-y-3">
        <div className="card p-3">
          <div className="mb-2 text-lg font-semibold">{title}</div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-gray-500">Sắp xếp theo</span>
            {SORTS.map(([v, label]) => (
              <Link key={v} href={href({ sort: v || undefined })} className={`rounded px-3 py-1.5 ${(f.sort ?? "") === v ? "bg-brand-500 text-white" : "bg-gray-100 hover:bg-gray-200"}`}>
                {label}
              </Link>
            ))}
            <span className="ml-auto text-gray-500">{res.total} sản phẩm</span>
          </div>
        </div>
        {res.items.length ? (
          <ProductGrid items={res.items} cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" />
        ) : (
          <div className="card p-10 text-center text-gray-500">
            <div className="mb-2 text-4xl">🔍</div>Không tìm thấy sản phẩm phù hợp. Hãy thử từ khóa hoặc bộ lọc khác.
          </div>
        )}
        {res.pageCount > 1 && (
          <div className="flex justify-center gap-1">
            {Array.from({ length: res.pageCount }, (_, i) => i + 1).map((n) => (
              <Link key={n} href={`${href({})}&page=${n}`} className={`min-w-9 rounded px-3 py-1.5 text-center text-sm ${n === res.page ? "bg-brand-500 text-white" : "bg-white hover:bg-gray-100"}`}>{n}</Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
