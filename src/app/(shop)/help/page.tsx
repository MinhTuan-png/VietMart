export const metadata = { title: "Trung tâm trợ giúp" };

const SECTIONS = [
  ["gioi-thieu", "Giới thiệu VietMart", "VietMart là website thương mại điện tử (đồ án thực tập) mô phỏng các sàn như Shopee, Tiki, Amazon: đa danh mục, thanh toán trực tuyến VNPAY, gợi ý sản phẩm cá nhân hóa và trợ lý AI cho quản trị viên."],
  ["van-chuyen", "Chính sách vận chuyển", "Giao tiêu chuẩn 3-5 ngày phí 30.000₫, miễn phí cho đơn từ 500.000₫. Giao hỏa tốc trong 24h phí 50.000₫ (nội thành TP.HCM, Hà Nội). Khách được kiểm tra hàng trước khi nhận."],
  ["doi-tra", "Chính sách đổi trả", "Đổi trả miễn phí trong thời hạn ghi trên từng sản phẩm (7–90 ngày) nếu sản phẩm lỗi do nhà sản xuất, giao sai hoặc không đúng mô tả. Tiền hoàn về ví/tài khoản trong 3–7 ngày làm việc."],
  ["bao-hanh", "Chính sách bảo hành", "Sản phẩm được bảo hành theo chính sách của hãng, thời hạn hiển thị tại trang chi tiết. Mang sản phẩm kèm hóa đơn đến trung tâm bảo hành hoặc liên hệ hotline 1900 6868."],
  ["thanh-toan", "Hình thức thanh toán", "COD (tiền mặt khi nhận hàng); VNPAY (ATM nội địa, Visa/Master/JCB, QR ngân hàng). Giao dịch online được mã hóa và xác thực chữ ký HMAC theo chuẩn cổng thanh toán."],
  ["bao-mat", "Chính sách bảo mật", "Mật khẩu được mã hóa bcrypt, phiên đăng nhập dùng JWT httpOnly cookie. VietMart không lưu thông tin thẻ của khách hàng."],
  ["dieu-khoan", "Điều khoản sử dụng", "Khi sử dụng website, bạn đồng ý cung cấp thông tin chính xác và tuân thủ quy định pháp luật Việt Nam về thương mại điện tử."],
];

export default function HelpPage() {
  return (
    <div className="container-x py-6">
      <div className="mb-4 rounded-lg bg-gradient-to-r from-brand-600 to-brand-400 p-8 text-white">
        <h1 className="text-2xl font-bold">Xin chào, VietMart có thể giúp gì cho bạn?</h1>
        <p className="mt-1 opacity-90">Hotline 1900 6868 (8:00 – 22:00) · cskh@vietmart.vn</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {SECTIONS.map(([id, title, body]) => (
          <section key={id} id={id} className="card scroll-mt-32 p-5">
            <h2 className="mb-2 font-semibold">{title}</h2>
            <p className="text-sm leading-relaxed text-gray-600">{body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
