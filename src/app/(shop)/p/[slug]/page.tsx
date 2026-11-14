import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck, Truck, RotateCcw, Ticket } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { boughtTogether, similarProducts } from "@/lib/recommend";
import { availableCoupons } from "@/lib/coupons";
import { compactNumber, discountPercent, formatDate, formatVND, parseJSON } from "@/lib/utils";
import ProductGallery from "@/components/ProductGallery";
import BuyBox from "@/components/BuyBox";
import Stars from "@/components/Stars";
import ReviewForm from "@/components/ReviewForm";
import AddComboButton from "@/components/AddComboButton";
import ProductImage from "@/components/ProductImage";
import { ProductRow, Section } from "@/components/ProductCard";
import TrackView from "@/components/TrackView";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = await prisma.product.findUnique({ where: { slug: (await params).slug }, select: { name: true, shortDesc: true, thumbnail: true } });
  return p ? { title: p.name, description: p.shortDesc, openGraph: { images: [p.thumbnail] } } : {};
}

export default async function ProductPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ star?: string }> }) {
  const { slug } = await params;
  const { star } = await searchParams;
  const p = await prisma.product.findUnique({ where: { slug }, include: { category: { include: { parent: true } }, brand: true } });
  if (!p || !p.isActive) notFound();
  const user = await getCurrentUser();

  const starFilter = Number(star) || undefined;
  const [similar, together, reviews, dist, liked, myReview, canReview, coupons] = await Promise.all([
    similarProducts(p.id, 12),
    boughtTogether([p.id], 3),
    prisma.review.findMany({ where: { productId: p.id, isHidden: false, ...(starFilter ? { rating: starFilter } : {}) }, include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.review.groupBy({ by: ["rating"], where: { productId: p.id, isHidden: false }, _count: true }),
    user ? prisma.wishlist.findUnique({ where: { userId_productId: { userId: user.id, productId: p.id } } }) : null,
    user ? prisma.review.findUnique({ where: { userId_productId: { userId: user.id, productId: p.id } } }) : null,
    user ? prisma.orderItem.findFirst({ where: { productId: p.id, order: { userId: user.id, status: "DELIVERED" } } }) : null,
    availableCoupons(),
  ]);
  const images = parseJSON<string[]>(p.images, []);
  const specs = parseJSON<Record<string, string>>(p.specs, {});
  const off = discountPercent(p.price, p.comparePrice);
  const combo = [{ id: p.id, name: p.name, price: p.price, thumbnail: p.thumbnail, slug: p.slug }, ...together];
  const totalReviews = dist.reduce((s, d) => s + d._count, 0);

  return (
    <div className="container-x space-y-4 py-4">
      <TrackView productId={p.id} />
      <div className="text-sm text-gray-500">
        <Link href="/" className="hover:text-brand-600">Trang chủ</Link>
        {p.category.parent && <> › <Link href={`/c/${p.category.parent.slug}`} className="hover:text-brand-600">{p.category.parent.name}</Link></>}
        {" › "}<Link href={`/c/${p.category.slug}`} className="hover:text-brand-600">{p.category.name}</Link> › <span className="text-gray-800">{p.name}</span>
      </div>

      <div className="card grid gap-6 p-4 md:grid-cols-[minmax(0,420px)_1fr]">
        <ProductGallery images={images.length ? images : [p.thumbnail]} name={p.name} />
        <div className="space-y-4">
          <div>
            {p.isFeatured && <span className="mr-2 rounded bg-brand-500 px-1.5 py-0.5 text-xs font-semibold text-white">Yêu thích+</span>}
            <h1 className="inline text-xl font-medium sm:text-2xl">{p.name}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="flex items-center gap-1 border-r pr-3"><span className="font-semibold text-brand-600 underline">{p.rating.toFixed(1)}</span> <Stars value={p.rating} size={14} /></span>
            <span className="border-r pr-3"><b>{p.ratingCount}</b> <span className="text-gray-500">Đánh giá</span></span>
            <span><b>{compactNumber(p.sold)}</b> <span className="text-gray-500">Đã bán</span></span>
            {p.brand && <span className="ml-auto text-gray-500">Thương hiệu: <Link href={`/search?brand=${p.brand.slug}`} className="text-brand-600">{p.brand.name}</Link></span>}
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-gray-50 px-4 py-4">
            {off > 0 && <span className="text-gray-400 line-through">{formatVND(p.comparePrice!)}</span>}
            <span className="text-3xl font-semibold text-brand-600">{formatVND(p.price)}</span>
            {off > 0 && <span className="rounded bg-brand-500 px-1.5 py-0.5 text-xs font-bold text-white">GIẢM {off}%</span>}
          </div>
          {coupons.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="flex w-24 items-center gap-1 text-gray-500"><Ticket size={14} /> Mã giảm</span>
              {coupons.slice(0, 4).map((c) => (
                <span key={c.id} className="rounded border border-brand-300 bg-brand-50 px-2 py-0.5 text-xs text-brand-700">{c.code}</span>
              ))}
            </div>
          )}
          <div className="flex gap-4 text-sm">
            <span className="w-24 shrink-0 text-gray-500">Vận chuyển</span>
            <div className="space-y-1">
              <div className="flex items-center gap-2"><Truck size={16} className="text-emerald-600" /> Miễn phí vận chuyển cho đơn từ 500.000₫</div>
              <div className="text-gray-500">Giao hỏa tốc 24h nội thành HCM, Hà Nội</div>
            </div>
          </div>
          <BuyBox productId={p.id} stock={p.stock} liked={!!liked} slug={p.slug} />
          <div className="grid grid-cols-3 gap-2 border-t pt-4 text-xs text-gray-600">
            <span className="flex items-center gap-1"><ShieldCheck size={16} className="text-brand-500" /> Hàng chính hãng 100%</span>
            <span className="flex items-center gap-1"><RotateCcw size={16} className="text-brand-500" /> {specs["Chính sách đổi trả"] ?? "Đổi trả 7 ngày"}</span>
            <span className="flex items-center gap-1"><ShieldCheck size={16} className="text-brand-500" /> Bảo hành {p.warranty}</span>
          </div>
        </div>
      </div>

      {together.length > 0 && (
        <Section title="Thường được mua cùng">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              {combo.map((c, k) => (
                <div key={c.id} className="flex items-center gap-3">
                  {k > 0 && <span className="text-2xl text-gray-400">+</span>}
                  <Link href={`/p/${c.slug}`} className="w-32 text-center">
                    <ProductImage src={c.thumbnail} alt={c.name} className="mx-auto h-24 w-24" />
                    <div className="line-clamp-2 text-xs">{c.name}</div>
                    <div className="text-sm font-semibold text-brand-600">{formatVND(c.price)}</div>
                  </Link>
                </div>
              ))}
            </div>
            <div className="w-full space-y-2 rounded-lg bg-gray-50 p-4 lg:w-64">
              <div className="text-sm text-gray-600">Tổng tiền {combo.length} sản phẩm:</div>
              <div className="text-2xl font-semibold text-brand-600">{formatVND(combo.reduce((s, c) => s + c.price, 0))}</div>
              <AddComboButton ids={combo.map((c) => c.id)} />
            </div>
          </div>
        </Section>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <section className="card p-4">
            <h2 className="mb-3 rounded bg-gray-50 px-3 py-2 font-semibold uppercase">Chi tiết sản phẩm</h2>
            <table className="mb-4 w-full text-sm">
              <tbody>
                <tr><td className="w-48 py-1.5 text-gray-500">Danh mục</td><td>{p.category.parent?.name} › {p.category.name}</td></tr>
                {Object.entries(specs).map(([k, v]) => (
                  <tr key={k}><td className="py-1.5 text-gray-500">{k}</td><td>{v}</td></tr>
                ))}
                <tr><td className="py-1.5 text-gray-500">Kho</td><td>{p.stock}</td></tr>
              </tbody>
            </table>
            <h2 className="mb-3 rounded bg-gray-50 px-3 py-2 font-semibold uppercase">Mô tả sản phẩm</h2>
            <div className="prose-vm text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: p.description }} />
          </section>

          <section id="reviews" className="card p-4">
            <h2 className="mb-3 font-semibold uppercase">Đánh giá sản phẩm</h2>
            <div className="mb-4 flex flex-wrap items-center gap-6 rounded-lg border border-brand-100 bg-brand-50/50 p-4">
              <div className="text-center">
                <div className="text-3xl font-semibold text-brand-600">{p.rating.toFixed(1)} <span className="text-base">trên 5</span></div>
                <Stars value={p.rating} size={18} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/p/${slug}#reviews`} className={`rounded border bg-white px-4 py-1.5 text-sm ${!starFilter ? "border-brand-500 text-brand-600" : ""}`}>Tất cả ({totalReviews})</Link>
                {[5, 4, 3, 2, 1].map((s) => (
                  <Link key={s} href={`/p/${slug}?star=${s}#reviews`} scroll={false} className={`rounded border bg-white px-4 py-1.5 text-sm ${starFilter === s ? "border-brand-500 text-brand-600" : ""}`}>
                    {s} Sao ({dist.find((d) => d.rating === s)?._count ?? 0})
                  </Link>
                ))}
              </div>
            </div>
            {canReview && <div className="mb-4"><ReviewForm productId={p.id} existing={myReview ?? undefined} /></div>}
            {!user && <p className="mb-4 text-sm text-gray-500"><Link href={`/login?next=/p/${slug}`} className="text-brand-600">Đăng nhập</Link> và mua sản phẩm để đánh giá.</p>}
            <div className="divide-y">
              {reviews.map((r) => (
                <div key={r.id} className="flex gap-3 py-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700">{r.user.name.split(" ").pop()?.[0]}</div>
                  <div className="text-sm">
                    <div className="font-medium">{r.user.name.replace(/(\S+)$/, (m) => m[0] + "***")}</div>
                    <Stars value={r.rating} />
                    <div className="mb-1 text-xs text-gray-400">{formatDate(r.createdAt)} {r.orderId ? "· Đã mua hàng" : ""}</div>
                    <p className="text-gray-700">{r.comment}</p>
                    {r.reply && <div className="mt-2 rounded bg-gray-50 p-2 text-gray-600"><b>Phản hồi của Người bán:</b> {r.reply}</div>}
                  </div>
                </div>
              ))}
              {!reviews.length && <p className="py-6 text-center text-sm text-gray-500">Chưa có đánh giá</p>}
            </div>
          </section>
        </div>
        <aside className="space-y-4">
          <div className="card p-4">
            <div className="mb-2 text-sm font-semibold uppercase">Cam kết của VietMart</div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>✅ Hoàn tiền 111% nếu phát hiện hàng giả</li>
              <li>✅ Mở hộp kiểm tra nhận hàng</li>
              <li>✅ Đổi trả miễn phí trong 30 ngày</li>
              <li>✅ Thanh toán an toàn qua VNPAY</li>
            </ul>
          </div>
        </aside>
      </div>

      <Section title="Sản phẩm tương tự" href={`/c/${p.category.slug}`}>
        <ProductRow items={similar} />
      </Section>
    </div>
  );
}
