// Tải ảnh sản phẩm cho danh mục Làm đẹp & Sức khỏe (trang điểm, chăm sóc da/cơ thể, nước hoa), lưu vào public/products/{id}-1..3.jpg (GHI ĐÈ ảnh cũ).
// Cách làm: dịch tên tiếng Việt sang từ khóa tiếng Anh (bảng EN bên dưới), hiểu loại hàng từ tên (đồng hồ / kính mát / giày / áo...), tìm nhiều truy vấn từ cụ thể đến chung,
// chỉ nhận ảnh có tag đúng loại hàng, loại ảnh có người/động vật/phong cảnh, và không dùng lại 1 ảnh cho 2 sản phẩm.
// Chạy (PowerShell):  $env:PIXABAY_API_KEY="key-cua-ban"; node scripts/fetch-lam-dep.mjs
// Xong chạy:           node scripts/sync-images.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const KEY = process.env.PIXABAY_API_KEY;
const IDS = new Set([1264,1265,1266,1267,1268,1269,1270,1271,1272,1273,1274,1275,1276,1277,1278,1279,1280,1281,1282,1283,1284,1285,1286,1287,1288,1289,1290,1291,1292,1293,1294,1295,1296,1297,1298,1299,1300,1301,1302,1303,1304,1305,1306,1307,1308,1309,1310,1311,1312,1313,1314,1315,1316,1317,1318,1319,1320,1321,1322,1323,1324,1325]);
const OUT = path.join(ROOT, "public", "products");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
if (!KEY) {
  console.error('Thiếu key. Chạy:  $env:PIXABAY_API_KEY="key-cua-ban"; node scripts/fetch-lam-dep.mjs');
  process.exit(1);
}

// Tag chứa các từ này => ảnh có người / động vật / cảnh => loại
const BAD = new Set(["man", "men", "woman", "women", "people", "person", "girl", "boy", "child", "children", "kid", "kids", "baby", "portrait", "face", "couple", "crowd", "group", "friends", "family", "male", "female", "model", "smile", "lady", "guy", "dog", "cat", "animal", "horse", "horses", "riding", "rider", "equestrian", "landscape", "mountain", "sunset", "beach", "party", "wedding", "toast", "drink", "wine", "beer", "bar", "restaurant", "city", "street", "building", "hand", "hands", "running", "runner", "jogging", "athlete", "sport", "sports", "player", "cyclist", "bicycle", "bike"]);
// Ngoại lệ: các từ trong BAD được phép với loại hàng này (vd "running" cho giày chạy bộ)
const HAND_OK = ["hand", "hands", "woman", "women", "girl", "model", "lady", "female", "face", "smile", "portrait", "fashion"];
const TYPES = [
  { re: /nuoc hoa(?! hong)/, must: ["perfume", "fragrance", "bottle", "cologne", "perfume bottle", "cosmetics", "glass"], allow: [], q: ["perfume bottle isolated", "perfume bottle white background", "perfume bottle", "perfume"] },
  { re: /son (kem|thoi|duong|tint)|lip/, must: ["lipstick", "lip", "lip gloss", "makeup", "cosmetics", "lip balm", "lip tint"], allow: HAND_OK, q: ["lipstick isolated", "lipstick white background", "lipstick makeup", "lipstick"] },
  { re: /mascara|ke may|chi ke|kep mi|bang mat|mat \d|ke mat/, must: ["makeup", "mascara", "eyeliner", "eye shadow", "eyeshadow", "cosmetics", "eyelash", "eyebrow", "palette"], allow: HAND_OK, q: ["eye makeup isolated", "makeup white background", "eye makeup", "makeup cosmetics"] },
  { re: /co trang diem|mut|bo co|co /, must: ["makeup brush", "brushes", "makeup", "brush", "sponge", "cosmetics"], allow: HAND_OK, q: ["makeup brushes isolated", "makeup brushes", "makeup tools"] },
  { re: /mong|nail/, must: ["nail polish", "nail", "nails", "manicure", "cosmetics"], allow: HAND_OK.concat(["hand"]), q: ["nail polish isolated", "nail polish bottle", "nail polish"] },
  { re: /chong nang|sunscreen/, must: ["sunscreen", "sun cream", "cream", "lotion", "cosmetics", "skin care", "skincare", "tube"], allow: HAND_OK, q: ["sunscreen isolated", "sunscreen bottle", "sun cream", "skincare cream"] },
  { re: /dau goi|dau xa|sua tam|duong the|duong tay|kem duong tay/, must: ["shampoo", "conditioner", "bottle", "body lotion", "lotion", "soap", "shower gel", "cream", "cosmetics", "hair care", "tube", "bottles"], allow: HAND_OK, q: ["shampoo bottle isolated", "lotion bottle", "cosmetic bottle", "shampoo bottle"] },
  { re: /mat na/, must: ["mask", "face mask", "facial mask", "skin care", "skincare", "cosmetics", "cream"], allow: HAND_OK, q: ["face mask skincare", "sheet mask", "face mask"] },
  { re: /serum|toner|nuoc hoa hong|tay da chet|tay trang|rua mat|bioderma|gel lo hoi|lo hoi/, must: ["serum", "skin care", "skincare", "cosmetics", "bottle", "toner", "dropper", "cleanser", "aloe vera", "cream", "essential oil", "beauty"], allow: HAND_OK, q: ["skincare bottle isolated", "skincare serum bottle", "cosmetic bottle", "skincare"] },
  { re: /kem |phan |ma hong|highlight|xit khoa/, must: ["makeup", "cosmetics", "foundation", "powder", "cream", "blush", "beauty", "skin care", "skincare", "compact"], allow: HAND_OK, q: ["makeup isolated", "foundation makeup", "face powder", "makeup cosmetics"] },
];
const typeOf = (title) => TYPES.find((t) => t.re.test(strip(title)));

// Bảng dịch tên tiếng Việt -> từ khóa tiếng Anh (từ cụ thể đến chung); sau đó tự thêm từ khóa chung theo loại hàng.
const EN = {
  1264: ["lip tint", "liquid lipstick"],
  1265: ["matte lipstick red", "red lipstick"],
  1266: ["lip gloss", "lip balm"],
  1267: ["lip tint korean", "lip tint"],
  1268: ["cushion compact foundation", "cushion foundation"],
  1269: ["foundation bottle", "liquid foundation"],
  1270: ["face powder compact", "loose face powder"],
  1271: ["concealer", "concealer makeup"],
  1272: ["cream blush", "blush makeup"],
  1273: ["eyeshadow palette", "eye shadow palette"],
  1274: ["eyeliner pencil", "eyeliner"],
  1275: ["mascara", "mascara wand"],
  1276: ["eyebrow pencil", "brow pencil"],
  1277: ["highlighter makeup", "highlighter palette"],
  1278: ["makeup setting spray", "setting spray bottle"],
  1279: ["makeup brush set", "makeup brushes"],
  1280: ["makeup sponge", "beauty blender sponge"],
  1281: ["eyelash curler", "eyelash curler makeup"],
  1282: ["gel nail polish", "nail polish bottle"],
  1283: ["micellar water", "makeup remover"],
  1284: ["foaming facial cleanser", "face cleanser tube"],
  1285: ["gentle facial cleanser", "face wash bottle"],
  1286: ["toner bottle", "facial toner"],
  1287: ["facial toner bottle", "skincare toner"],
  1288: ["vitamin c serum", "serum dropper bottle"],
  1289: ["niacinamide serum", "serum dropper bottle"],
  1290: ["hyaluronic acid serum", "serum bottle"],
  1291: ["moisturizing cream jar", "face cream jar"],
  1292: ["water gel moisturizer", "face moisturizer"],
  1293: ["sunscreen tube", "sunscreen lotion"],
  1294: ["sunscreen tube", "sun cream"],
  1295: ["sunscreen bottle", "sunscreen spray"],
  1296: ["sheet face mask", "facial sheet mask"],
  1297: ["sleeping mask jar", "face mask jar"],
  1298: ["exfoliant bottle", "skincare bottle"],
  1299: ["eye cream jar", "eye cream"],
  1300: ["aloe vera gel", "aloe vera"],
  1301: ["shampoo bottle", "shampoo"],
  1302: ["body wash bottle", "shower gel bottle"],
  1303: ["hand cream tube", "hand cream"],
  1304: ["body lotion bottle", "body lotion"],
  1305: ["hair conditioner bottle", "conditioner"],
  1306: ["blue perfume bottle men", "men perfume bottle"],
  1307: ["men cologne bottle", "men perfume bottle"],
  1308: ["women perfume bottle gold", "women perfume bottle"],
  1309: ["floral perfume bottle", "women perfume bottle"],
  1310: ["men perfume bottle blue", "men perfume"],
  1311: ["unisex perfume bottle", "perfume bottle"],
  1312: ["men perfume bottle", "cologne bottle"],
  1313: ["men perfume torso bottle", "men perfume bottle"],
  1314: ["black perfume bottle women", "women perfume bottle"],
  1315: ["women perfume bottle", "perfume bottle pink"],
  1316: ["men perfume bottle", "aqua perfume bottle"],
  1317: ["black perfume bottle", "luxury perfume bottle"],
  1318: ["classic perfume bottle", "luxury perfume bottle"],
  1319: ["women perfume bottle", "perfume bottle"],
  1320: ["men perfume bottle gold", "gold perfume bottle"],
  1321: ["daisy perfume flower bottle", "women perfume bottle"],
  1322: ["women perfume bottle", "perfume bottle"],
  1323: ["perfume bottle label", "perfume bottle"],
  1324: ["pear perfume bottle", "perfume bottle glass"],
  1325: ["women perfume bottle pink", "perfume bottle"],
};
const EXTRA = [];

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
