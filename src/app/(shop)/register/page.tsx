import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { RegisterForm } from "@/components/AuthForms";

export const metadata = { title: "Đăng ký" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect(next ?? "/");
  return (
    <div className="bg-gradient-to-br from-brand-500 to-brand-700 py-10">
      <div className="container-x flex items-center justify-center gap-16">
        <div className="hidden max-w-sm text-white lg:block">
          <div className="mb-3 text-5xl font-black">VietMart</div>
          <p className="text-xl">Nền tảng mua sắm trực tuyến yêu thích của người Việt</p>
          <ul className="mt-6 space-y-2 text-sm opacity-90">
            <li>✔ Hàng chính hãng, giá tốt mỗi ngày</li>
            <li>✔ Thanh toán VNPAY, COD</li>
            <li>✔ Gợi ý sản phẩm thông minh theo sở thích</li>
          </ul>
        </div>
        <div className="w-full max-w-md rounded-lg bg-white p-7 shadow-xl">
          <h1 className="mb-5 text-xl font-semibold">Đăng ký</h1>
          <RegisterForm next={next} />
        </div>
      </div>
    </div>
  );
}
