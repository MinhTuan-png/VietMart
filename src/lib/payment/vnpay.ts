/**
 * Tích hợp VNPAY (Cổng thanh toán VNPAY - API v2.1.0).
 * Tài liệu: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
 * Đăng ký tài khoản sandbox (nhận vnp_TmnCode + vnp_HashSecret qua email): https://sandbox.vnpayment.vn/devreg/
 */
import crypto from "crypto";

export const vnpConfig = () => ({
  tmnCode: process.env.VNPAY_TMN_CODE ?? "",
  secret: process.env.VNPAY_HASH_SECRET ?? "",
  url: process.env.VNPAY_URL ?? "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
  mock: process.env.PAYMENT_MODE === "mock" || !process.env.VNPAY_TMN_CODE || !process.env.VNPAY_HASH_SECRET,
});

/** Sắp xếp key + encode giống code mẫu chính thức của VNPAY (Node.js). */
function sortAndEncode(obj: Record<string, string>) {
  const sorted: Record<string, string> = {};
  Object.keys(obj).map(encodeURIComponent).sort().forEach((k) => {
    sorted[k] = encodeURIComponent(obj[decodeURIComponent(k)]).replace(/%20/g, "+");
  });
  return sorted;
}
const toQuery = (o: Record<string, string>) => Object.entries(o).map(([k, v]) => `${k}=${v}`).join("&");
export const vnpSign = (data: string, secret: string) => crypto.createHmac("sha512", secret).update(Buffer.from(data, "utf-8")).digest("hex");

/** yyyyMMddHHmmss theo giờ Việt Nam (GMT+7) */
function vnDate(d: Date) {
  const t = new Date(d.getTime() + 7 * 3600_000).toISOString();
  return t.slice(0, 19).replace(/[-T:]/g, "");
}

export function buildVnpayUrl(p: { orderCode: string; amount: number; ipAddr: string; returnUrl: string; bankCode?: string }) {
  const cfg = vnpConfig();
  const now = new Date();
  const params: Record<string, string> = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: cfg.tmnCode || "MOCKTMN",
    vnp_Locale: "vn",
    vnp_CurrCode: "VND",
    vnp_TxnRef: p.orderCode,
    vnp_OrderInfo: `Thanh toan don hang ${p.orderCode}`,
    vnp_OrderType: "other",
    vnp_Amount: String(p.amount * 100),
    vnp_ReturnUrl: p.returnUrl,
    vnp_IpAddr: p.ipAddr,
    vnp_CreateDate: vnDate(now),
    vnp_ExpireDate: vnDate(new Date(now.getTime() + 15 * 60_000)),
  };
  if (p.bankCode) params.vnp_BankCode = p.bankCode;
  const sorted = sortAndEncode(params);
  const query = toQuery(sorted);
  const hash = vnpSign(query, cfg.secret || "MOCKSECRET");
  return `${cfg.url}?${query}&vnp_SecureHash=${hash}`;
}

/** Xác thực chữ ký dữ liệu VNPAY trả về (Return URL & IPN). */
export function verifyVnpay(query: Record<string, string>) {
  const cfg = vnpConfig();
  const { vnp_SecureHash, vnp_SecureHashType: _t, ...rest } = query;
  void _t;
  const signed = vnpSign(toQuery(sortAndEncode(rest)), cfg.secret || "MOCKSECRET");
  return {
    valid: !!vnp_SecureHash && signed.toLowerCase() === vnp_SecureHash.toLowerCase(),
    success: rest.vnp_ResponseCode === "00" && rest.vnp_TransactionStatus === "00",
    orderCode: rest.vnp_TxnRef,
    amount: Number(rest.vnp_Amount ?? 0) / 100,
    transactionNo: rest.vnp_TransactionNo,
    responseCode: rest.vnp_ResponseCode,
  };
}

/** Dùng cho cổng giả lập (PAYMENT_MODE=mock): tạo query trả về đã ký giống VNPAY thật. */
export function mockVnpayReturn(orderCode: string, amount: number, success: boolean) {
  const cfg = vnpConfig();
  const params: Record<string, string> = {
    vnp_Amount: String(amount * 100),
    vnp_BankCode: "NCB",
    vnp_CardType: "ATM",
    vnp_OrderInfo: `Thanh toan don hang ${orderCode}`,
    vnp_PayDate: vnDate(new Date()),
    vnp_ResponseCode: success ? "00" : "24",
    vnp_TmnCode: cfg.tmnCode || "MOCKTMN",
    vnp_TransactionNo: String(Math.floor(Math.random() * 1e8)),
    vnp_TransactionStatus: success ? "00" : "02",
    vnp_TxnRef: orderCode,
  };
  const q = toQuery(sortAndEncode(params));
  return `${q}&vnp_SecureHash=${vnpSign(q, cfg.secret || "MOCKSECRET")}`;
}

export const VNPAY_MESSAGES: Record<string, string> = {
  "00": "Giao dịch thành công",
  "07": "Trừ tiền thành công nhưng giao dịch bị nghi ngờ",
  "09": "Thẻ/Tài khoản chưa đăng ký Internet Banking",
  "10": "Xác thực thông tin thẻ sai quá 3 lần",
  "11": "Hết hạn chờ thanh toán",
  "12": "Thẻ/Tài khoản bị khóa",
  "13": "Nhập sai mật khẩu OTP",
  "24": "Khách hàng hủy giao dịch",
  "51": "Tài khoản không đủ số dư",
  "65": "Vượt quá hạn mức giao dịch trong ngày",
  "75": "Ngân hàng đang bảo trì",
  "79": "Nhập sai mật khẩu thanh toán quá số lần quy định",
  "99": "Lỗi không xác định",
};
