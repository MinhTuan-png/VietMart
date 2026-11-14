# VietMart – Website thương mại điện tử (Đồ án thực tập)

Website bán hàng đa ngành mô phỏng các sàn thực tế (Shopee, Tiki, Amazon): danh mục nhiều cấp, tìm kiếm & lọc, chi tiết sản phẩm, đánh giá, giỏ hàng, mã giảm giá, **thanh toán trực tuyến VNPAY & MoMo**, theo dõi đơn hàng, **hệ thống gợi ý sản phẩm**, trang quản trị đầy đủ và **Trợ lý AI (Claude) quản lý website & kho hàng** bằng tool calls.

## Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Framework | Next.js 15 (App Router, Server Components, Server Actions), React 19, TypeScript |
| Giao diện | Tailwind CSS v4, lucide-react, Recharts (biểu đồ) |
| CSDL / ORM | Prisma 6 + PostgreSQL (Neon / Supabase miễn phí hoặc Postgres cài trên máy) |
| Xác thực | JWT (jose) lưu trong cookie httpOnly, mật khẩu băm bcrypt, middleware phân quyền |
| Thanh toán | VNPAY v2.1.0 (HMAC-SHA512), COD |
| AI | Claude API (`@anthropic-ai/sdk`) hoặc API tương thích OpenAI (Gemini miễn phí, Groq, OpenRouter, Ollama) – agent loop + 15 công cụ, xác nhận trước khi ghi |

## Chạy dự án

Yêu cầu: Node.js 20+ và một CSDL PostgreSQL. Cách nhanh nhất là tạo miễn phí trên [Neon](https://neon.tech): đăng ký, tạo project, vào **Connect** và copy chuỗi kết nối (bỏ chọn *Connection pooling*), rồi dán vào `DATABASE_URL` trong `.env`.

```bash
npm install
cp .env.example .env        # Windows: copy .env.example .env  -> sửa DATABASE_URL
npm run setup               # tạo CSDL + nạp dữ liệu mẫu
npm run dev                 # mở http://localhost:3000
```

Tài khoản demo:

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Quản trị (ADMIN) | admin@vietmart.vn | admin123 |
| Nhân viên kho (STAFF) | nhanvien@vietmart.vn | 123456 |
| Khách hàng | khach@vietmart.vn | 123456 |

Dữ liệu mẫu: 8 ngành hàng / 24 danh mục con, 184 sản phẩm (ảnh thật từ DummyJSON CDN, giá quy đổi VND), 61 khách hàng, ~520 đơn hàng lịch sử trong 120 ngày (để có dữ liệu thống kê & gợi ý), đánh giá, 5 mã giảm giá. Chạy lại `npm run db:seed` để reset dữ liệu.

## Chức năng

### Khách hàng
- Trang chủ: banner, danh mục, **Flash Sale** có đồng hồ đếm ngược, mã giảm giá hôm nay, xu hướng, sản phẩm đã xem, bán chạy theo ngành, **Gợi ý hôm nay dành cho bạn**.
- Tìm kiếm có gợi ý tức thì (autocomplete), lịch sử tìm kiếm, từ khóa hot, hỗ trợ gõ không dấu.
- Danh mục / kết quả tìm kiếm: lọc theo thương hiệu, khoảng giá, số sao, còn hàng; sắp xếp phổ biến / bán chạy / mới / giá / đánh giá; phân trang.
- Chi tiết sản phẩm: album ảnh, giá gốc/giảm %, mã giảm giá áp dụng, chọn số lượng, thêm giỏ / mua ngay, yêu thích, thông số, mô tả, **đánh giá** (lọc theo sao, chỉ người đã mua & nhận hàng mới được đánh giá, shop phản hồi), **Thường được mua cùng** (combo), **Sản phẩm tương tự**.
- Giỏ hàng: chọn từng món / tất cả, sửa số lượng (kiểm tra tồn kho), tiết kiệm được bao nhiêu, gợi ý mua kèm.
- Thanh toán: sổ địa chỉ, giao tiêu chuẩn / hỏa tốc (freeship đơn từ 500K), mã giảm giá (%, số tiền, freeship; điều kiện đơn tối thiểu, giới hạn lượt), **COD / VNPAY**, ghi chú.
- Tài khoản: hồ sơ, hạng thành viên, đổi mật khẩu, sổ địa chỉ, sản phẩm yêu thích, đơn mua theo trạng thái, chi tiết đơn với **timeline vận chuyển**, hủy đơn có lý do, thanh toán lại khi thanh toán lỗi.
- Tra cứu đơn hàng không cần đăng nhập (mã đơn + SĐT), trang trợ giúp/chính sách.

### Quản trị (`/admin`)
- **Tổng quan**: doanh thu, lợi nhuận ước tính, tăng trưởng so với kỳ trước, biểu đồ doanh thu theo ngày, theo ngành hàng, trạng thái đơn, phương thức thanh toán, top sản phẩm, top khách hàng, cảnh báo kho.
- **Đơn hàng**: lọc theo trạng thái/thanh toán/tìm kiếm, chuyển trạng thái theo luồng hợp lệ (hủy/trả hàng tự hoàn kho), xác nhận thanh toán thủ công.
- **Sản phẩm**: thêm/sửa/ẩn, giá vốn – giá bán – giá gốc, album ảnh, thông số, nổi bật.
- **Kho hàng**: tổng tồn & giá trị tồn, **dự báo số ngày còn hàng theo tốc độ bán 30 ngày, mức rủi ro và số lượng gợi ý nhập**, nhập/điều chỉnh kho, nhật ký xuất nhập.
- Danh mục, khách hàng & phân quyền (CUSTOMER/STAFF/ADMIN, khóa tài khoản), mã giảm giá, kiểm duyệt & phản hồi đánh giá, **nhật ký hoạt động** (ghi lại mọi thao tác, đánh dấu thao tác qua AI).

### Trợ lý AI quản trị (`/admin/ai` + nút chat nổi ở mọi trang admin)
Chat bằng tiếng Việt, ví dụ:
- "Sản phẩm nào sắp hết hàng? Đề xuất số lượng cần nhập"
- "Nhập thêm 50 cái cho tất cả sản phẩm đang hết hàng"
- "Báo cáo doanh thu 7 ngày qua so với tuần trước"
- "Giảm giá iPhone X còn 19.990.000đ và đặt làm nổi bật"
- "Xác nhận tất cả đơn COD đang chờ"
- "Tạo mã giảm 20% tối đa 100K cho đơn từ 500K, hiệu lực 7 ngày"

Cách hoạt động (`src/lib/ai/`):
- `agent.ts`: vòng lặp agent gọi Claude Messages API với danh sách công cụ; kết quả stream về trình duyệt (NDJSON) để hiện từng bước.
- `tools.ts`: 10 công cụ đọc (thống kê, báo cáo, tìm sản phẩm, dự báo tồn kho, đơn hàng, mã giảm giá, đánh giá...) và 5 công cụ ghi (cập nhật kho, sản phẩm, đơn hàng, tạo/bật/tắt mã giảm giá). Tham số được kiểm tra bằng Zod.
- **Human-in-the-loop**: khi AI muốn thay đổi dữ liệu, hệ thống dừng lại và hiện thẻ "Cần bạn xác nhận" mô tả rõ thao tác (vd. "Nhập kho +25 cho Đồng hồ nữ mạ vàng (tồn 0)"). Chỉ khi admin bấm Xác nhận mới thực thi; mọi thao tác ghi vào Nhật ký hoạt động. STAFF chỉ được sửa kho & đơn.
- Nhiều nhà cung cấp (`provider.ts`), chỉ cần điền 1 key trong `.env`:
  - **Google Gemini (miễn phí)**: lấy key tại https://aistudio.google.com/apikey → `GEMINI_API_KEY=...`
  - Claude: `ANTHROPIC_API_KEY=...` (model `claude-opus-5-5`, bật server-side fallback)
  - Groq / OpenRouter / Ollama (chạy local) / API tương thích OpenAI bất kỳ – xem `.env.example`
  - `agent.ts` (Claude SDK) và `openai-agent.ts` (Chat Completions) dùng chung bộ công cụ và cơ chế xác nhận.
- Không có API key → **chế độ offline** (`offline.ts`) nhận diện từ khóa và trả lời tra cứu cơ bản để vẫn demo được.

## Thanh toán trực tuyến

| Cổng | Cấu hình | Ghi chú |
|---|---|---|
| VNPAY | `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` (đăng ký sandbox miễn phí tại https://sandbox.vnpayment.vn/devreg/) | Thẻ test: NCB `9704198526191432198`, tên `NGUYEN VAN A`, ngày phát hành `07/15`, OTP `123456` |
| Giả lập | `PAYMENT_MODE=mock` (VNPAY tự dùng giả lập khi chưa có key) | Trang `/payment/mock` tạo dữ liệu trả về **được ký đúng thuật toán** của VNPAY nên vẫn kiểm thử được luồng xác thực chữ ký |

Luồng: tạo đơn (trừ kho, giữ hàng) → chuyển sang cổng → cổng redirect về `/api/payment/vnpay/return` → kiểm tra chữ ký HMAC, số tiền → cập nhật đơn (idempotent). IPN server-to-server: `/api/payment/vnpay/ipn` (GET) và `/api/payment/momo/ipn` (POST) – cần URL công khai (deploy hoặc ngrok). Thanh toán lỗi → đơn giữ trạng thái chờ, khách có thể **Thanh toán lại** hoặc hủy (hoàn kho).

## Hệ thống gợi ý sản phẩm (`src/lib/recommend.ts`)

| Vị trí | Thuật toán |
|---|---|
| Sản phẩm tương tự | Content-based: chấm điểm theo cùng danh mục, thương hiệu, tag chung, độ gần về giá, rating, độ phổ biến |
| Thường được mua cùng / gợi ý trong giỏ | Item-to-item collaborative filtering: đếm số đơn chứa đồng thời 2 sản phẩm (kiểu Amazon) |
| Gợi ý hôm nay dành cho bạn | Hồ sơ sở thích từ lượt xem (×1), yêu thích (×3), giỏ hàng (×4), đã mua (×2) với suy giảm theo thời gian; chấm điểm danh mục/thương hiệu ưa thích + rating + bán chạy; loại sản phẩm đã mua; đa dạng hóa tối đa 4 SP/danh mục |
| Khách mới (cold-start) | Xu hướng 14 ngày / bán chạy |

## Cấu trúc thư mục

```
prisma/              schema.prisma, seed.ts, data/products.json
src/app/(shop)/      các trang khách hàng (trang chủ, c/[slug], p/[slug], cart, checkout, account...)
src/app/admin/       các trang quản trị
src/app/api/         payment (VNPAY return + IPN), search suggest, admin/ai (stream)
src/app/actions/     server actions: auth, cart, checkout, account, admin
src/lib/             db, auth, orders (đặt hàng/trừ kho), coupons, recommend, admin-ops, payment/, ai/
src/components/      UI dùng chung + admin/
```

## Triển khai

Miễn phí với **Vercel** (hosting) + **Neon** (PostgreSQL):

1. Tạo CSDL trên Neon, đặt chuỗi kết nối vào `.env` trên máy và chạy `npm run setup` một lần để tạo bảng + dữ liệu mẫu.
2. Đẩy code lên GitHub (file `.env` đã được `.gitignore`, không bị đẩy lên).
3. Vào vercel.com > **Add New Project** > chọn repo > mục **Environment Variables** thêm `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL` (ví dụ `https://vietmart.vercel.app`) và key AI / thanh toán nếu có > **Deploy**.
4. Sau khi có domain, sửa lại `NEXT_PUBLIC_SITE_URL` cho đúng rồi Redeploy để VNPAY gọi được Return/IPN URL.
