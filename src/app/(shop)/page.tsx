import Link from "next/link";
import { Zap, Sparkles, TrendingUp, Clock, Ticket, ShieldCheck, Truck, RotateCcw, CreditCard } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getCategoryTree, productCardSelect } from "@/lib/products";
import { bestSellers, personalized, recentlyViewed, trending } from "@/lib/recommend";
import { availableCoupons } from "@/lib/coupons";
import { formatVND } from "@/lib/utils";
import HomeBanner from "@/components/HomeBanner";
import Countdown from "@/components/Countdown";
import CopyCoupon from "@/components/CopyCoupon";
import ProductImage from "@/components/ProductImage";
import { ProductGrid, ProductRow, Section } from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  const [cats, flash, forYou, trend, recent, coupons, newest, catThumbs] = await Promise.all([
    getCategoryTree(),
    // Flash sale: sản phẩm giảm sâu nhất còn hàng
    prisma.product.findMany({ where: { isActive: true, stock: { gt: 0 }, comparePrice: { not: null } }, select: productCardSelect, take: 60 }),
    personalized(user?.id ?? null, 18),
    trending(12),
    recentlyViewed(user?.id ?? null, 12),
    availableCoupons(),
    prisma.product.findMany({ where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 12, select: productCardSelect }),
    prisma.category.findMany({ where: { parentId: { not: null } }, select: { slug: true, name: true, products: { take: 1, where: { isActive: true, NOT: { thumbnail: { endsWith: ".svg" } } }, orderBy: { sold: "desc" }, select: { thumbnail: true } } } }),
  ]);
  const flashItems = flash.sort((a, b) => b.price / b.comparePrice! - a.price / a.comparePrice!).reverse().slice(0, 12);
  const groupBest = await Promise.all(cats.slice(0, 4).map(async (c) => ({ c, items: await bestSellers(6, c.children.map((x) => x.id)) })));
  const thumb = (slug: string) => catThumbs.find((x) => x.slug === slug)?.products[0]?.thumbnail ?? "";
  const pickThumb = (t: string) => flash.find((p) => p.name.includes(t))?.thumbnail ?? flashItems[0]?.thumbnail ?? "";

  const slides = [
    { title: "Siêu Sale 11.11", sub: "Nhập SALE11 giảm 15% tối đa 500K cho đơn từ 2 triệu", cta: "Săn deal ngay", href: "/search?q=&sort=bestseller", bg: "bg-gradient-to-r from-brand-600 via-brand-500 to-sky-400", img: thumb("dien-thoai") },
    { title: "Laptop chính hãng", sub: "Trả góp 0% qua thẻ tín dụng · Giảm đến 1 triệu với mã TECH1TR", cta: "Khám phá", href: "/c/laptop", bg: "bg-gradient-to-r from-indigo-700 via-blue-600 to-sky-400", img: thumb("laptop") },
    { title: "Bách hóa tươi mỗi ngày", sub: "Giao nhanh 2h nội thành · Freeship đơn từ 500K", cta: "Đi chợ online", href: "/c/bach-hoa-online", bg: "bg-gradient-to-r from-emerald-700 via-emerald-500 to-lime-400", img: pickThumb("Táo") },
    { title: "Làm đẹp đón Tết", sub: "Nước hoa & mỹ phẩm chính hãng giảm đến 30%", cta: "Mua ngay", href: "/c/lam-dep-suc-khoe", bg: "bg-gradient-to-r from-pink-700 via-rose-500 to-orange-300", img: thumb("nuoc-hoa") },
  ];

  return (
    <div className="container-x space-y-4 py-4">
      <div className="grid gap-2 lg:grid-cols-3">
        <div className="lg:col-span-2"><HomeBanner slides={slides} /></div>
        <div className="hidden grid-rows-2 gap-2 lg:grid">
          <Link href="/c/dien-thoai" className="flex items-center justify-between rounded-lg bg-gradient-to-br from-gray-900 to-gray-700 p-5 text-white">
            <div><div className="text-sm opacity-80">iPhone · Samsung · Oppo</div><div className="text-xl font-bold">Điện thoại hot</div><div className="mt-1 text-xs text-amber-300">Giảm đến 25%</div></div>
            <ProductImage src={thumb("dien-thoai")} alt="Điện thoại" className="h-24 w-24" />
          </Link>
          <Link href="/c/nuoc-hoa" className="flex items-center justify-between rounded-lg bg-gradient-to-br from-fuchsia-700 to-pink-500 p-5 text-white">
            <div><div className="text-sm opacity-80">Chanel · Dior · Gucci</div><div className="text-xl font-bold">Nước hoa cao cấp</div><div className="mt-1 text-xs text-amber-200">Quà tặng kèm</div></div>
            <ProductImage src={thumb("nuoc-hoa")} alt="Nước hoa" className="h-24 w-24" />
          </Link>
        </div>
      </div>

      <div className="card grid grid-cols-2 gap-3 p-3 text-sm md:grid-cols-4">
        {[[ShieldCheck, "100% chính hãng"], [Truck, "Freeship đơn từ 500K"], [RotateCcw, "Đổi trả 30 ngày"], [CreditCard, "VNPAY · COD"]].map(([Icon, t], k) => {
          const I = Icon as typeof ShieldCheck;
          return (<div key={k} className="flex items-center gap-2 text-gray-700"><I className="text-brand-500" size={20} /> {t as string}</div>);
        })}
      </div>

      <Section title="Danh mục">
        <div className="grid grid-cols-4 gap-1 sm:grid-cols-6 lg:grid-cols-10">
          {cats.flatMap((c) => c.children).slice(0, 20).map((c) => (
            <Link key={c.id} href={`/c/${c.slug}`} className="flex flex-col items-center gap-1.5 rounded-md p-2 text-center hover:bg-brand-50">
              <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-gray-50">
                <ProductImage src={thumb(c.slug)} alt={c.name} className="h-12 w-12" />
              </span>
              <span className="line-clamp-2 text-xs text-gray-700">{c.name}</span>
            </Link>
          ))}
        </div>
      </Section>

      <Section title={<span className="flex items-center gap-3"><span className="flex items-center gap-1 text-brand-600"><Zap className="fill-brand-500" size={20} /> Flash Sale</span><Countdown /></span>} href="/search?sort=bestseller">
        <ProductRow items={flashItems} />
      </Section>

      {coupons.length > 0 && (
        <Section title={<span className="flex items-center gap-2"><Ticket size={18} className="text-brand-500" /> Mã giảm giá hôm nay</span>}>
          <div className="scrollbar-none flex gap-3 overflow-x-auto">
            {coupons.map((c) => (
              <div key={c.id} className="flex w-72 shrink-0 overflow-hidden rounded-lg border border-brand-200">
                <div className="flex w-20 shrink-0 flex-col items-center justify-center bg-brand-500 p-2 text-center text-white">
                  <span className="text-lg font-black">{c.type === "PERCENT" ? `${c.value}%` : c.type === "FREESHIP" ? "Free" : `${c.value / 1000}K`}</span>
                  <span className="text-[10px] uppercase">{c.type === "FREESHIP" ? "ship" : "giảm"}</span>
                </div>
                <div className="flex flex-1 flex-col justify-between gap-1 bg-brand-50/40 p-2.5">
                  <div className="font-mono text-sm font-bold text-gray-800">{c.code}</div>
                  <div className="line-clamp-2 text-xs text-gray-600">{c.description}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-500">Đơn từ {formatVND(c.minOrder)}</span>
                    <CopyCoupon code={c.code} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {recent.length > 0 && (
        <Section title={<span className="flex items-center gap-2"><Clock size={18} /> Sản phẩm bạn đã xem</span>}>
          <ProductRow items={recent} />
        </Section>
      )}

      <Section title={<span className="flex items-center gap-2"><TrendingUp size={18} className="text-rose-500" /> Xu hướng mua sắm</span>} href="/search?sort=bestseller">
        <ProductRow items={trend} />
      </Section>

      {groupBest.map(({ c, items }) => (
        <Section key={c.id} title={`${c.icon ?? ""} ${c.name}`} href={`/c/${c.slug}`}>
          <div className="mb-3 flex flex-wrap gap-2">
            {c.children.map((ch) => (
              <Link key={ch.id} href={`/c/${ch.slug}`} className="rounded-full border px-3 py-1 text-xs text-gray-600 hover:border-brand-400 hover:text-brand-600">{ch.name}</Link>
            ))}
          </div>
          <ProductGrid items={items} />
        </Section>
      ))}

      <Section title="Hàng mới về" href="/search?sort=newest">
        <ProductRow items={newest} />
      </Section>

      <section>
        <div className="sticky top-[118px] z-10 mb-3 border-b-4 border-brand-500 bg-white py-3 text-center text-base font-bold text-brand-600 uppercase shadow-sm">
          <span className="flex items-center justify-center gap-2"><Sparkles size={18} /> Gợi ý hôm nay {user ? "dành cho bạn" : ""}</span>
        </div>
        <ProductGrid items={forYou} />
        <div className="mt-4 text-center">
          <Link href="/search?sort=bestseller" className="btn-ghost px-16">Xem thêm</Link>
        </div>
      </section>
    </div>
  );
}
