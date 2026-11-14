export const formatVND = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "₫";

export const formatDate = (d: Date | string, withTime = true) =>
  new Date(d).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });

export const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const discountPercent = (price: number, compare?: number | null) =>
  compare && compare > price ? Math.round((1 - price / compare) * 100) : 0;

export const parseJSON = <T,>(s: string | null | undefined, fallback: T): T => {
  try {
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
};

export const compactNumber = (n: number) =>
  n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(".", ",") + "k" : String(n);

export const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Chờ xác nhận", color: "bg-amber-100 text-amber-700" },
  CONFIRMED: { label: "Đã xác nhận", color: "bg-blue-100 text-blue-700" },
  SHIPPING: { label: "Đang giao", color: "bg-indigo-100 text-indigo-700" },
  DELIVERED: { label: "Đã giao", color: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Đã hủy", color: "bg-gray-200 text-gray-600" },
  RETURNED: { label: "Trả hàng", color: "bg-rose-100 text-rose-700" },
};

export const PAYMENT_STATUS: Record<string, { label: string; color: string }> = {
  UNPAID: { label: "Chưa thanh toán", color: "text-amber-600" },
  PAID: { label: "Đã thanh toán", color: "text-green-600" },
  FAILED: { label: "Thanh toán lỗi", color: "text-red-600" },
  REFUNDED: { label: "Đã hoàn tiền", color: "text-gray-600" },
};

export const PAYMENT_METHOD: Record<string, string> = {
  COD: "Thanh toán khi nhận hàng (COD)",
  VNPAY: "VNPAY (ATM / Visa / QR)",
  MOMO: "Ví MoMo",
};

export const SHIPPING_METHODS = {
  STANDARD: { label: "Giao tiêu chuẩn (3-5 ngày)", fee: 30_000, freeFrom: 500_000 },
  EXPRESS: { label: "Giao hỏa tốc (trong 24h)", fee: 50_000, freeFrom: Infinity },
} as const;

export function shippingFee(method: keyof typeof SHIPPING_METHODS, subtotal: number) {
  const m = SHIPPING_METHODS[method] ?? SHIPPING_METHODS.STANDARD;
  return subtotal >= m.freeFrom ? 0 : m.fee;
}
