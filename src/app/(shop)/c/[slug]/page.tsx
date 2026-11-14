import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Listing, { type SP } from "@/components/Listing";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const c = await prisma.category.findUnique({ where: { slug: (await params).slug } });
  return { title: c?.name ?? "Danh mục" };
}

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SP> }) {
  const { slug } = await params;
  const cat = await prisma.category.findUnique({ where: { slug }, include: { children: true, parent: { include: { children: true } } } });
  if (!cat) notFound();
  const ids = cat.children.length ? cat.children.map((c) => c.id) : [cat.id];
  const siblings = cat.children.length ? cat.children : cat.parent?.children ?? [];
  return (
    <>
      <div className="container-x pt-4 text-sm text-gray-500">
        <Link href="/" className="hover:text-brand-600">Trang chủ</Link>
        {cat.parent && (<> › <Link href={`/c/${cat.parent.slug}`} className="hover:text-brand-600">{cat.parent.name}</Link></>)} › <span className="text-gray-800">{cat.name}</span>
      </div>
      <Listing
        basePath={`/c/${slug}`}
        sp={await searchParams}
        categoryIds={ids}
        title={cat.name}
        extraTop={
          siblings.length > 0 && (
            <div>
              <div className="mb-2 font-semibold">Danh mục</div>
              <div className="space-y-1">
                {siblings.map((s) => (
                  <Link key={s.id} href={`/c/${s.slug}`} className={`block rounded px-2 py-1 ${s.id === cat.id ? "font-medium text-brand-600" : "hover:bg-gray-50"}`}>{s.name}</Link>
                ))}
              </div>
            </div>
          )
        }
      />
    </>
  );
}
