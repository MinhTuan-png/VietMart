/* eslint-disable @typescript-eslint/no-explicit-any */
// Seed dữ liệu mẫu: danh mục, thương hiệu, ~180 sản phẩm (ảnh thật từ DummyJSON CDN),
// khách hàng, đơn hàng lịch sử 120 ngày, đánh giá, mã giảm giá.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
// products.json: dữ liệu gốc DummyJSON; extra-products.json: sản phẩm bổ sung (tên/mô tả tiếng Việt, giá `priceVnd`)
const raw: any[] = [
  ...JSON.parse(fs.readFileSync(path.join(__dirname, "data/products.json"), "utf8")),
  ...JSON.parse(fs.readFileSync(path.join(__dirname, "data/extra-products.json"), "utf8")),
];

// ---------- Danh mục ----------
const TREE: { name: string; slug: string; icon: string; children: [string, string, string][] }[] = [
  { name: "Điện thoại & Máy tính bảng", slug: "dien-thoai-may-tinh-bang", icon: "📱", children: [["smartphones", "Điện thoại", "dien-thoai"], ["tablets", "Máy tính bảng", "may-tinh-bang"]] },
  { name: "Laptop & Thiết bị số", slug: "laptop-thiet-bi-so", icon: "💻", children: [["laptops", "Laptop", "laptop"], ["mobile-accessories", "Phụ kiện công nghệ", "phu-kien-cong-nghe"]] },
  { name: "Thời trang nam", slug: "thoi-trang-nam", icon: "👔", children: [["mens-shirts", "Áo sơ mi & Áo thun nam", "ao-nam"], ["mens-shoes", "Giày nam", "giay-nam"], ["mens-watches", "Đồng hồ nam", "dong-ho-nam"], ["sunglasses", "Kính mát", "kinh-mat"]] },
  { name: "Thời trang nữ", slug: "thoi-trang-nu", icon: "👗", children: [["tops", "Đầm & Váy", "dam-vay"], ["womens-dresses", "Đầm dạ hội", "dam-da-hoi"], ["womens-shoes", "Giày nữ", "giay-nu"], ["womens-bags", "Túi xách nữ", "tui-xach-nu"], ["womens-jewellery", "Trang sức", "trang-suc"], ["womens-watches", "Đồng hồ nữ", "dong-ho-nu"]] },
  { name: "Làm đẹp & Sức khỏe", slug: "lam-dep-suc-khoe", icon: "💄", children: [["beauty", "Trang điểm", "trang-diem"], ["skin-care", "Chăm sóc cơ thể", "cham-soc-co-the"], ["fragrances", "Nước hoa", "nuoc-hoa"]] },
  { name: "Nhà cửa & Đời sống", slug: "nha-cua-doi-song", icon: "🏠", children: [["kitchen-accessories", "Đồ dùng nhà bếp", "do-dung-nha-bep"], ["home-decoration", "Trang trí nhà cửa", "trang-tri-nha-cua"], ["furniture", "Nội thất", "noi-that"]] },
  { name: "Bách hóa Online", slug: "bach-hoa-online", icon: "🛒", children: [["groceries", "Thực phẩm & Đồ uống", "thuc-pham-do-uong"]] },
  { name: "Thể thao & Dã ngoại", slug: "the-thao-da-ngoai", icon: "⚽", children: [["sports-accessories", "Dụng cụ thể thao", "dung-cu-the-thao"]] },
];

// ---------- Việt hóa tên sản phẩm phổ thông ----------
const VI: Record<string, string> = {
  Apple: "Táo Envy nhập khẩu (1kg)", "Beef Steak": "Thăn bò Úc cắt steak (500g)", "Cat Food": "Thức ăn hạt cho mèo", "Chicken Meat": "Thịt gà ta làm sạch (1kg)", "Cooking Oil": "Dầu ăn hướng dương 1L", Cucumber: "Dưa leo Đà Lạt (500g)", "Dog Food": "Thức ăn hạt cho chó", Eggs: "Trứng gà sạch (hộp 10 quả)", "Fish Steak": "Cá hồi phi lê (300g)", "Green Bell Pepper": "Ớt chuông xanh (500g)", "Green Chili Pepper": "Ớt xanh (200g)", "Honey Jar": "Mật ong rừng nguyên chất 500ml", "Ice Cream": "Kem vani hộp 450ml", Juice: "Nước ép cam nguyên chất 1L", Kiwi: "Kiwi vàng New Zealand (500g)", Lemon: "Chanh vàng (500g)", Milk: "Sữa tươi tiệt trùng 1L", Mulberry: "Dâu tằm Đà Lạt (500g)", "Nescafe Coffee": "Cà phê Nescafé hũ 200g", Potatoes: "Khoai tây Đà Lạt (1kg)", "Protein Powder": "Bột Protein Whey 1kg", "Red Onions": "Hành tím (500g)", Rice: "Gạo ST25 túi 5kg", "Soft Drinks": "Nước ngọt có ga (lốc 6 lon)", Strawberry: "Dâu tây Đà Lạt (500g)", "Tissue Paper Box": "Khăn giấy hộp 3 lớp", Water: "Nước suối 1.5L (thùng 12 chai)",
  "Bamboo Spatula": "Sạn tre tự nhiên", "Black Aluminium Cup": "Cốc nhôm đen giữ nhiệt", "Black Whisk": "Cây đánh trứng inox", "Boxed Blender": "Máy xay sinh tố đa năng", "Carbon Steel Wok": "Chảo thép carbon chống dính", "Chopping Board": "Thớt gỗ tự nhiên", "Citrus Squeezer Yellow": "Dụng cụ vắt cam chanh", "Egg Slicer": "Dụng cụ cắt trứng", "Electric Stove": "Bếp điện đơn", "Fine Mesh Strainer": "Rây lọc lưới mịn", Fork: "Bộ nĩa inox (6 cái)", Glass: "Bộ ly thủy tinh (6 cái)", "Grater Black": "Dụng cụ bào rau củ", "Hand Blender": "Máy xay cầm tay", "Ice Cube Tray": "Khay làm đá silicon", "Kitchen Sieve": "Rổ lọc nhà bếp", Knife: "Dao bếp inox cao cấp", "Lunch Box": "Hộp cơm giữ nhiệt", "Microwave Oven": "Lò vi sóng 20L", "Mug Tree Stand": "Giá treo cốc", Pan: "Chảo chống dính 26cm", Plate: "Bộ đĩa sứ (6 cái)", "Red Tongs": "Kẹp gắp thức ăn", "Silver Pot With Glass Cap": "Nồi inox nắp kính", "Slotted Turner": "Sạn lật có rãnh", "Spice Rack": "Kệ đựng gia vị", Spoon: "Bộ muỗng inox (6 cái)", Tray: "Khay gỗ phục vụ", "Wooden Rolling Pin": "Cây cán bột gỗ", "Yellow Peeler": "Dao bào vỏ",
  "Decoration Swing": "Xích đu trang trí", "Family Tree Photo Frame": "Khung ảnh cây gia đình", "House Showpiece Plant": "Cây cảnh trang trí", "Plant Pot": "Chậu cây gốm", "Table Lamp": "Đèn bàn trang trí",
  "Bedside Table African Cherry": "Tủ đầu giường gỗ anh đào", "Wooden Bathroom Sink With Mirror": "Tủ lavabo gỗ kèm gương",
  "American Football": "Bóng bầu dục", "Baseball Ball": "Bóng chày", "Baseball Glove": "Găng tay bóng chày", Basketball: "Bóng rổ số 7", "Basketball Rim": "Vành bóng rổ", "Cricket Ball": "Bóng cricket", "Cricket Bat": "Gậy cricket", "Cricket Helmet": "Mũ bảo hiểm cricket", "Cricket Wicket": "Cọc cricket", "Feather Shuttlecock": "Quả cầu lông (hộp 12)", Football: "Bóng đá số 5", "Golf Ball": "Bóng golf (hộp 12)", "Iron Golf": "Gậy golf sắt", "Metal Baseball Bat": "Gậy bóng chày kim loại", "Tennis Ball": "Bóng tennis (hộp 3)", "Tennis Racket": "Vợt tennis", Volleyball: "Bóng chuyền",
  "Blue Frock": "Đầm xanh dáng xòe", "Girl Summer Dress": "Váy hè bé gái", "Gray Dress": "Đầm xám công sở", "Short Frock": "Đầm ngắn dáng suông", "Tartan Dress": "Đầm kẻ caro",
  "Black Women's Gown": "Đầm dạ hội đen", "Corset Leather With Skirt": "Set corset da kèm chân váy", "Corset With Black Skirt": "Set corset kèm chân váy đen", "Dress Pea": "Đầm hoa nhí", "Marni Red & Black Suit": "Bộ suit Marni đỏ đen",
  "Blue & Black Check Shirt": "Áo sơ mi caro xanh đen", "Man Plaid Shirt": "Áo sơ mi kẻ nam", "Man Short Sleeve Shirt": "Áo sơ mi nam ngắn tay", "Men Check Shirt": "Áo sơ mi caro nam",
  "Black & Brown Slipper": "Dép quai đen nâu", "Golden Shoes Woman": "Giày cao gót ánh kim", "Red Shoes": "Giày búp bê đỏ",
  "Blue Women's Handbag": "Túi xách nữ màu xanh", "White Faux Leather Backpack": "Balo da trắng", "Women Handbag Black": "Túi xách nữ đen",
  "Green Crystal Earring": "Bông tai pha lê xanh", "Green Oval Earring": "Bông tai oval xanh", "Tropical Earring": "Bông tai nhiệt đới",
  "Black Sun Glasses": "Kính mát gọng đen", "Classic Sun Glasses": "Kính mát cổ điển", "Green and Black Glasses": "Kính mát xanh đen", "Party Glasses": "Kính dự tiệc", Sunglasses: "Kính mát thời trang",
  "Eyeshadow Palette with Mirror": "Bảng phấn mắt kèm gương", "Powder Canister": "Phấn phủ dạng hộp", "Red Lipstick": "Son môi đỏ", "Red Nail Polish": "Sơn móng tay đỏ",
  "Brown Leather Belt Watch": "Đồng hồ dây da nâu", "Watch Gold for Women": "Đồng hồ nữ mạ vàng", "Women's Wrist Watch": "Đồng hồ đeo tay nữ",
  Monopod: "Gậy chụp ảnh Monopod", "Selfie Lamp with iPhone": "Đèn livestream selfie", "Selfie Stick Monopod": "Gậy selfie bluetooth", "TV Studio Camera Pedestal": "Chân đế máy quay studio",
};

const WARRANTY: Record<string, string> = { "1 month warranty": "1 tháng", "1 week warranty": "1 tuần", "1 year warranty": "12 tháng", "2 year warranty": "24 tháng", "3 months warranty": "3 tháng", "3 year warranty": "36 tháng", "5 year warranty": "60 tháng", "6 months warranty": "6 tháng", "Lifetime warranty": "Trọn đời", "No warranty": "Không bảo hành" };
const RETURN: Record<string, string> = { "30 days return policy": "Đổi trả trong 30 ngày", "60 days return policy": "Đổi trả trong 60 ngày", "7 days return policy": "Đổi trả trong 7 ngày", "90 days return policy": "Đổi trả trong 90 ngày", "No return policy": "Không áp dụng đổi trả" };
const SHIP: Record<string, string> = { "Ships in 1 month": "Giao trong 1 tháng (hàng đặt trước)", "Ships in 1 week": "Giao trong 1 tuần", "Ships in 1-2 business days": "Giao trong 1-2 ngày làm việc", "Ships in 2 weeks": "Giao trong 2 tuần", "Ships in 3-5 business days": "Giao trong 3-5 ngày làm việc", "Ships overnight": "Giao nhanh trong 24h" };
const REVIEW_VI: Record<string, string> = {
  "Awesome product!": "Sản phẩm tuyệt vời, đáng tiền!", "Disappointing product!": "Sản phẩm hơi thất vọng, không như kỳ vọng.", "Excellent quality!": "Chất lượng xuất sắc, đóng gói cẩn thận.", "Fast shipping!": "Giao hàng siêu nhanh, shop tư vấn nhiệt tình.", "Great product!": "Sản phẩm rất tốt, sẽ ủng hộ shop tiếp.", "Great value for money!": "Giá hợp lý so với chất lượng.", "Highly impressed!": "Rất ấn tượng, hàng y hình.", "Highly recommended!": "Rất đáng mua, recommend mọi người nhé!", "Not as described!": "Hàng không giống mô tả lắm.", "Not worth the price!": "Không đáng với giá tiền.", "Poor quality!": "Chất lượng kém.", "Very disappointed!": "Rất thất vọng.", "Very dissatisfied!": "Không hài lòng.", "Very happy with my purchase!": "Rất vui vì đã mua sản phẩm này.", "Very pleased!": "Rất hài lòng!", "Very satisfied!": "Rất hài lòng, 10 điểm.", "Very unhappy with my purchase!": "Không vui với lần mua này.", "Waste of money!": "Phí tiền.", "Would buy again!": "Sẽ mua lại lần sau.", "Would not buy again!": "Sẽ không mua lại.", "Would not recommend!": "Không khuyến khích mua.",
};
const INTRO: Record<string, string> = {
  "dien-thoai-may-tinh-bang": "là thiết bị di động được nhiều khách hàng tin chọn nhờ hiệu năng ổn định, màn hình sắc nét và thời lượng pin bền bỉ cho nhu cầu học tập, làm việc và giải trí hằng ngày.",
  "laptop-thiet-bi-so": "mang đến trải nghiệm công nghệ hiện đại, thiết kế tinh tế và độ hoàn thiện cao, phù hợp cho cả công việc chuyên nghiệp lẫn giải trí.",
  "thoi-trang-nam": "là lựa chọn thời trang nam lịch lãm, dễ phối đồ, chất liệu cao cấp mang lại cảm giác thoải mái suốt cả ngày.",
  "thoi-trang-nu": "giúp phái đẹp tự tin tỏa sáng với thiết kế thời thượng, đường may tỉ mỉ và chất liệu cao cấp.",
  "lam-dep-suc-khoe": "là sản phẩm làm đẹp chính hãng, thành phần an toàn, giúp bạn chăm sóc bản thân mỗi ngày.",
  "nha-cua-doi-song": "là món đồ gia dụng tiện ích, bền bỉ, giúp không gian sống của bạn gọn gàng và tiện nghi hơn.",
  "bach-hoa-online": "là sản phẩm tươi ngon, nguồn gốc rõ ràng, được bảo quản đúng tiêu chuẩn và giao nhanh đến tận nhà.",
  "the-thao-da-ngoai": "là dụng cụ thể thao chất lượng, bền chắc, hỗ trợ bạn luyện tập và thi đấu hiệu quả.",
};

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function toVnd(usd: number) {
  const v = usd * 25000;
  if (v >= 1_000_000) return Math.round(v / 10000) * 10000 - 10000;
  if (v >= 100_000) return Math.round(v / 1000) * 1000 - 1000;
  return Math.max(5000, Math.round(v / 1000) * 1000);
}

// random có seed để dữ liệu ổn định giữa các lần seed
let _s = 20261028;
const rnd = () => ((_s = (_s * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
const randInt = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));

const HO = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương"];
const DEM = ["Văn", "Thị", "Minh", "Ngọc", "Thanh", "Đức", "Thu", "Hoàng", "Gia", "Bảo", "Khánh", "Phương"];
const TEN = ["An", "Bình", "Châu", "Dũng", "Giang", "Hà", "Hải", "Hùng", "Hương", "Khoa", "Lan", "Linh", "Long", "Mai", "Nam", "Nga", "Phúc", "Quân", "Quỳnh", "Sơn", "Tâm", "Thảo", "Trang", "Trung", "Tuấn", "Vy", "Yến", "Huy", "Nhi", "Tú"];
const ADDR = [
  ["TP. Hồ Chí Minh", "Quận 1", "Phường Bến Nghé"], ["TP. Hồ Chí Minh", "Quận 3", "Phường Võ Thị Sáu"], ["TP. Hồ Chí Minh", "TP. Thủ Đức", "Phường Linh Trung"],
  ["Hà Nội", "Quận Cầu Giấy", "Phường Dịch Vọng"], ["Hà Nội", "Quận Hoàn Kiếm", "Phường Hàng Bạc"], ["Đà Nẵng", "Quận Hải Châu", "Phường Thạch Thang"],
  ["Cần Thơ", "Quận Ninh Kiều", "Phường An Hòa"], ["Hải Phòng", "Quận Lê Chân", "Phường An Biên"], ["Bình Dương", "TP. Thủ Dầu Một", "Phường Phú Cường"],
];
const STREETS = ["Lê Lợi", "Nguyễn Huệ", "Trần Hưng Đạo", "Hai Bà Trưng", "Lý Thường Kiệt", "Điện Biên Phủ", "Cách Mạng Tháng 8", "Nguyễn Trãi", "Pasteur"];

async function main() {
  console.log("🧹 Xóa dữ liệu cũ...");
  await prisma.$transaction([
    prisma.auditLog.deleteMany(), prisma.inventoryLog.deleteMany(), prisma.orderStatusHistory.deleteMany(), prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(), prisma.cartItem.deleteMany(), prisma.wishlist.deleteMany(), prisma.productView.deleteMany(),
    prisma.review.deleteMany(), prisma.product.deleteMany(), prisma.brand.deleteMany(), prisma.category.deleteMany(),
    prisma.coupon.deleteMany(), prisma.address.deleteMany(), prisma.user.deleteMany(),
  ]);

  console.log("📂 Danh mục...");
  const catMap = new Map<string, { id: number; parentSlug: string }>();
  for (const [i, g] of TREE.entries()) {
    const parent = await prisma.category.create({ data: { name: g.name, slug: g.slug, icon: g.icon, sortOrder: i } });
    for (const [j, [key, name, slug]] of g.children.entries()) {
      const c = await prisma.category.create({ data: { name, slug, parentId: parent.id, sortOrder: j } });
      catMap.set(key, { id: c.id, parentSlug: g.slug });
    }
  }

  console.log("🏷️  Thương hiệu & sản phẩm...");
  const brandMap = new Map<string, number>();
  const products: { id: number; price: number; cat: string; parent: string; title: string; reviews: any[] }[] = [];
  const usedSlugs = new Set<string>();
  const brandNames = [...new Set(raw.filter((p) => p.brand && catMap.has(p.category)).map((p) => p.brand as string))];
  await prisma.brand.createMany({ data: brandNames.map((n) => ({ name: n, slug: slugify(n) })), skipDuplicates: true });
  for (const b of await prisma.brand.findMany()) brandMap.set(b.name, b.id);
  const rows: { data: any; meta: { slug: string; price: number; cat: string; parent: string; title: string; reviews: any[] } }[] = [];
  for (const p of raw) {
    const cat = catMap.get(p.category);
    if (!cat) continue; // bỏ xe hơi / mô tô
    const brandId = p.brand ? brandMap.get(p.brand) : undefined;
    const name = VI[p.title] ?? p.title;
    let slug = slugify(name);
    while (usedSlugs.has(slug)) slug += "-" + p.id;
    usedSlugs.add(slug);
    const price = p.priceVnd ?? toVnd(p.price);
    const comparePrice = p.discountPercentage > 3 ? Math.round(price / (1 - p.discountPercentage / 100) / 1000) * 1000 : null;
    const warranty = WARRANTY[p.warrantyInformation] ?? p.warrantyInformation;
    const specs: Record<string, string> = {
      "Thương hiệu": p.brand ?? "OEM",
      "Mã SKU": p.sku,
      "Trọng lượng": `${p.weight * 100} g`,
      "Kích thước (R x C x S)": `${p.dimensions.width} x ${p.dimensions.height} x ${p.dimensions.depth} cm`,
      "Bảo hành": warranty,
      "Chính sách đổi trả": RETURN[p.returnPolicy] ?? p.returnPolicy,
      "Vận chuyển": SHIP[p.shippingInformation] ?? p.shippingInformation,
      "Xuất xứ": pick(["Chính hãng", "Nhập khẩu", "Việt Nam", "Hàn Quốc", "Nhật Bản", "Trung Quốc"]),
      ...(p.specs ?? {}),
    };
    const description =
      `<p><strong>${name}</strong> ${INTRO[cat.parentSlug]}</p>` +
      `<h3>Đặc điểm nổi bật</h3><ul>` +
      `<li>Sản phẩm ${p.brand ? `chính hãng ${p.brand}` : "chất lượng cao"}, có đầy đủ hóa đơn VAT.</li>` +
      `<li>Bảo hành: ${warranty}. ${RETURN[p.returnPolicy] ?? ""}.</li>` +
      `<li>${SHIP[p.shippingInformation] ?? "Giao hàng toàn quốc"}, đóng gói cẩn thận, kiểm tra hàng trước khi nhận.</li>` +
      `<li>Miễn phí vận chuyển cho đơn hàng từ 500.000đ.</li></ul>` +
      `<h3>Mô tả từ nhà sản xuất</h3><p>${p.description}</p>`;
    rows.push({
      data: {
        name, slug, sku: p.sku, price, comparePrice, costPrice: Math.round((price * (0.6 + rnd() * 0.2)) / 1000) * 1000,
        shortDesc: `${name} - ${INTRO[cat.parentSlug].split(",")[0].replace(/^là /, "")}.`,
        description, stock: p.stock, lowStockThreshold: price > 5_000_000 ? 5 : 10,
        thumbnail: p.thumbnail, images: JSON.stringify(p.images), specs: JSON.stringify(specs),
        tags: (p.tags ?? []).join(","), weight: p.weight * 100, warranty,
        isFeatured: p.rating >= 4.5 || rnd() < 0.08, views: randInt(50, 3000),
        categoryId: cat.id, brandId,
        createdAt: new Date(Date.now() - randInt(30, 365) * 86400000),
      },
      meta: { slug, price, cat: p.category, parent: cat.parentSlug, title: name, reviews: p.reviews },
    });
  }
  const created = await prisma.product.createManyAndReturn({ data: rows.map((r) => r.data), select: { id: true, slug: true } });
  const idBySlug = new Map(created.map((c) => [c.slug, c.id]));
  for (const r of rows) products.push({ id: idBySlug.get(r.meta.slug)!, price: r.meta.price, cat: r.meta.cat, parent: r.meta.parent, title: r.meta.title, reviews: r.meta.reviews });

  console.log("👤 Người dùng...");
  const pass = await bcrypt.hash("123456", 10);
  await prisma.user.create({ data: { email: "admin@vietmart.vn", password: await bcrypt.hash("admin123", 10), name: "Quản trị viên", role: "ADMIN", phone: "0901000001" } });
  await prisma.user.create({ data: { email: "nhanvien@vietmart.vn", password: pass, name: "Nhân viên kho", role: "STAFF", phone: "0901000002" } });
  const demo = await prisma.user.create({
    data: {
      email: "khach@vietmart.vn", password: pass, name: "Nguyễn Minh Tuấn", phone: "0912345678",
      addresses: { create: { fullName: "Nguyễn Minh Tuấn", phone: "0912345678", province: "TP. Hồ Chí Minh", district: "Quận 1", ward: "Phường Bến Nghé", street: "12 Lê Lợi", isDefault: true } },
    },
  });
  const customers = [demo];
  for (let i = 0; i < 60; i++) {
    const name = `${pick(HO)} ${pick(DEM)} ${pick(TEN)}`;
    const a = pick(ADDR);
    const phone = "09" + String(randInt(10000000, 99999999));
    customers.push(await prisma.user.create({
      data: {
        email: `${slugify(name).replace(/-/g, ".")}${i}@gmail.com`, password: pass, name, phone,
        createdAt: new Date(Date.now() - randInt(1, 200) * 86400000),
        addresses: { create: { fullName: name, phone, province: a[0], district: a[1], ward: a[2], street: `${randInt(1, 300)} ${pick(STREETS)}`, isDefault: true } },
      },
    }));
  }

  console.log("🧾 Đơn hàng lịch sử...");
  const byParent = new Map<string, typeof products>();
  for (const p of products) byParent.set(p.parent, [...(byParent.get(p.parent) ?? []), p]);
  // các cặp hay mua kèm -> để thuật toán "thường mua cùng" có dữ liệu
  const findP = (t: string) => products.find((p) => p.title.toLowerCase().includes(t.toLowerCase()));
  const COMBOS = [
    ["iPhone 13 Pro", "Apple Airpods", "Apple MagSafe Battery Pack"], ["iPhone X", "Apple iPhone Charger", "iPhone 12 Silicone Case"],
    ["Samsung Galaxy S10", "Beats Flex"], ["MacBook Pro", "Apple AirPods Max", "Apple Airpower"], ["Dell XPS", "Selfie Lamp"],
    ["Gạo ST25", "Dầu ăn", "Trứng gà"], ["Thăn bò", "Khoai tây", "Hành tím"], ["Sữa tươi", "Cà phê Nescafé", "Mật ong"],
    ["Chảo chống dính", "Sạn tre", "Kẹp gắp"], ["Bóng tennis", "Vợt tennis"], ["Gậy golf", "Bóng golf"], ["Son môi đỏ", "Bảng phấn mắt", "Sơn móng tay"],
    ["Nike Air Jordan", "Áo sơ mi caro nam"], ["Đầm dạ hội đen", "Giày cao gót", "Bông tai pha lê"], ["Gucci Bloom", "Prada Women Bag"],
  ].map((c) => c.map(findP).filter(Boolean) as typeof products);

  const parents = [...byParent.keys()];
  const STATUS_FLOW = ["PENDING", "CONFIRMED", "SHIPPING", "DELIVERED"];
  const soldMap = new Map<number, number>();
  let orderNo = 0;
  // Gom lệnh rồi chạy song song theo lô -> nhanh hơn nhiều khi CSDL ở xa (Neon/Supabase)
  const addrByUser = new Map((await prisma.address.findMany({ orderBy: { id: "asc" } })).reverse().map((a) => [a.userId, a]));
  const orderJobs: (() => Promise<unknown>)[] = [];
  for (let i = 0; i < 520; i++) {
    const user = i < 12 ? demo : pick(customers);
    const daysAgo = Math.floor(Math.pow(rnd(), 1.4) * 120);
    const createdAt = new Date(Date.now() - daysAgo * 86400000 - randInt(0, 86399) * 1000);
    let items: typeof products;
    if (rnd() < 0.45) {
      const combo = pick(COMBOS);
      items = combo.slice(0, randInt(2, combo.length));
    } else {
      const group = byParent.get(pick(parents))!;
      const n = randInt(1, 3);
      items = [...new Set(Array.from({ length: n }, () => pick(group)))];
    }
    const lines = items.map((p) => ({ p, qty: p.price > 3_000_000 ? 1 : randInt(1, 3) }));
    const subtotal = lines.reduce((s, l) => s + l.p.price * l.qty, 0);
    const shippingFee = subtotal >= 500_000 ? 0 : 30_000;
    const total = subtotal + shippingFee;
    let status: string;
    if (daysAgo > 7) status = rnd() < 0.88 ? "DELIVERED" : rnd() < 0.8 ? "CANCELLED" : "RETURNED";
    else if (daysAgo > 3) status = pick(["SHIPPING", "DELIVERED", "DELIVERED", "CANCELLED"]);
    else status = pick(["PENDING", "PENDING", "CONFIRMED", "SHIPPING"]);
    const paymentMethod = pick(["COD", "COD", "VNPAY", "VNPAY"]);
    const paid = paymentMethod !== "COD" ? status !== "CANCELLED" || rnd() < 0.3 : status === "DELIVERED";
    const addr = addrByUser.get(user.id);
    const history: { status: string; note: string; createdAt: Date }[] = [];
    if (status === "CANCELLED") history.push({ status: "PENDING", note: "Đặt hàng thành công", createdAt }, { status: "CANCELLED", note: "Khách hủy đơn", createdAt: new Date(+createdAt + 3600_000) });
    else {
      const end = status === "RETURNED" ? 4 : STATUS_FLOW.indexOf(status) + 1;
      const notes = ["Đặt hàng thành công", "Shop đã xác nhận đơn", "Đã bàn giao cho đơn vị vận chuyển", "Giao hàng thành công"];
      for (let k = 0; k < end; k++) history.push({ status: STATUS_FLOW[k], note: notes[k], createdAt: new Date(+createdAt + k * 20 * 3600_000) });
      if (status === "RETURNED") history.push({ status: "RETURNED", note: "Khách trả hàng", createdAt: new Date(+createdAt + 5 * 86400_000) });
    }
    orderNo++;
    const code = `VM${createdAt.toISOString().slice(2, 10).replace(/-/g, "")}${String(orderNo).padStart(4, "0")}`;
    orderJobs.push(() => prisma.order.create({
      data: {
        code,
        userId: user.id, status, paymentMethod, paymentStatus: paid ? (status === "RETURNED" ? "REFUNDED" : "PAID") : "UNPAID",
        subtotal, shippingFee, total, fullName: user.name, phone: user.phone ?? "0900000000",
        address: addr ? `${addr.street}, ${addr.ward}, ${addr.district}, ${addr.province}` : "TP. Hồ Chí Minh",
        paidAt: paid ? createdAt : null, transactionId: paid && paymentMethod !== "COD" ? String(randInt(10000000, 99999999)) : null,
        createdAt, updatedAt: history[history.length - 1].createdAt,
        items: { create: lines.map((l) => ({ productId: l.p.id, name: l.p.title, thumbnail: "", price: l.p.price, quantity: l.qty })) },
        history: { create: history },
      },
    }));
    if (status === "DELIVERED") for (const l of lines) soldMap.set(l.p.id, (soldMap.get(l.p.id) ?? 0) + l.qty);
  }
  await inBatches(orderJobs);
  // điền thumbnail cho order item
  await prisma.$executeRaw`UPDATE "OrderItem" SET "thumbnail" = p."thumbnail" FROM "Product" p WHERE "OrderItem"."productId" = p."id"`;

  console.log("⭐ Đánh giá...");
  const reviewRows: { userId: number; productId: number; rating: number; comment: string; createdAt: Date }[] = [];
  const productJobs: (() => Promise<unknown>)[] = [];
  for (const p of products) {
    const reviewers = new Set<number>();
    const extra = p.reviews.length ? randInt(0, 4) : randInt(3, 10);
    const list = [...p.reviews, ...Array.from({ length: extra }, () => ({ rating: pick([4, 5, 5, 5, 3]), comment: pick(["Very satisfied!", "Great product!", "Fast shipping!", "Would buy again!", "Great value for money!", "Giao hàng nhanh, đóng gói cẩn thận, rất ưng ý.", "Hàng đúng mô tả, chất lượng tốt so với giá tiền.", "Mua lần thứ 2 rồi, vẫn rất hài lòng.", "Shop tư vấn nhiệt tình, dùng rất ổn.", "Sản phẩm đẹp, y như hình, sẽ giới thiệu bạn bè."]) }))];
    let sum = 0, cnt = 0;
    for (const r of list) {
      let u = pick(customers.slice(1));
      while (reviewers.has(u.id)) u = pick(customers.slice(1));
      reviewers.add(u.id);
      reviewRows.push({ userId: u.id, productId: p.id, rating: r.rating, comment: REVIEW_VI[r.comment] ?? r.comment, createdAt: new Date(Date.now() - randInt(1, 90) * 86400000) });
      sum += r.rating; cnt++;
    }
    const data = { rating: cnt ? Math.round((sum / cnt) * 10) / 10 : 0, ratingCount: cnt, sold: (soldMap.get(p.id) ?? 0) + randInt(5, 400) };
    productJobs.push(() => prisma.product.update({ where: { id: p.id }, data }));
  }
  await prisma.review.createMany({ data: reviewRows });
  await inBatches(productJobs);

  console.log("📦 Nhật ký kho ban đầu...");
  await prisma.inventoryLog.createMany({
    data: (await prisma.product.findMany()).map((p) => ({ productId: p.id, change: p.stock, stockAfter: p.stock, type: "IMPORT", note: "Tồn kho đầu kỳ", actor: "system", createdAt: p.createdAt })),
  });

  console.log("🎟️  Mã giảm giá...");
  const in30 = new Date(Date.now() + 30 * 86400000);
  await prisma.coupon.createMany({
    data: [
      { code: "CHAOBANMOI", description: "Giảm 50K cho đơn từ 200K - khách hàng mới", type: "FIXED", value: 50_000, minOrder: 200_000, endsAt: in30 },
      { code: "GIAM10", description: "Giảm 10% tối đa 100K cho đơn từ 300K", type: "PERCENT", value: 10, maxDiscount: 100_000, minOrder: 300_000, perUserLimit: 3, endsAt: in30 },
      { code: "FREESHIP", description: "Miễn phí vận chuyển cho mọi đơn hàng", type: "FREESHIP", value: 0, minOrder: 0, perUserLimit: 5, endsAt: in30 },
      { code: "SALE11", description: "Siêu sale 11.11 - giảm 15% tối đa 500K cho đơn từ 2 triệu", type: "PERCENT", value: 15, maxDiscount: 500_000, minOrder: 2_000_000, usageLimit: 100, perUserLimit: 1, endsAt: new Date("2026-11-30") },
      { code: "TECH1TR", description: "Giảm 1 triệu cho đơn đồ công nghệ từ 15 triệu", type: "FIXED", value: 1_000_000, minOrder: 15_000_000, usageLimit: 50, endsAt: in30 },
    ],
  });

  console.log(`✅ Xong: ${products.length} sản phẩm, ${customers.length} khách hàng, ${orderNo} đơn hàng.`);
}

/** Chạy các lệnh song song theo lô 10 lệnh một lần. */
async function inBatches(jobs: (() => Promise<unknown>)[], size = 10) {
  for (let i = 0; i < jobs.length; i += size) await Promise.all(jobs.slice(i, i + size).map((j) => j()));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
