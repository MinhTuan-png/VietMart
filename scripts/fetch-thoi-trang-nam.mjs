// Tải ảnh thật (Pixabay, miễn phí) cho 75 sản phẩm Thời trang nam trong danh-sach-anh-thoi-trang-nam.md
// và lưu thành public/products/{id}-1.jpg, {id}-2.jpg, {id}-3.jpg.
// Mỗi sản phẩm tìm theo thương hiệu/model trước (vd "Rolex Datejust watch"); không có kết quả thì dùng từ khóa theo loại hàng.
// Chạy (PowerShell):  $env:PIXABAY_API_KEY="key-cua-ban"; node scripts/fetch-thoi-trang-nam.mjs
// Xong chạy:           node scripts/sync-images.mjs      (cập nhật database trỏ sang ảnh mới, không mất dữ liệu)
import fs from "node:fs";
import path from "node:path";
import { queryFor } from "./fetch-pexels.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const KEY = process.env.PIXABAY_API_KEY;
const IDS = new Set([1063,1064,1065,1066,1068,1069,1071,1072,1073,1074,1075,1076,1077,1078,1079,1080,1081,1082,1083,1084,1085,1086,1087,1088,1089,1090,1091,1092,1093,1094,1095,1096,1097,1098,1099,1100,1101,1102,1103,1104,1105,1106,1107,1108,1109,1110,1111,1112,1113,1114,1115,1116,1117,1118,1119,1120,1121,1122,1123,1125,1126,1128,1129,1130,1131,1132,1133,1134,1135,1136,1137,1138,1139,1140,1141]);
const OUT = path.join(ROOT, "public", "products");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
if (!KEY) { console.error('Thiếu key. Chạy:  $env:PIXABAY_API_KEY="key-cua-ban"; node scripts/fetch-thoi-trang-nam.mjs'); process.exit(1); }

const TYPE = { "mens-watches": "watch", sunglasses: "sunglasses", "mens-shoes": "shoes", "mens-shirts": "shirt" };
async function search(q) {
  const u = new URL("https://pixabay.com/api/");
  u.search = new URLSearchParams({ key: KEY, q, image_type: "photo", per_page: "20", safesearch: "true" });
  const r = await fetch(u);
  if (r.status === 429) { console.log("Hết lượt, chờ 60 giây..."); await sleep(60000); return search(q); }
  if (!r.ok) return [];
  return ((await r.json()).hits ?? []).map((h) => h.webformatURL.replace("_640", "_960"));
}
async function download(url, file) {
  let r = await fetch(url);
  if (!r.ok) r = await fetch(url.replace("_960", "_640"));
  if (!r.ok) return false;
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  return true;
}

const products = JSON.parse(fs.readFileSync(path.join(ROOT, "prisma/data/extra-products.json"), "utf8")).filter((p) => IDS.has(Number(p.id)));
fs.mkdirSync(OUT, { recursive: true });
const none = [];
let ok = 0;
for (const p of products) {
  // Từ khóa Latin (thương hiệu/model) + loại hàng
  const latin = p.title.split(/\s+/).filter((w) => !/[^\x00-\x7f]/.test(w) && w.length > 1).slice(0, 4).join(" ");
  const queries = [];
  if (latin.split(" ").length >= 2) queries.push(`${latin} ${TYPE[p.category] ?? ""}`.trim());
  queries.push(queryFor(p));
  let urls = [];
  for (const q of queries) { urls = await search(q); await sleep(700); if (urls.length) break; }
  let saved = 0;
  for (let k = 0; k < 3 && k < urls.length; k++) if (await download(urls[k], path.join(OUT, `${p.id}-${k + 1}.jpg`))) saved++;
  if (saved) ok++; else none.push(`${p.id} ${p.title}`);
  console.log(`${p.id} ${saved ? "OK " : "---"} ${p.title}`);
}
console.log(`Xong: ${ok}/${products.length} sản phẩm có ảnh.`);
if (none.length) console.log("Không tìm được ảnh:\n" + none.join("\n"));
