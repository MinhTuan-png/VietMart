import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-10 border-t-4 border-brand-500 bg-white text-sm text-gray-600">
      <div className="container-x grid grid-cols-2 gap-8 py-10 md:grid-cols-5">
        <div className="col-span-2">
          <div className="mb-2 text-xl font-extrabold text-brand-600">VietMart</div>
          <p className="mb-3">Mua sắm trực tuyến an toàn, tiện lợi. Hàng chính hãng, đổi trả dễ dàng, thanh toán đa dạng qua VNPAY hoặc COD.</p>
          <p>Địa chỉ: 123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh</p>
          <p>Email: cskh@vietmart.vn · Hotline: 1900 6868</p>
        </div>
        <div>
          <div className="mb-3 font-semibold text-gray-800 uppercase">Chăm sóc khách hàng</div>
          <ul className="space-y-1.5">
            <li><Link href="/help" className="hover:text-brand-600">Trung tâm trợ giúp</Link></li>
            <li><Link href="/order-tracking" className="hover:text-brand-600">Tra cứu đơn hàng</Link></li>
            <li><Link href="/help#doi-tra" className="hover:text-brand-600">Chính sách đổi trả</Link></li>
            <li><Link href="/help#van-chuyen" className="hover:text-brand-600">Chính sách vận chuyển</Link></li>
            <li><Link href="/help#bao-hanh" className="hover:text-brand-600">Chính sách bảo hành</Link></li>
          </ul>
        </div>
        <div>
          <div className="mb-3 font-semibold text-gray-800 uppercase">Thanh toán</div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded border px-2 py-1 text-xs font-bold text-[#005baa]">VNPAY</span>
            <span className="rounded border px-2 py-1 text-xs font-bold">COD</span>
          </div>
        </div>
        <div>
          <div className="mb-3 font-semibold text-gray-800 uppercase">Về VietMart</div>
          <ul className="space-y-1.5">
            <li><Link href="/help#gioi-thieu" className="hover:text-brand-600">Giới thiệu</Link></li>
            <li><Link href="/help#bao-mat" className="hover:text-brand-600">Chính sách bảo mật</Link></li>
            <li><Link href="/help#dieu-khoan" className="hover:text-brand-600">Điều khoản sử dụng</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-gray-400">© {new Date().getFullYear()} VietMart – Đồ án thực tập. Dữ liệu sản phẩm minh họa.</div>
    </footer>
  );
}
