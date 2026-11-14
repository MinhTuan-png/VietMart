import Listing, { type SP } from "@/components/Listing";

export const metadata = { title: "Tìm kiếm" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  return <Listing basePath="/search" sp={sp} title={q ? <>Kết quả tìm kiếm cho &quot;<span className="text-brand-600">{q}</span>&quot;</> : "Tất cả sản phẩm"} />;
}
