import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { moderateReview } from "@/app/actions/admin";
import ActionButton from "@/components/admin/ActionButton";
import ReviewReply from "@/components/admin/ReviewReply";
import Stars from "@/components/Stars";

export const metadata = { title: "Đánh giá" };

export default async function Reviews({ searchParams }: { searchParams: Promise<{ star?: string }> }) {
  const star = Number((await searchParams).star) || undefined;
  const reviews = await prisma.review.findMany({ where: star ? { rating: star } : {}, orderBy: { createdAt: "desc" }, take: 60, include: { user: { select: { name: true } }, product: { select: { name: true, slug: true } } } });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Đánh giá sản phẩm</h1>
      <div className="flex gap-2">
        <Link href="/admin/reviews" className={`rounded px-3 py-1 text-sm ${!star ? "bg-brand-500 text-white" : "bg-white"}`}>Tất cả</Link>
        {[1, 2, 3, 4, 5].map((s) => <Link key={s} href={`/admin/reviews?star=${s}`} className={`rounded px-3 py-1 text-sm ${star === s ? "bg-brand-500 text-white" : "bg-white"}`}>{s}★</Link>)}
      </div>
      <div className="card divide-y">
        {reviews.map((r) => (
          <div key={r.id} className={`flex gap-4 p-4 text-sm ${r.isHidden ? "opacity-50" : ""}`}>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2"><b>{r.user.name}</b> <Stars value={r.rating} /> <span className="text-xs text-gray-400">{formatDate(r.createdAt)}</span></div>
              <Link href={`/p/${r.product.slug}`} target="_blank" className="text-xs text-brand-600">{r.product.name}</Link>
              <p className="mt-1">{r.comment}</p>
              {r.reply && <p className="mt-1 rounded bg-gray-50 p-2 text-gray-600">↳ {r.reply}</p>}
              <ReviewReply id={r.id} reply={r.reply} />
            </div>
            <ActionButton action={moderateReview.bind(null, r.id, { hide: !r.isHidden })} className="h-fit text-xs text-gray-500 hover:text-gray-900">{r.isHidden ? "Hiện" : "Ẩn"}</ActionButton>
          </div>
        ))}
      </div>
    </div>
  );
}
