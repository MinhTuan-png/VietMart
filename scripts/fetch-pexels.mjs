// Gắn ảnh thật (kho ảnh Pexels, miễn phí) cho các sản phẩm còn dùng ảnh minh họa .svg.
// Ảnh khớp theo LOẠI hàng (đầm, túi, nước hoa...) chứ không phải đúng từng model.
// Cách chạy (cần key miễn phí tại https://www.pexels.com/api/):
//   PowerShell:  $env:PEXELS_API_KEY="key-cua-ban"; node scripts/fetch-pexels.mjs
// Hoặc dùng Pixabay (key miễn phí tại https://pixabay.com/api/docs/):
//   PowerShell:  $env:PIXABAY_API_KEY="key-cua-ban"; node scripts/fetch-pexels.mjs
// Xong chạy: npm run setup.  Chạy lại an toàn: sản phẩm đã có ảnh .jpg được giữ nguyên.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const JSON_PATH = path.join(ROOT, "prisma/data/extra-products.json");
const OUT_DIR = path.join(ROOT, "public/products");
const PIXABAY = process.env.PIXABAY_API_KEY;
const KEY = process.env.PEXELS_API_KEY || process.argv[2];
const WANT = 3;

const strip = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

// [regex trên tên sản phẩm đã bỏ dấu, từ khóa tìm ảnh]; luật đầu tiên khớp sẽ được dùng.
const RULES = {
  smartphones: [[/./, "smartphone"]],
  tablets: [[/./, "tablet computer"]],
  laptops: [[/./, "laptop on desk"]],
  "mobile-accessories": [
    [/tai nghe/, "headphones"], [/\bloa\b/, "bluetooth speaker"], [/sac du phong|pin/, "power bank"], [/cap sac|\bcap\b/, "usb cable"],
    [/sac nhanh|\bsac\b/, "phone charger"], [/./, "phone case"],
  ],
  "mens-shirts": [
    [/hoodie/, "hoodie"], [/khoac|bomber/, "men jacket"], [/\blen\b/, "men sweater"], [/vest|blazer/, "men blazer"],
    [/so mi/, "men dress shirt"], [/polo/, "polo shirt"], [/./, "men t-shirt"],
  ],
  "mens-shoes": [
    [/da bong/, "football boots"], [/chay bo/, "running shoes"], [/boot/, "men boots"], [/sandal|dep/, "men sandals"],
    [/oxford|loafer|luoi|\bda\b/, "men leather shoes"], [/./, "sneakers"],
  ],
  "mens-watches": [[/apple watch|galaxy watch|garmin|huawei/, "smartwatch"], [/./, "men wristwatch"]],
  "womens-watches": [[/apple watch|galaxy watch|huawei/, "smartwatch"], [/./, "women wristwatch"]],
  sunglasses: [[/./, "sunglasses"]],
  tops: [
    [/da hoi|da tiec|cuoi|cocktail|bridesmaid|du tiec/, "evening gown"], [/\bbau\b/, "maternity dress"], [/chan vay|but chi/, "pencil skirt"],
    [/\bvay\b/, "skirt"], [/./, "women dress"],
  ],
  "womens-dresses": [[/da hoi|da tiec|cuoi|cocktail|bridesmaid|du tiec/, "evening gown"], [/./, "women dress"]],
  "womens-shoes": [
    [/cao got/, "high heels"], [/boot/, "women boots"], [/sandal|quai/, "women sandals"], [/\bdep\b|suc/, "slide sandals"],
    [/bup be|mary|mule/, "ballet flats"], [/./, "women sneakers"],
  ],
  "womens-bags": [[/balo/, "backpack"], [/\bvi\b/, "wallet"], [/tote|canvas/, "tote bag"], [/coi/, "straw bag"], [/./, "handbag"]],
  "womens-jewellery": [
    [/nhan/, "ring jewelry"], [/bong tai/, "earrings"], [/day chuyen|vong co|choker|mat day/, "necklace"], [/lac|vong tay/, "bracelet"],
    [/kep toc/, "hair clip"], [/./, "jewelry"],
  ],
  beauty: [
    [/\bson\b/, "lipstick"], [/mat\b|mascara|ke may|chi ke|\bmi\b/, "eye makeup"], [/\bco\b|\bmut\b/, "makeup brushes"], [/mong/, "nail polish"],
    [/./, "makeup cosmetics"],
  ],
  "skin-care": [
    [/chong nang/, "sunscreen"], [/rua mat|tay trang/, "facial cleanser"], [/serum|toner|nuoc hoa hong/, "serum bottle"], [/mat na/, "face mask skincare"],
    [/dau goi|dau xa/, "shampoo"], [/sua tam|duong the|duong tay/, "body lotion"], [/./, "skincare cream"],
  ],
  fragrances: [[/./, "perfume bottle"]],
  "home-decoration": [
    [/\bden\b/, "table lamp"], [/tranh|khung anh/, "wall art frame"], [/dong ho/, "wall clock"], [/guong/, "round mirror decor"], [/binh|lo hoa/, "vase flowers"],
    [/\bcay\b/, "indoor plant"], [/tham/, "rug living room"], [/\brem\b/, "curtains"], [/goi|chan ga/, "bedding pillows"], [/nen thom/, "scented candle"],
    [/tinh dau/, "essential oil diffuser"], [/./, "home decor"],
  ],
  furniture: [
    [/sofa|ghe banh/, "sofa living room"], [/trang diem/, "vanity table"], [/ban tra/, "coffee table"], [/ban lam viec|ban hoc/, "desk office"], [/ghe van phong|gaming/, "office chair"],
    [/giuong|dem/, "bed bedroom"], [/tu quan ao|tu giay|tu tv|tu dau/, "wardrobe"], [/ke sach|\bke\b/, "bookshelf"], [/ban an|ghe an/, "dining table"],
    [/./, "furniture"],
  ],
  "sports-accessories": [
    [/bong/, "exercise ball"], [/yoga/, "yoga mat"], [/\bta\b/, "dumbbell"], [/day nhay/, "jump rope"], [/binh nuoc/, "sports water bottle"], [/gang/, "gym gloves"],
    [/khang luc/, "resistance band"], [/vot/, "badminton racket"], [/./, "fitness equipment"],
  ],
};

export const queryFor = (p) => {
  const rules = RULES[p.category] ?? [[/./, p.category.replace(/-/g, " ")]];
  const t = strip(p.title);
  return rules.find(([re]) => re.test(t))[1];
};

async function searchPixabay(q) {
  const u = new URL("https://pixabay.com/api/");
  u.search = new URLSearchParams({ key: PIXABAY, q, image_type: "photo", per_page: "40", safesearch: "true", order: "popular" });
  const r = await fetch(u);
  if (r.status === 400 || r.status === 401) throw new Error("API key Pixabay không hợp lệ");
  if (r.status === 429) throw new Error("Pixabay báo hết lượt, chờ một lúc rồi chạy lại");
  if (!r.ok) return [];
  return ((await r.json()).hits ?? []).map((h) => h.webformatURL.replace("_640", "_960"));
}

async function searchPexels(q) {
  const u = new URL("https://api.pexels.com/v1/search");
  u.search = new URLSearchParams({ query: q, per_page: "40", orientation: "square" });
  const r = await fetch(u, { headers: { Authorization: KEY } });
  if (r.status === 401 || r.status === 403) throw new Error("API key Pexels không hợp lệ");
  if (r.status === 429) throw new Error("Pexels báo hết lượt, chờ một lúc rồi chạy lại");
  if (!r.ok) return [];
  const j = await r.json();
  return (j.photos ?? []).map((p) => p.src.large);
}

async function download(url, file) {
  let r = await fetch(url);
  if (!r.ok && url.includes("_960")) r = await fetch(url.replace("_960", "_640"));
  if (!r.ok) return false;
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  return true;
}

if (process.argv[1] === import.meta.filename) {
  if (!KEY && !PIXABAY) {
    console.error('Thiếu key. Chạy:  $env:PIXABAY_API_KEY="key-cua-ban"; node scripts/fetch-pexels.mjs');
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const products = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
  const cache = new Map(); // query -> danh sách url
  const used = new Map(); // query -> số ảnh đã dùng (để mỗi sản phẩm một ảnh khác nhau)
  let ok = 0;
  let miss = 0;
  for (const p of products) {
    if (p.thumbnail?.endsWith(".jpg")) {
      ok++;
      continue;
    }
    const q = queryFor(p);
    if (!cache.has(q)) cache.set(q, await (PIXABAY ? searchPixabay(q) : searchPexels(q)));
    const urls = cache.get(q);
    const start = used.get(q) ?? 0;
    const saved = [];
    for (let k = 0; k < WANT && urls.length; k++) {
      const rel = `/products/${p.id}-${k + 1}.jpg`;
      if (await download(urls[(start + k) % urls.length], path.join(ROOT, "public", rel))) saved.push(rel);
    }
    used.set(q, start + WANT);
    if (saved.length) {
      p.thumbnail = saved[0];
      p.images = saved;
      ok++;
    } else {
      miss++;
    }
    console.log(`${p.id} ${saved.length ? "OK " : "---"} [${q}] ${p.title}`);
    fs.writeFileSync(JSON_PATH, JSON.stringify(products, null, 2));
  }
  console.log(`Xong: ${ok} có ảnh thật, ${miss} giữ ảnh minh họa. Giờ chạy: npm run setup`);
}
