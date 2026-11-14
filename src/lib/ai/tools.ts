/**
 * Bộ công cụ (tool calls) của Trợ lý AI quản trị.
 * - Công cụ ĐỌC chạy ngay.
 * - Công cụ GHI (đổi kho, giá, trạng thái đơn, mã giảm giá) phải được admin bấm "Xác nhận" trên giao diện
 *   trước khi thực thi (human-in-the-loop) và đều được ghi vào Nhật ký hoạt động (đánh dấu "qua AI").
 */
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { prisma } from "../db";
import { formatVND, ORDER_STATUS } from "../utils";
import { adjustStock, audit, changeOrderStatus, dashboardStats, findProducts, inventoryForecast, listOrders, patchProduct, resolveProduct, topCustomers, topProducts } from "../admin-ops";

export type Actor = { id: number; email: string; role: string };

type ToolDef = {
  name: string;
  description: string;
  input_schema: Anthropic.Tool["input_schema"];
  write?: boolean;
  schema: z.ZodTypeAny;
  /** Mô tả ngắn hành động (hiển thị trên thẻ xác nhận). */
  describe?: (input: never) => Promise<string> | string;
  run: (input: never, actor: Actor) => Promise<unknown>;
};

const def = <S extends z.ZodTypeAny>(t: Omit<ToolDef, "schema" | "run" | "describe"> & { schema: S; run: (i: z.infer<S>, a: Actor) => Promise<unknown>; describe?: (i: z.infer<S>) => Promise<string> | string }) => t as unknown as ToolDef;

const productRef = async (i: { product_id?: number; sku?: string }) => {
  const p = await resolveProduct({ id: i.product_id, sku: i.sku });
  return p ? `${p.name} (${p.sku}, tồn ${p.stock}, giá ${formatVND(p.price)})` : `sản phẩm #${i.product_id ?? i.sku}`;
};

export const TOOLS: ToolDef[] = [
  def({
    name: "get_dashboard_stats",
    description: "Lấy số liệu tổng quan cửa hàng trong N ngày gần nhất: doanh thu, lợi nhuận ước tính, số đơn, đơn hủy, giá trị đơn trung bình, khách mới, tăng trưởng so với kỳ trước, doanh thu theo ngày và theo ngành hàng, số sản phẩm hết hàng/sắp hết.",
    input_schema: { type: "object", properties: { days: { type: "integer", description: "Số ngày (mặc định 30)", minimum: 1, maximum: 365 } } },
    schema: z.object({ days: z.number().int().min(1).max(365).default(30) }),
    run: async ({ days }) => {
      const s = await dashboardStats(days);
      return { ...s, daily: s.daily.filter((d) => d.orders > 0).slice(-31) };
    },
  }),
  def({
    name: "get_sales_report",
    description: "Báo cáo bán hàng: top sản phẩm bán chạy (số lượng, doanh thu, tồn kho hiện tại) và top khách hàng chi tiêu nhiều nhất trong N ngày.",
    input_schema: { type: "object", properties: { days: { type: "integer", minimum: 1, maximum: 365 }, top_n: { type: "integer", minimum: 1, maximum: 50 } } },
    schema: z.object({ days: z.number().int().min(1).max(365).default(30), top_n: z.number().int().min(1).max(50).default(10) }),
    run: async ({ days, top_n }) => ({
      days,
      topProducts: (await topProducts(days, top_n)).map(({ thumbnail: _t, ...p }) => (void _t, p)),
      topCustomers: await topCustomers(days, Math.min(top_n, 10)),
    }),
  }),
  def({
    name: "search_products",
    description: "Tìm sản phẩm theo từ khóa (tên, SKU, thương hiệu), danh mục, ngưỡng tồn kho. Trả về id, tên, SKU, giá, tồn kho, đã bán, trạng thái. Dùng để tra id/SKU trước khi cập nhật.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Từ khóa tìm kiếm" },
        category_slug: { type: "string", description: "Slug danh mục, xem list_categories" },
        stock_below: { type: "integer", description: "Chỉ lấy sản phẩm có tồn kho <= giá trị này" },
        only_hidden: { type: "boolean", description: "Chỉ lấy sản phẩm đang ẩn" },
        sort: { type: "string", enum: ["recent", "stock", "sold"] },
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
    },
    schema: z.object({ query: z.string().optional(), category_slug: z.string().optional(), stock_below: z.number().int().optional(), only_hidden: z.boolean().optional(), sort: z.enum(["recent", "stock", "sold"]).optional(), limit: z.number().int().min(1).max(50).default(15) }),
    run: async (i) => findProducts(i.query, { categorySlug: i.category_slug, stockBelow: i.stock_below, active: i.only_hidden ? false : undefined, take: i.limit, sort: i.sort }),
  }),
  def({
    name: "get_product_detail",
    description: "Xem chi tiết 1 sản phẩm theo product_id hoặc SKU: giá bán/giá gốc/giá vốn, tồn kho, ngưỡng cảnh báo, số bán 30 ngày, đánh giá, 10 giao dịch kho gần nhất.",
    input_schema: { type: "object", properties: { product_id: { type: "integer" }, sku: { type: "string" } } },
    schema: z.object({ product_id: z.number().int().optional(), sku: z.string().optional() }),
    run: async (i) => {
      const p = await resolveProduct({ id: i.product_id, sku: i.sku });
      if (!p) throw new Error("Không tìm thấy sản phẩm");
      const since = new Date(Date.now() - 30 * 86400000);
      const [sold30, logs, cat] = await Promise.all([
        prisma.orderItem.aggregate({ where: { productId: p.id, order: { createdAt: { gte: since }, status: { not: "CANCELLED" } } }, _sum: { quantity: true } }),
        prisma.inventoryLog.findMany({ where: { productId: p.id }, orderBy: { createdAt: "desc" }, take: 10, select: { createdAt: true, type: true, change: true, stockAfter: true, note: true, actor: true } }),
        prisma.category.findUnique({ where: { id: p.categoryId }, select: { name: true } }),
      ]);
      const { description: _d, images: _im, specs: _s, ...rest } = p;
      void _d; void _im; void _s;
      return { ...rest, category: cat?.name, sold30d: sold30._sum.quantity ?? 0, url: `/p/${p.slug}`, inventoryLogs: logs };
    },
  }),
  def({
    name: "get_inventory_alerts",
    description: "Phân tích tồn kho & dự báo: mỗi sản phẩm có tồn kho, tốc độ bán/ngày (30 ngày), số ngày còn đủ hàng, mức rủi ro (HẾT HÀNG / CẦN NHẬP GẤP / SẮP CẦN NHẬP / ỔN ĐỊNH) và số lượng gợi ý nhập kèm chi phí nhập dự kiến.",
    input_schema: { type: "object", properties: { only_risk: { type: "boolean", description: "Chỉ lấy sản phẩm có rủi ro (mặc định true)" }, limit: { type: "integer", minimum: 1, maximum: 200 } } },
    schema: z.object({ only_risk: z.boolean().default(true), limit: z.number().int().min(1).max(200).default(30) }),
    run: async (i) => inventoryForecast({ onlyRisk: i.only_risk, take: i.limit }),
  }),
  def({
    name: "list_orders",
    description: "Liệt kê đơn hàng theo trạng thái (PENDING, CONFIRMED, SHIPPING, DELIVERED, CANCELLED, RETURNED), trạng thái thanh toán (UNPAID, PAID, FAILED, REFUNDED), số ngày gần đây hoặc từ khóa (mã đơn/tên/SĐT).",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: Object.keys(ORDER_STATUS) },
        payment_status: { type: "string", enum: ["UNPAID", "PAID", "FAILED", "REFUNDED"] },
        days: { type: "integer" },
        query: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
    },
    schema: z.object({ status: z.string().optional(), payment_status: z.string().optional(), days: z.number().int().optional(), query: z.string().optional(), limit: z.number().int().min(1).max(50).default(15) }),
    run: async (i) => {
      const r = await listOrders({ status: i.status, paymentStatus: i.payment_status, days: i.days, q: i.query, take: i.limit });
      return { total: r.total, orders: r.items.map((o) => ({ code: o.code, customer: o.fullName, phone: o.phone, status: o.status, payment: `${o.paymentMethod}/${o.paymentStatus}`, total: o.total, items: o._count.items, createdAt: o.createdAt })) };
    },
  }),
  def({
    name: "get_order_detail",
    description: "Xem chi tiết đơn hàng theo mã đơn: sản phẩm, địa chỉ, thanh toán, lịch sử trạng thái.",
    input_schema: { type: "object", properties: { code: { type: "string" } }, required: ["code"] },
    schema: z.object({ code: z.string() }),
    run: async ({ code }) => {
      const o = await prisma.order.findUnique({ where: { code: code.toUpperCase() }, include: { items: { select: { name: true, price: true, quantity: true, productId: true } }, history: { select: { status: true, note: true, createdAt: true } } } });
      if (!o) throw new Error("Không tìm thấy đơn hàng");
      return o;
    },
  }),
  def({
    name: "list_coupons",
    description: "Liệt kê tất cả mã giảm giá kèm trạng thái, điều kiện, số lượt đã dùng.",
    input_schema: { type: "object", properties: {} },
    schema: z.object({}),
    run: async () => prisma.coupon.findMany({ orderBy: { createdAt: "desc" } }),
  }),
  def({
    name: "get_review_insights",
    description: "Lấy các đánh giá gần đây (có thể lọc theo sản phẩm hoặc số sao tối đa, ví dụ max_rating=2 để xem đánh giá xấu) để phân tích phản hồi khách hàng.",
    input_schema: { type: "object", properties: { product_id: { type: "integer" }, max_rating: { type: "integer", minimum: 1, maximum: 5 }, limit: { type: "integer", minimum: 1, maximum: 50 } } },
    schema: z.object({ product_id: z.number().int().optional(), max_rating: z.number().int().min(1).max(5).optional(), limit: z.number().int().min(1).max(50).default(20) }),
    run: async (i) =>
      (await prisma.review.findMany({ where: { ...(i.product_id ? { productId: i.product_id } : {}), ...(i.max_rating ? { rating: { lte: i.max_rating } } : {}) }, orderBy: { createdAt: "desc" }, take: i.limit, include: { product: { select: { name: true, id: true } } } }))
        .map((r) => ({ id: r.id, product: r.product.name, productId: r.product.id, rating: r.rating, comment: r.comment, hidden: r.isHidden, replied: !!r.reply, createdAt: r.createdAt })),
  }),
  def({
    name: "list_categories",
    description: "Danh sách danh mục (tên, slug, số sản phẩm).",
    input_schema: { type: "object", properties: {} },
    schema: z.object({}),
    run: async () => prisma.category.findMany({ select: { name: true, slug: true, parentId: true, _count: { select: { products: true } } } }),
  }),

  // ---------------- Công cụ GHI (cần xác nhận) ----------------
  def({
    name: "update_stock",
    write: true,
    description: "Nhập kho hoặc điều chỉnh tồn kho cho 1 sản phẩm. change > 0 là nhập thêm, change < 0 là giảm (điều chỉnh kiểm kê, hàng hỏng). type IMPORT cho nhập hàng từ nhà cung cấp, ADJUST cho kiểm kê/điều chỉnh. Cần admin xác nhận.",
    input_schema: { type: "object", properties: { product_id: { type: "integer" }, change: { type: "integer", description: "Số lượng thay đổi (+/-)" }, type: { type: "string", enum: ["IMPORT", "ADJUST"] }, note: { type: "string", description: "Lý do / ghi chú" } }, required: ["product_id", "change", "type"] },
    schema: z.object({ product_id: z.number().int(), change: z.number().int().refine((v) => v !== 0, "change phải khác 0"), type: z.enum(["IMPORT", "ADJUST"]), note: z.string().default("") }),
    describe: async (i) => `${i.type === "IMPORT" ? "Nhập kho" : "Điều chỉnh kho"} ${i.change > 0 ? "+" : ""}${i.change} cho ${await productRef(i)}${i.note ? ` – ${i.note}` : ""}`,
    run: async (i, a) => adjustStock(i.product_id, i.change, i.type, i.note || "Thực hiện qua Trợ lý AI", a, true),
  }),
  def({
    name: "update_product",
    write: true,
    description: "Cập nhật thông tin sản phẩm: giá bán (price), giá gốc hiển thị gạch ngang (compare_price, 0 để bỏ), trạng thái bán (is_active), nổi bật (is_featured), ngưỡng cảnh báo tồn (low_stock_threshold), tên, mô tả ngắn. Chỉ truyền các trường cần đổi. Cần admin xác nhận.",
    input_schema: {
      type: "object",
      properties: {
        product_id: { type: "integer" },
        price: { type: "integer" },
        compare_price: { type: "integer", description: "Giá gốc hiển thị gạch ngang; truyền 0 để bỏ" },
        is_active: { type: "boolean" },
        is_featured: { type: "boolean" },
        low_stock_threshold: { type: "integer" },
        name: { type: "string" },
        short_desc: { type: "string" },
      },
      required: ["product_id"],
    },
    schema: z.object({ product_id: z.number().int(), price: z.number().int().positive().optional(), compare_price: z.number().int().nullable().optional().transform((v) => (v === 0 ? null : v)), is_active: z.boolean().optional(), is_featured: z.boolean().optional(), low_stock_threshold: z.number().int().min(0).optional(), name: z.string().min(3).optional(), short_desc: z.string().optional() }),
    describe: async (i) => {
      const parts = [
        i.price != null && `giá bán → ${formatVND(i.price)}`,
        i.compare_price !== undefined && `giá gốc → ${i.compare_price ? formatVND(i.compare_price) : "bỏ"}`,
        i.is_active != null && (i.is_active ? "hiển thị bán" : "ẩn khỏi shop"),
        i.is_featured != null && (i.is_featured ? "đặt nổi bật" : "bỏ nổi bật"),
        i.low_stock_threshold != null && `ngưỡng cảnh báo → ${i.low_stock_threshold}`,
        i.name && `tên → "${i.name}"`,
        i.short_desc && "cập nhật mô tả ngắn",
      ].filter(Boolean);
      return `Cập nhật ${await productRef(i)}: ${parts.join(", ")}`;
    },
    run: async (i, a) => {
      const p = await patchProduct(i.product_id, {
        ...(i.price != null ? { price: i.price } : {}),
        ...(i.compare_price !== undefined ? { comparePrice: i.compare_price } : {}),
        ...(i.is_active != null ? { isActive: i.is_active } : {}),
        ...(i.is_featured != null ? { isFeatured: i.is_featured } : {}),
        ...(i.low_stock_threshold != null ? { lowStockThreshold: i.low_stock_threshold } : {}),
        ...(i.name ? { name: i.name } : {}),
        ...(i.short_desc ? { shortDesc: i.short_desc } : {}),
      }, a, true);
      return { id: p.id, name: p.name, price: p.price, comparePrice: p.comparePrice, isActive: p.isActive, isFeatured: p.isFeatured, lowStockThreshold: p.lowStockThreshold };
    },
  }),
  def({
    name: "update_order_status",
    write: true,
    description: "Chuyển trạng thái đơn hàng. Luồng hợp lệ: PENDING→CONFIRMED/CANCELLED, CONFIRMED→SHIPPING/CANCELLED, SHIPPING→DELIVERED/RETURNED, DELIVERED→RETURNED. Hủy/trả hàng sẽ tự hoàn kho. Cần admin xác nhận.",
    input_schema: { type: "object", properties: { code: { type: "string" }, status: { type: "string", enum: ["CONFIRMED", "SHIPPING", "DELIVERED", "CANCELLED", "RETURNED"] }, note: { type: "string" } }, required: ["code", "status"] },
    schema: z.object({ code: z.string(), status: z.enum(["CONFIRMED", "SHIPPING", "DELIVERED", "CANCELLED", "RETURNED"]), note: z.string().optional() }),
    describe: (i) => `Chuyển đơn ${i.code.toUpperCase()} sang "${ORDER_STATUS[i.status].label}"${i.note ? ` – ${i.note}` : ""}`,
    run: async (i, a) => {
      const o = await changeOrderStatus(i.code.toUpperCase(), i.status, i.note, a, true);
      return { code: o.code, status: o.status, paymentStatus: o.paymentStatus };
    },
  }),
  def({
    name: "create_coupon",
    write: true,
    description: "Tạo (hoặc cập nhật nếu trùng mã) mã giảm giá. type: PERCENT (value là %, nên có max_discount), FIXED (value là số tiền VND), FREESHIP. Cần admin xác nhận.",
    input_schema: {
      type: "object",
      properties: {
        code: { type: "string", description: "Chỉ chữ và số, viết hoa" },
        description: { type: "string" },
        type: { type: "string", enum: ["PERCENT", "FIXED", "FREESHIP"] },
        value: { type: "integer" },
        max_discount: { type: "integer" },
        min_order: { type: "integer" },
        usage_limit: { type: "integer" },
        per_user_limit: { type: "integer" },
        days_valid: { type: "integer", description: "Số ngày hiệu lực kể từ hôm nay" },
      },
      required: ["code", "description", "type", "value"],
    },
    schema: z.object({ code: z.string().regex(/^[A-Za-z0-9]{3,20}$/), description: z.string().min(3), type: z.enum(["PERCENT", "FIXED", "FREESHIP"]), value: z.number().int().min(0), max_discount: z.number().int().optional(), min_order: z.number().int().min(0).default(0), usage_limit: z.number().int().optional(), per_user_limit: z.number().int().min(1).default(1), days_valid: z.number().int().min(1).default(30) }),
    describe: (i) => `Tạo mã ${i.code.toUpperCase()}: ${i.type === "PERCENT" ? `giảm ${i.value}%${i.max_discount ? ` tối đa ${formatVND(i.max_discount)}` : ""}` : i.type === "FIXED" ? `giảm ${formatVND(i.value)}` : "miễn phí ship"}, đơn từ ${formatVND(i.min_order)}, hiệu lực ${i.days_valid} ngày${i.usage_limit ? `, ${i.usage_limit} lượt` : ""}`,
    run: async (i, a) => {
      if (i.type === "PERCENT" && (i.value < 1 || i.value > 100)) throw new Error("Phần trăm phải từ 1-100");
      const data = { code: i.code.toUpperCase(), description: i.description, type: i.type, value: i.value, maxDiscount: i.max_discount ?? null, minOrder: i.min_order, usageLimit: i.usage_limit ?? null, perUserLimit: i.per_user_limit, endsAt: new Date(Date.now() + i.days_valid * 86400000), isActive: true };
      const c = await prisma.coupon.upsert({ where: { code: data.code }, create: data, update: data });
      await audit(a.id, "Tạo mã giảm giá", `${c.code}: ${c.description}`, true);
      return c;
    },
  }),
  def({
    name: "toggle_coupon",
    write: true,
    description: "Bật hoặc tắt một mã giảm giá. Cần admin xác nhận.",
    input_schema: { type: "object", properties: { code: { type: "string" }, is_active: { type: "boolean" } }, required: ["code", "is_active"] },
    schema: z.object({ code: z.string(), is_active: z.boolean() }),
    describe: (i) => `${i.is_active ? "Bật" : "Tắt"} mã giảm giá ${i.code.toUpperCase()}`,
    run: async (i, a) => {
      const c = await prisma.coupon.update({ where: { code: i.code.toUpperCase() }, data: { isActive: i.is_active } });
      await audit(a.id, i.is_active ? "Bật mã giảm giá" : "Tắt mã giảm giá", c.code, true);
      return { code: c.code, isActive: c.isActive };
    },
  }),
];

export const TOOL_MAP = new Map(TOOLS.map((t) => [t.name, t]));

export const anthropicTools = (): Anthropic.Tool[] => TOOLS.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema }));

export function parseToolInput(name: string, input: unknown) {
  const t = TOOL_MAP.get(name);
  if (!t) throw new Error(`Công cụ không tồn tại: ${name}`);
  const r = t.schema.safeParse(input ?? {});
  if (!r.success) throw new Error(`Tham số không hợp lệ: ${r.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; ")}`);
  return { tool: t, input: r.data };
}

export async function executeTool(name: string, input: unknown, actor: Actor): Promise<{ ok: boolean; result: string }> {
  try {
    const { tool, input: parsed } = parseToolInput(name, input);
    if (tool.write && actor.role !== "ADMIN" && name !== "update_stock" && name !== "update_order_status")
      throw new Error("Tài khoản STAFF chỉ được cập nhật kho và đơn hàng");
    const res = await tool.run(parsed as never, actor);
    return { ok: true, result: JSON.stringify(res, (_, v) => (v instanceof Date ? v.toISOString() : v)).slice(0, 60_000) };
  } catch (e) {
    return { ok: false, result: (e as Error).message };
  }
}

export async function describeAction(name: string, input: unknown) {
  try {
    const { tool, input: parsed } = parseToolInput(name, input);
    return tool.describe ? await tool.describe(parsed as never) : name;
  } catch (e) {
    return `${name}: ${(e as Error).message}`;
  }
}
