// Tải ảnh sản phẩm cho các sản phẩm Thời trang nữ (đầm váy, giày, túi, trang sức, đồng hồ nữ), lưu vào public/products/{id}-1..3.jpg (GHI ĐÈ ảnh cũ).
// Cách làm: dịch tên tiếng Việt sang từ khóa tiếng Anh (bảng EN bên dưới), hiểu loại hàng từ tên (đồng hồ / kính mát / giày / áo...), tìm nhiều truy vấn từ cụ thể đến chung,
// chỉ nhận ảnh có tag đúng loại hàng, loại ảnh có người/động vật/phong cảnh, và không dùng lại 1 ảnh cho 2 sản phẩm.
// Chạy (PowerShell):  $env:PIXABAY_API_KEY="key-cua-ban"; node scripts/fetch-thoi-trang-nu.mjs
// Xong chạy:           node scripts/sync-images.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const KEY = process.env.PIXABAY_API_KEY;
const IDS = new Set([1142,1143,1144,1145,1146,1147,1148,1149,1150,1151,1152,1153,1154,1155,1156,1157,1158,1159,1160,1161,1162,1163,1164,1165,1166,1167,1168,1169,1170,1171,1172,1173,1174,1175,1176,1177,1178,1179,1180,1181,1182,1183,1184,1185,1186,1187,1188,1189,1190,1191,1192,1193,1194,1195,1196,1197,1198,1199,1200,1201,1202,1203,1204,1205,1206,1207,1208,1209,1210,1211,1212,1213,1214,1215,1216,1217,1218,1219,1220,1221,1222,1223,1224,1225,1226,1227,1228,1229,1230,1231,1232,1233,1234,1235,1236,1237,1238,1239,1240,1241,1242,1243,1244,1245,1246,1247,1248,1249,1250,1251,1252,1253,1254,1255,1256,1257,1258,1259,1260,1261,1262,1263]);
const OUT = path.join(ROOT, "public", "products");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
if (!KEY) {
  console.error('Thiếu key. Chạy:  $env:PIXABAY_API_KEY="key-cua-ban"; node scripts/fetch-thoi-trang-nu.mjs');
  process.exit(1);
}

// Tag chứa các từ này => ảnh có người / động vật / cảnh => loại
const BAD = new Set(["man", "men", "woman", "women", "people", "person", "girl", "boy", "child", "children", "kid", "kids", "baby", "portrait", "face", "couple", "crowd", "group", "friends", "family", "male", "female", "model", "smile", "lady", "guy", "dog", "cat", "animal", "horse", "horses", "riding", "rider", "equestrian", "landscape", "mountain", "sunset", "beach", "party", "wedding", "toast", "drink", "wine", "beer", "bar", "restaurant", "city", "street", "building", "hand", "hands", "running", "runner", "jogging", "athlete", "sport", "sports", "player", "cyclist", "bicycle", "bike"]);
// Ngoại lệ: các từ trong BAD được phép với loại hàng này (vd "running" cho giày chạy bộ)
const PEOPLE_OK = ["woman", "women", "girl", "model", "lady", "female", "fashion", "portrait", "smile", "face", "wedding", "party", "bride"];
const KID_OK = ["child", "children", "kid", "kids", "girl", "baby", "family"];
const TYPES = [
  { re: /apple watch|galaxy watch|huawei watch|fit 3/, must: ["smartwatch", "watch", "wearable", "fitness tracker"], allow: [], q: ["smartwatch isolated", "smartwatch white background", "smart watch", "smartwatch"] },
  { re: /dong ho/, must: ["watch", "wristwatch", "wrist watch", "timepiece", "watches"], allow: [], q: ["women wristwatch isolated", "women wristwatch white background", "women watch", "wristwatch"] },
  { re: /sandal|dep |crocs|birkenstock|mule|suc /, must: ["sandals", "sandal", "slippers", "clogs", "mules", "footwear", "shoes"], allow: [], q: ["women sandals isolated", "sandals white background", "women sandals", "sandals"] },
  { re: /cao got|louboutin/, must: ["high heels", "heels", "pumps", "stiletto", "shoes", "footwear"], allow: [], q: ["high heels isolated", "high heels white background", "high heels", "pumps shoes"] },
  { re: /bup be|mary jane/, must: ["ballet flats", "flats", "shoes", "footwear", "ballerina"], allow: [], q: ["ballet flats isolated", "flat shoes women", "ballet flats"] },
  { re: /boot/, must: ["boots", "boot", "ankle boots", "shoes", "footwear"], allow: [], q: ["ankle boots isolated", "women boots", "boots"] },
  { re: /giay|sneaker|adidas|converse|new balance|puma|vans|nike|asics|luoi/, must: ["sneakers", "sneaker", "shoes", "shoe", "trainers", "footwear", "loafers"], allow: ["running", "runner", "sport", "sports"], q: ["women sneakers isolated", "sneakers white background", "women shoes", "sneakers"] },
  { re: /nhan|ring/, must: ["ring", "rings", "jewelry", "jewellery", "diamond", "wedding ring"], allow: ["wedding", "hand", "hands"], q: ["ring jewelry isolated", "ring white background", "ring jewelry", "ring"] },
  { re: /bong tai/, must: ["earrings", "earring", "jewelry", "jewellery", "pearl"], allow: ["woman", "women", "girl", "model", "lady", "female"], q: ["earrings isolated", "earrings white background", "earrings jewelry", "earrings"] },
  { re: /day chuyen|vong co|choker|mat day|mat chu|pendant/, must: ["necklace", "pendant", "jewelry", "jewellery", "choker", "chain"], allow: [], q: ["necklace isolated", "necklace white background", "necklace jewelry", "necklace"] },
  { re: /lac |vong tay|trang suc|kep toc/, must: ["bracelet", "anklet", "jewelry", "jewellery", "bangle", "hair clip", "beads", "pearl"], allow: ["hand", "hands"], q: ["bracelet isolated", "bracelet white background", "bracelet jewelry", "jewelry"] },
  { re: /tui|balo|vi |clutch|card holder|vi$/, must: ["bag", "handbag", "purse", "backpack", "wallet", "tote", "clutch", "leather bag", "shoulder bag"], allow: [], q: ["handbag isolated", "handbag white background", "women handbag", "handbag"] },
  { re: /be gai|tutu/, must: ["dress", "skirt", "tutu", "ballet", "clothing", "princess"], allow: KID_OK.concat(PEOPLE_OK), q: ["girl dress", "kids tutu skirt", "tutu skirt"] },
  { re: /dam|vay|yem/, must: ["dress", "gown", "skirt", "evening gown", "dresses", "clothing", "wedding dress", "ball gown", "fashion"], allow: PEOPLE_OK, q: ["dress on mannequin", "dress isolated", "women dress", "dress fashion"] },
];
const typeOf = (title) => TYPES.find((t) => t.re.test(strip(title)));

// Bảng dịch tên tiếng Việt -> từ khóa tiếng Anh (từ cụ thể đến chung); sau đó tự thêm từ khóa chung theo loại hàng.
const EN = {
  1142: ["floral maxi dress beach", "maxi dress"],
  1143: ["square neck puff sleeve dress", "puff sleeve dress"],
  1144: ["high waist midi skirt", "a-line midi skirt"],
  1145: ["shirt dress belted long", "long shirt dress"],
  1146: ["beige pleated skirt", "pleated midi skirt"],
  1147: ["black bodycon dress", "bodycon dress"],
  1148: ["denim skirt a-line", "denim skirt"],
  1149: ["satin slip dress", "silk slip dress"],
  1150: ["pleated tennis skirt", "tennis skirt"],
  1151: ["knit turtleneck sweater dress", "knitted dress"],
  1152: ["girl tutu skirt", "tutu dress kids"],
  1153: ["off shoulder polka dot dress", "polka dot dress"],
  1154: ["pencil skirt office", "pencil skirt"],
  1155: ["denim pinafore dress", "dungarees dress"],
  1156: ["red vintage swing dress", "vintage red dress"],
  1157: ["silk nightgown", "satin nightdress"],
  1158: ["maternity dress", "pregnancy dress"],
  1159: ["short wedding dress", "white party dress"],
  1160: ["linen floral dress", "korean style dress"],
  1161: ["strapless evening dress", "strapless gown"],
  1162: ["red mermaid evening gown", "red evening gown"],
  1163: ["emerald green strapless gown", "green evening gown"],
  1164: ["black lace evening dress", "black lace gown"],
  1165: ["white princess ball gown", "white ball gown"],
  1166: ["pastel pink party dress", "pink cocktail dress"],
  1167: ["silver sequin evening gown", "sparkly silver dress"],
  1168: ["chiffon long sleeve maxi dress", "chiffon evening dress"],
  1169: ["one shoulder cocktail dress", "cocktail dress"],
  1170: ["slit evening gown", "evening dress with slit"],
  1171: ["purple velvet evening gown", "velvet dress"],
  1172: ["halter neck evening gown", "halter dress"],
  1173: ["vintage lace dress", "lace cocktail dress"],
  1174: ["gold beaded evening gown", "gold evening dress"],
  1175: ["navy blue v-neck evening gown", "blue evening gown"],
  1176: ["girl princess dress", "flower girl dress"],
  1177: ["sequin evening gown", "glitter gown"],
  1178: ["audrey hepburn black dress", "little black dress classic"],
  1179: ["mint green bridesmaid dress", "bridesmaid dress"],
  1180: ["long silk evening gown", "silk gown"],
  1181: ["black puff sleeve party dress", "black cocktail dress"],
  1182: ["black pointed toe high heels", "black pumps"],
  1183: ["ankle strap stiletto heels", "high heels sandals"],
  1184: ["leather ballet flats", "ballet flats"],
  1185: ["heeled sandals", "high heel sandals"],
  1186: ["nike air max women sneakers", "nike sneakers"],
  1187: ["adidas superstar sneakers", "adidas shell toe sneakers"],
  1188: ["converse chuck 70 sneakers", "converse sneakers"],
  1189: ["new balance 327 sneakers", "new balance sneakers"],
  1190: ["suede ankle boots women", "ankle boots"],
  1191: ["chunky loafers women", "platform loafers"],
  1192: ["crocs classic clog", "crocs clogs"],
  1193: ["puma cali sneakers", "puma platform sneakers"],
  1194: ["open back mule shoes", "mules shoes women"],
  1195: ["wedge sandals", "platform wedge sandals"],
  1196: ["asics gel nimbus running shoes", "women running shoes"],
  1197: ["vans authentic sneakers", "vans canvas shoes"],
  1198: ["red sole high heels", "designer high heels"],
  1199: ["mary jane flats", "mary jane shoes"],
  1200: ["birkenstock arizona sandals", "birkenstock sandals"],
  1201: ["yoga shoes", "non slip yoga shoes"],
  1202: ["leather handbag", "women leather handbag"],
  1203: ["mini crossbody bag chain", "chain strap bag"],
  1204: ["canvas tote bag printed", "canvas tote bag"],
  1205: ["waterproof women backpack", "fashion backpack"],
  1206: ["michael kors handbag", "leather satchel handbag"],
  1207: ["coach shoulder bag", "coach handbag"],
  1208: ["kate spade handbag", "designer handbag"],
  1209: ["suede bucket bag", "bucket bag"],
  1210: ["party clutch bag", "evening clutch"],
  1211: ["women leather wallet long", "leather wallet"],
  1212: ["sport waist bag", "fanny pack"],
  1213: ["baguette shoulder bag", "shoulder bag"],
  1214: ["mini leather backpack", "small leather backpack"],
  1215: ["laptop work bag women", "briefcase women"],
  1216: ["straw beach bag", "woven straw bag"],
  1217: ["large leather tote bag", "leather tote"],
  1218: ["soft leather hobo bag", "hobo bag"],
  1219: ["longchamp le pliage bag", "foldable nylon tote"],
  1220: ["mini card holder wallet", "leather card holder"],
  1221: ["nylon crossbody bag", "parachute crossbody bag"],
  1222: ["silver heart pendant necklace", "heart necklace"],
  1223: ["gold flower pendant necklace", "gold necklace"],
  1224: ["silver charm bracelet", "charm bracelet"],
  1225: ["freshwater pearl bracelet", "pearl bracelet"],
  1226: ["silver cubic zirconia ring", "silver ring"],
  1227: ["diamond ring white gold", "diamond engagement ring"],
  1228: ["small silver hoop earrings", "silver hoop earrings"],
  1229: ["akoya pearl earrings", "pearl earrings"],
  1230: ["14k gold hoop earrings", "gold hoop earrings"],
  1231: ["pearl choker necklace", "pearl necklace"],
  1232: ["silver initial letter necklace", "letter pendant necklace"],
  1233: ["silver anklet bells", "anklet"],
  1234: ["silver couple rings", "matching rings"],
  1235: ["pearl hair clip", "hair clip"],
  1236: ["bridal jewelry set", "wedding jewelry set"],
  1237: ["swarovski crystal necklace", "crystal necklace"],
  1238: ["teardrop crystal earrings", "crystal drop earrings"],
  1239: ["plain gold ring", "gold ring"],
  1240: ["gold bracelet 18k", "gold bracelet"],
  1241: ["buddha pendant jade", "jade pendant"],
  1242: ["rose quartz necklace", "rose quartz pendant"],
  1243: ["feng shui bracelet", "bead bracelet"],
  1244: ["casio women watch", "small women watch silver"],
  1245: ["casio baby-g watch", "baby g women watch"],
  1246: ["daniel wellington petite watch", "minimalist women watch"],
  1247: ["fossil women watch", "women leather watch"],
  1248: ["michael kors women watch", "rose gold women watch"],
  1249: ["tissot square women watch", "swiss women watch"],
  1250: ["orient women watch", "women dress watch"],
  1251: ["citizen women watch", "women eco drive watch"],
  1252: ["seiko women automatic watch", "women automatic watch"],
  1253: ["mvmt classic watch", "minimalist watch"],
  1254: ["skagen women watch", "mesh strap watch"],
  1255: ["apple watch se", "apple watch women"],
  1256: ["samsung galaxy watch women", "galaxy watch"],
  1257: ["huawei watch fit", "fitness tracker watch"],
  1258: ["swarovski crystal watch", "crystal women watch"],
  1259: ["titan women watch", "gold women watch"],
  1260: ["longines dolcevita women watch", "luxury women watch"],
  1261: ["rose gold mesh watch", "rose gold women watch"],
  1262: ["anne klein women watch", "diamond women watch"],
  1263: ["timex women watch", "classic women watch"],
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
