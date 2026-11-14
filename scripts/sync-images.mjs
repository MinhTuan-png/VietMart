// Tải ảnh sản phẩm cho 75 sản phẩm Thời trang nam (bản thông minh), lưu vào public/products/{id}-1..3.jpg (GHI ĐÈ ảnh cũ).
// Cách làm: dịch tên tiếng Việt sang từ khóa tiếng Anh (bảng EN bên dưới), hiểu loại hàng từ tên (đồng hồ / kính mát / giày / áo...), tìm nhiều truy vấn từ cụ thể đến chung,
// chỉ nhận ảnh có tag đúng loại hàng, loại ảnh có người/động vật/phong cảnh, và không dùng lại 1 ảnh cho 2 sản phẩm.
// Chạy (PowerShell):  $env:PIXABAY_API_KEY="key-cua-ban"; node scripts/fetch-thoi-trang-nam.mjs
// Xong chạy:           node scripts/sync-images.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const KEY = process.env.PIXABAY_API_KEY;
const IDS = new Set([1063,1064,1065,1066,1068,1069,1071,1072,1073,1074,1075,1076,1077,1078,1079,1080,1081,1082,1083,1084,1085,1086,1087,1088,1089,1090,1091,1092,1093,1094,1095,1096,1097,1098,1099,1100,1101,1102,1103,1104,1105,1106,1107,1108,1109,1110,1111,1112,1113,1114,1115,1116,1117,1118,1119,1120,1121,1122,1123,1125,1126,1128,1129,1130,1131,1132,1133,1134,1135,1136,1137,1138,1139,1140,1141]);
const OUT = path.join(ROOT, "public", "products");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
if (!KEY) {
  console.error('Thiếu key. Chạy:  $env:PIXABAY_API_KEY="key-cua-ban"; node scripts/fetch-thoi-trang-nam.mjs');
  process.exit(1);
}

// Tag chứa các từ này => ảnh có người / động vật / cảnh => loại
const BAD = new Set(["man", "men", "woman", "women", "people", "person", "girl", "boy", "child", "children", "kid", "kids", "baby", "portrait", "face", "couple", "crowd", "group", "friends", "family", "male", "female", "model", "smile", "lady", "guy", "dog", "cat", "animal", "horse", "horses", "riding", "rider", "equestrian", "landscape", "mountain", "sunset", "beach", "party", "wedding", "toast", "drink", "wine", "beer", "bar", "restaurant", "city", "street", "building", "hand", "hands", "running", "runner", "jogging", "athlete", "sport", "sports", "player", "cyclist", "bicycle", "bike"]);
// Ngoại lệ: các từ trong BAD được phép với loại hàng này (vd "running" cho giày chạy bộ)
const TYPES = [
  { re: /apple watch|galaxy watch|huawei watch|garmin|smartwatch/, must: ["smartwatch", "watch", "wearable", "fitness tracker"], allow: [], q: ["smartwatch isolated", "smartwatch white background", "smart watch", "smartwatch"] },
  { re: /dong ho|watch|rolex|longines|seiko|casio|tissot|titan|mido|orient|hamilton|citizen|skagen|daniel wellington|g-shock/, must: ["watch", "wristwatch", "wrist watch", "timepiece", "watches"], allow: [], q: ["wristwatch isolated", "wristwatch white background", "men wristwatch", "watch close up", "wristwatch"] },
  { re: /kinh|sunglass/, must: ["sunglasses", "glasses", "eyewear", "sun glasses", "shades", "spectacles"], allow: [], q: ["sunglasses isolated", "sunglasses white background", "sunglasses product", "sunglasses"] },
  { re: /da bong|cleats|mercurial|football/, must: ["football boots", "soccer", "cleats", "boots", "football shoes", "shoes"], allow: ["sport", "sports", "player"], q: ["football boots isolated", "soccer cleats", "football boots"] },
  { re: /chay bo|running|pegasus|kayano|gowalk|ultraboost|air max/, must: ["running shoes", "sneakers", "shoes", "sneaker", "trainers", "footwear"], allow: ["running", "runner", "sport", "sports"], q: ["running shoes isolated", "sneakers white background", "running shoes", "sneakers"] },
  { re: /dep|sandal|adilette|quai/, must: ["sandals", "sandal", "slippers", "flip flops", "footwear"], allow: [], q: ["sandals isolated", "slippers white background", "sandals"] },
  { re: /oxford.*da|giay da|loafer|luoi|chelsea|boot|dr\.martens|martens/, must: ["leather shoes", "shoes", "boots", "boot", "leather", "footwear", "oxford"], allow: [], q: ["leather shoes isolated", "men leather shoes", "leather boots", "leather shoes"] },
  { re: /giay|sneaker|nike|adidas|puma|converse|vans|new balance|skechers|asics|biti|jordan|samba/, must: ["sneakers", "sneaker", "shoes", "shoe", "trainers", "footwear"], allow: [], q: ["sneakers isolated", "sneakers white background", "shoes product", "sneakers"] },
  { re: /polo/, must: ["polo shirt", "shirt", "clothing", "t-shirt", "apparel"], allow: [], q: ["polo shirt isolated", "polo shirt clothing", "polo shirt flat lay", "shirt clothing"] },
  { re: /hoodie|khoac|bomber|jacket/, must: ["jacket", "hoodie", "clothing", "coat", "sweatshirt", "apparel"], allow: [], q: ["jacket isolated", "hoodie clothing", "jacket on hanger", "jacket clothing"] },
  { re: /vest|blazer/, must: ["blazer", "suit", "jacket", "clothing", "apparel"], allow: [], q: ["blazer isolated", "suit jacket clothing", "blazer on hanger", "blazer"] },
  { re: /len|sweater/, must: ["sweater", "knitwear", "wool", "clothing", "jumper"], allow: [], q: ["sweater isolated", "knit sweater flat lay", "sweater clothing", "sweater"] },
  { re: /thun|tshirt|t-shirt|ba lo|tanktop|tank/, must: ["t-shirt", "tshirt", "shirt", "clothing", "apparel", "t shirt"], allow: [], q: ["t-shirt isolated", "t-shirt flat lay", "tshirt white background", "t-shirt clothing"] },
  { re: /so mi|shirt|ao /, must: ["shirt", "dress shirt", "clothing", "apparel", "plaid", "checkered"], allow: [], q: ["men shirt isolated", "shirt flat lay", "shirt on hanger", "shirt clothing", "shirt"] },
];
const typeOf = (title) => TYPES.find((t) => t.re.test(strip(title)));

// Từ khóa phụ theo chi tiết trong tên (thêm vào đầu danh sách truy vấn)
const EXTRA = [
  [/aviator|phi cong/, "aviator sunglasses"], [/wayfarer/, "wayfarer sunglasses"], [/mat meo|cat eye/, "cat eye sunglasses"], [/tron|round|vintage/, "round sunglasses"],
  [/the thao|doi xe|dap xe|oakley/, "sport sunglasses"], [/tre em|kids/, "kids sunglasses"], [/phan cuc|polaroid/, "polarized sunglasses"],
  [/da nau|day da/, "leather strap watch"], [/day thep|thep/, "steel watch"], [/jordan/, "air jordan sneakers"], [/converse|chuck/, "converse sneakers"],
  [/vans/, "vans sneakers"], [/denim|jeans/, "denim shirt"], [/flannel|caro|ke /, "plaid shirt"], [/hawaii/, "hawaiian shirt"], [/linen/, "linen shirt"],
  [/co lo/, "turtleneck sweater"], [/oxford.*dai tay|trang/, "white shirt"], [/henley/, "henley shirt"],
];

// Bảng dịch tên tiếng Việt -> từ khóa tiếng Anh (từ cụ thể đến chung); sau đó tự thêm các từ khóa chung theo loại hàng.
const EN = {
  1063: ["white oxford dress shirt", "men white long sleeve shirt"], 1064: ["navy blue linen shirt", "men linen short sleeve shirt"],
  1065: ["striped slim fit shirt", "men striped shirt"], 1066: ["red plaid flannel shirt", "red checkered shirt"],
  1068: ["pique polo shirt", "men polo shirt"], 1069: ["oversized graphic t-shirt", "printed t-shirt"],
  1071: ["crew neck t-shirt", "men crew neck t-shirt"], 1072: ["adidas polo shirt", "men polo shirt"],
  1073: ["black bomber jacket", "men bomber jacket"], 1074: ["waterproof windbreaker jacket", "men windbreaker jacket"],
  1075: ["fleece hoodie", "men hoodie with hood"], 1076: ["turtleneck sweater", "men turtleneck sweater"],
  1077: ["denim shirt", "men jeans shirt"], 1078: ["men gym tank top", "sleeveless gym shirt"],
  1079: ["henley long sleeve shirt", "men henley shirt"], 1080: ["men blazer jacket", "men suit blazer"],
  1081: ["hawaiian shirt", "tropical print shirt"], 1082: ["thermal long sleeve shirt", "men base layer shirt"],
  1083: ["white nike air force 1 sneakers", "white leather sneakers"], 1084: ["nike air max 270", "air max sneakers"],
  1085: ["nike pegasus running shoes", "running shoes"], 1086: ["adidas stan smith sneakers", "white tennis sneakers"],
  1087: ["adidas ultraboost running shoes", "adidas running shoes"], 1088: ["adidas samba sneakers", "adidas sneakers"],
  1089: ["puma suede classic sneakers", "puma sneakers"], 1090: ["converse chuck taylor high top", "high top canvas sneakers"],
  1091: ["vans old skool black white", "vans sneakers"], 1092: ["new balance 574 grey sneakers", "new balance sneakers"],
  1093: ["casual sneakers", "men sneakers"], 1094: ["men oxford leather shoes", "brown oxford shoes"],
  1095: ["men leather loafers", "brown loafers"], 1096: ["suede chelsea boots", "men chelsea boots"],
  1097: ["men strap sandals", "sport sandals"], 1098: ["adidas adilette slides", "slide sandals"],
  1099: ["skechers walking shoes", "walking shoes"], 1100: ["nike football boots", "soccer cleats"],
  1101: ["asics gel kayano running shoes", "asics running shoes"], 1102: ["dr martens 1460 boots", "black leather boots"],
  1103: ["casio g-shock watch", "digital analog watch black"], 1104: ["casio edifice chronograph watch", "men chronograph watch"],
  1105: ["steel bracelet watch men", "stainless steel wristwatch"], 1106: ["seiko 5 automatic watch", "automatic watch"],
  1107: ["orient bambino watch", "dress watch leather strap"], 1108: ["citizen eco-drive watch", "men eco drive watch"],
  1109: ["tissot prx watch", "tissot watch"], 1110: ["tissot gentleman watch", "swiss automatic watch"],
  1111: ["fossil chronograph watch", "fossil watch"], 1112: ["daniel wellington watch", "minimalist black watch"],
  1113: ["garmin forerunner gps watch", "gps running watch"], 1114: ["apple watch series 9", "apple watch"],
  1115: ["samsung galaxy watch classic", "galaxy watch smartwatch"], 1116: ["huawei watch gt smartwatch", "huawei smartwatch"],
  1117: ["skagen minimalist watch", "slim watch"], 1118: ["analog wristwatch men", "titan analog watch"],
  1119: ["hamilton khaki field watch", "field watch"], 1120: ["longines master collection watch", "luxury swiss watch"],
  1121: ["mido multifort watch", "automatic dress watch"],
  1122: ["ray-ban wayfarer sunglasses", "wayfarer sunglasses"], 1123: ["ray-ban aviator sunglasses", "aviator sunglasses gold"],
  1125: ["oakley holbrook sunglasses", "oakley sunglasses"], 1126: ["oakley radar sport sunglasses", "sport sunglasses"],
  1128: ["prada sunglasses", "designer sunglasses"], 1129: ["polarized sunglasses", "polaroid sunglasses"],
  1130: ["metal frame sunglasses", "police sunglasses"], 1131: ["carrera sunglasses", "aviator sunglasses"],
  1132: ["persol sunglasses", "tortoiseshell sunglasses"], 1133: ["lacoste sunglasses", "square sunglasses"],
  1134: ["cat eye sunglasses", "women cat eye sunglasses"], 1135: ["cycling sunglasses", "sport sunglasses"],
  1136: ["round vintage sunglasses", "round sunglasses"], 1137: ["kids sunglasses", "children sunglasses"],
  1138: ["mirrored aviator sunglasses", "aviator sunglasses"], 1139: ["oversized sunglasses", "women oversized sunglasses"],
  1140: ["tom ford sunglasses", "square sunglasses black"], 1141: ["maui jim sunglasses", "polarized sunglasses"],
};

const cache = new Map();
async function search(q) {
  if (cache.has(q)) return cache.get(q);
  const u = new URL("https://pixabay.com/api/");
  u.search = new URLSearchParams({ key: KEY, q, image_type: "photo", per_page: "60", safesearch: "true", min_width: "500" });
  let hits = [];
  for (let a = 0; a < 3; a++) {
    const r = await fetch(u);
    if (r.status === 429) { console.log("  (hết lượt, chờ 60 giây...)"); await sleep(60000); continue; }
    if (r.status === 400 || r.status === 401) throw new Error("API key Pixabay không hợp lệ");
    if (r.ok) hits = (await r.json()).hits ?? [];
    break;
  }
  cache.set(q, hits);
  await sleep(700);
  return hits;
}

const used = new Set(); // id ảnh Pixabay đã dùng cho sản phẩm khác
const tagsOf = (h) => h.tags.toLowerCase().split(",").map((s) => s.trim());
function ok(h, T) {
  const tags = tagsOf(h);
  const words = new Set(tags.flatMap((t) => t.split(/\s+/)));
  const hasType = T.must.some((m) => tags.includes(m) || words.has(m));
  if (!hasType) return false;
  for (const b of BAD) if (words.has(b) && !T.allow.includes(b)) return false;
  return true;
}
function score(h, T, brand, qwords) {
  const tags = tagsOf(h);
  const words = new Set(tags.flatMap((t) => t.split(/\s+/)));
  let s = 0;
  if (brand && words.has(brand)) s += 5;
  for (const w of qwords) if (words.has(w)) s += 1;
  for (const m of T.must) if (tags.includes(m)) s += 2;
  s += Math.min(2, h.likes ? Math.log10(h.likes + 1) : 0);
  return s;
}

const products = JSON.parse(fs.readFileSync(path.join(ROOT, "prisma/data/extra-products.json"), "utf8")).filter((p) => IDS.has(Number(p.id)));
fs.mkdirSync(OUT, { recursive: true });
const failed = [];
let done = 0;
for (const p of products) {
  const t = strip(p.title);
  const T = typeOf(p.title);
  if (!T) { failed.push(`${p.id} ${p.title} (không nhận ra loại hàng)`); console.log(`${p.id} --- ${p.title}`); continue; }
  const brand = strip(p.brand || "").split(/[^a-z0-9]+/).filter(Boolean)[0];
  const latin = p.title.split(/\s+/).filter((w) => !/[^\x00-\x7f]/.test(w) && w.length > 1);
  const queries = [];
  for (const q of EN[p.id] ?? []) queries.push(q, `${q} isolated`, `${q} white background`);
  for (const [re, q] of EXTRA) if (re.test(t)) queries.push(q, `${q} isolated`);
  queries.push(...T.q);
  console.log(`${p.id}: ${(EN[p.id] ?? [])[0] ?? "(theo loại hàng)"}`);
  const picked = [];
  for (const q of [...new Set(queries)]) {
    const qwords = q.toLowerCase().split(/\s+/);
    const cands = (await search(q)).filter((h) => !used.has(h.id) && !picked.some((x) => x.id === h.id) && ok(h, T));
    cands.sort((a, b) => score(b, T, brand, qwords) - score(a, T, brand, qwords));
    for (const h of cands) { picked.push(h); if (picked.length >= 3) break; }
    if (picked.length >= 3) break;
  }
  if (!picked.length) { failed.push(`${p.id} ${p.title}`); console.log(`${p.id} --- ${p.title}`); continue; }
  // xóa ảnh .jpg cũ của sản phẩm rồi ghi ảnh mới
  for (const f of fs.readdirSync(OUT)) if (new RegExp(`^${p.id}-\\d+\\.jpg$`, "i").test(f)) fs.unlinkSync(path.join(OUT, f));
  let saved = 0;
  for (const h of picked) {
    let r = await fetch(h.webformatURL.replace("_640", "_960"));
    if (!r.ok) r = await fetch(h.webformatURL);
    if (!r.ok) continue;
    saved++;
    fs.writeFileSync(path.join(OUT, `${p.id}-${saved}.jpg`), Buffer.from(await r.arrayBuffer()));
    used.add(h.id);
  }
  if (saved) done++; else failed.push(`${p.id} ${p.title}`);
  console.log(`${p.id} ${saved ? "OK " : "---"} (${saved} ảnh) ${p.title}  <- ${picked[0]?.tags}`);
}
console.log(`\nXong: ${done}/${products.length} sản phẩm có ảnh.`);
if (failed.length) console.log("Không tìm được ảnh (hãy tự lưu ảnh {id}-1.jpg cho các sản phẩm này):\n" + failed.join("\n"));
