import nodemailer, { type Transporter } from "nodemailer";
import { prisma } from "./db";
import { formatVND, ORDER_STATUS } from "./utils";

const configured = () => !!(process.env.SMTP_USER && process.env.SMTP_PASS);

let transport: Transporter | null = null;
const getTransport = () =>
  (transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 465,
    secure: (Number(process.env.SMTP_PORT) || 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  }));

/** Gửi email; không bao giờ ném lỗi (lỗi mail không được làm hỏng đơn hàng). Chưa cấu hình SMTP thì bỏ qua. */
export async function sendMail(to: string, subject: string, html: string) {
  if (!configured()) return false;
  try {
    await Promise.race([
      getTransport().sendMail({ from: `"VietMart" <${process.env.SMTP_USER}>`, to, subject, html }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("SMTP timeout")), 10000)),
    ]);
    return true;
  } catch (e) {
    console.error("[mail] gửi thất bại:", e instanceof Error ? e.message : e);
    return false;
  }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export type OrderMailKind = "placed" | "paid" | "status";

/** Email về đơn hàng cho khách: đặt hàng thành công / thanh toán thành công / đổi trạng thái. */
export async function sendOrderMail(orderId: number, kind: OrderMailKind) {
  if (!configured()) return;
  const o = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true, user: { select: { email: true, name: true } } } });
  if (!o) return;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const status = ORDER_STATUS[o.status]?.label ?? o.status;
  const head =
    kind === "paid" ? `Thanh toán thành công cho đơn ${o.code}`
    : kind === "placed" ? `Đặt hàng thành công - đơn ${o.code}`
    : `Đơn ${o.code} cập nhật: ${status}`;
  const intro =
    kind === "paid" ? `Chúng tôi đã nhận được thanh toán ${formatVND(o.total)} cho đơn hàng của bạn.`
    : kind === "placed" ? (o.paymentMethod === "COD" ? "Cảm ơn bạn đã đặt hàng. Bạn sẽ thanh toán khi nhận hàng." : "Đơn hàng đã được tạo, vui lòng hoàn tất thanh toán.")
    : `Trạng thái đơn hàng của bạn hiện là <b>${esc(status)}</b>.`;
  const rows = o.items
    .map((i) => `<tr><td style="padding:6px 0">${esc(i.name)} × ${i.quantity}</td><td style="padding:6px 0;text-align:right">${formatVND(i.price * i.quantity)}</td></tr>`)
    .join("");
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#222">
<h2 style="color:#2563eb;margin-bottom:4px">VietMart</h2>
<p>Xin chào <b>${esc(o.user.name)}</b>,</p><p>${intro}</p>
<p>Mã đơn: <b>${o.code}</b></p>
<table style="width:100%;border-collapse:collapse;border-top:1px solid #eee;border-bottom:1px solid #eee">${rows}
<tr><td style="padding:6px 0;color:#666">Phí vận chuyển</td><td style="text-align:right">${formatVND(o.shippingFee)}</td></tr>
${o.discount ? `<tr><td style="padding:6px 0;color:#666">Giảm giá</td><td style="text-align:right">-${formatVND(o.discount)}</td></tr>` : ""}
<tr><td style="padding:8px 0"><b>Tổng cộng</b></td><td style="text-align:right"><b style="color:#2563eb">${formatVND(o.total)}</b></td></tr></table>
<p style="color:#666;font-size:13px">Giao đến: ${esc(o.fullName)} - ${esc(o.phone)}<br>${esc(o.address)}</p>
<p><a href="${site}/account/orders/${o.code}" style="background:#2563eb;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Xem đơn hàng</a></p>
</div>`;
  await sendMail(o.user.email, head, html);
}
