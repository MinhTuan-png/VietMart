"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Ticket, Truck, Wallet } from "lucide-react";
import { placeOrder, previewCoupon } from "@/app/actions/checkout";
import { formatVND, shippingFee, SHIPPING_METHODS } from "@/lib/utils";
import AddressForm from "./AddressForm";
import ProductImage from "./ProductImage";
import { toast } from "./Toaster";

type Address = { id: number; fullName: string; phone: string; province: string; district: string; ward: string; street: string; isDefault: boolean };
type Item = { productId: number; quantity: number; product: { name: string; price: number; thumbnail: string } };
type Coupon = { code: string; description: string; minOrder: number };

const PAYMENTS = [
  { id: "COD", title: "Thanh toán khi nhận hàng (COD)", desc: "Trả tiền mặt khi nhận hàng", badge: "COD", color: "text-gray-800" },
  { id: "VNPAY", title: "Thanh toán qua VNPAY", desc: "Thẻ ATM nội địa, Visa/Master, QR ngân hàng", badge: "VNPAY", color: "text-[#005baa]" },
] as const;

export default function CheckoutForm({ addresses, items, coupons }: { addresses: Address[]; items: Item[]; coupons: Coupon[] }) {
  const router = useRouter();
  const [addressId, setAddressId] = useState(addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id);
  const [showAddr, setShowAddr] = useState(!addresses.length);
  // Khách mới thêm địa chỉ đầu tiên ngay tại trang thanh toán → tự chọn địa chỉ đó
  useEffect(() => {
    if (!addresses.some((a) => a.id === addressId)) setAddressId(addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id);
  }, [addresses, addressId]);
  const [ship, setShip] = useState<keyof typeof SHIPPING_METHODS>("STANDARD");
  const [pay, setPay] = useState<"COD" | "VNPAY">("COD");
  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number; freeShip: boolean } | null>(null);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  const subtotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const fee = shippingFee(ship, subtotal);
  const discount = coupon ? (coupon.freeShip ? fee : coupon.discount) : 0;
  const total = Math.max(0, subtotal + fee - discount);
  const addr = useMemo(() => addresses.find((a) => a.id === addressId), [addresses, addressId]);

  const apply = (c: string) =>
    start(async () => {
      const r = await previewCoupon(c, ship);
      if (r.ok) {
        setCoupon(r);
        setCode(r.code);
        toast(`Áp dụng mã ${r.code} thành công`);
      } else {
        setCoupon(null);
        toast(r.error, "error");
      }
    });

  const submit = () =>
    start(async () => {
      if (!addressId) return toast("Vui lòng thêm địa chỉ giao hàng", "error");
      const r = await placeOrder({ addressId, paymentMethod: pay, shippingMethod: ship, couponCode: coupon?.code, note });
      if (!r.ok) return toast(r.error, "error");
      if (r.redirect.startsWith("http")) window.location.href = r.redirect;
      else router.push(r.redirect);
    });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <section className="card overflow-hidden">
          <div className="h-1 bg-[repeating-linear-gradient(45deg,#2563eb_0_20px,#fff_20px_30px,#2563eb_30px_50px,#fff_50px_60px)]" />
          <div className="p-4">
            <div className="mb-3 flex items-center gap-2 font-semibold text-brand-600"><MapPin size={18} /> Địa chỉ nhận hàng</div>
            {addresses.length > 0 && (
              <div className="space-y-2">
                {addresses.map((a) => (
                  <label key={a.id} className={`flex cursor-pointer gap-3 rounded-md border p-3 text-sm ${a.id === addressId ? "border-brand-500 bg-brand-50/40" : ""}`}>
                    <input type="radio" checked={a.id === addressId} onChange={() => setAddressId(a.id)} className="mt-1 accent-brand-500" />
                    <span>
                      <b>{a.fullName}</b> ({a.phone}) {a.isDefault && <span className="ml-1 rounded border border-brand-500 px-1 text-xs text-brand-600">Mặc định</span>}
                      <br />
                      <span className="text-gray-600">{a.street}, {a.ward}, {a.district}, {a.province}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
            <button onClick={() => setShowAddr((s) => !s)} className="mt-3 text-sm text-brand-600 hover:underline">{showAddr ? "Đóng" : "+ Thêm địa chỉ mới"}</button>
            {showAddr && (
              <div className="mt-3 rounded-md border p-4">
                <AddressForm onDone={() => { setShowAddr(false); router.refresh(); }} />
              </div>
            )}
          </div>
        </section>

        <section className="card p-4">
          <div className="mb-3 font-semibold">Sản phẩm ({items.length})</div>
          <div className="divide-y">
            {items.map((i) => (
              <div key={i.productId} className="flex items-center gap-3 py-3 text-sm">
                <ProductImage src={i.product.thumbnail} alt={i.product.name} className="h-14 w-14 rounded border" />
                <span className="line-clamp-2 flex-1">{i.product.name}</span>
                <span className="w-28 text-right text-gray-500">{formatVND(i.product.price)} × {i.quantity}</span>
                <span className="w-28 text-right font-medium">{formatVND(i.product.price * i.quantity)}</span>
              </div>
            ))}
          </div>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Lời nhắn cho shop (tùy chọn)" className="input mt-2" />
        </section>

        <section className="card p-4">
          <div className="mb-3 flex items-center gap-2 font-semibold"><Truck size={18} /> Phương thức vận chuyển</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(SHIPPING_METHODS) as (keyof typeof SHIPPING_METHODS)[]).map((k) => (
              <label key={k} className={`flex cursor-pointer items-center justify-between rounded-md border p-3 text-sm ${ship === k ? "border-brand-500 bg-brand-50/40" : ""}`}>
                <span className="flex items-center gap-2"><input type="radio" checked={ship === k} onChange={() => setShip(k)} className="accent-brand-500" /> {SHIPPING_METHODS[k].label}</span>
                <span className="font-medium">{shippingFee(k, subtotal) === 0 ? <span className="text-emerald-600">Miễn phí</span> : formatVND(shippingFee(k, subtotal))}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="card p-4">
          <div className="mb-3 flex items-center gap-2 font-semibold"><Wallet size={18} /> Phương thức thanh toán</div>
          <div className="grid gap-2">
            {PAYMENTS.map((p) => (
              <label key={p.id} className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm ${pay === p.id ? "border-brand-500 bg-brand-50/40" : ""}`}>
                <input type="radio" checked={pay === p.id} onChange={() => setPay(p.id)} className="accent-brand-500" />
                <span className={`w-16 rounded border bg-white py-1 text-center text-xs font-black ${p.color}`}>{p.badge}</span>
                <span><b>{p.title}</b><br /><span className="text-gray-500">{p.desc}</span></span>
              </label>
            ))}
          </div>
        </section>
      </div>

      <aside className="space-y-4">
        <section className="card p-4">
          <div className="mb-3 flex items-center gap-2 font-semibold"><Ticket size={18} className="text-brand-500" /> Mã giảm giá</div>
          <div className="flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Nhập mã giảm giá" className="input" />
            <button disabled={!code || pending} onClick={() => apply(code)} className="btn-outline shrink-0">Áp dụng</button>
          </div>
          {coupon && (
            <div className="mt-2 flex items-center justify-between rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Đã áp dụng <b>{coupon.code}</b>
              <button onClick={() => { setCoupon(null); setCode(""); }} className="text-xs underline">Bỏ</button>
            </div>
          )}
          <div className="mt-3 space-y-2">
            {coupons.map((c) => (
              <button key={c.code} onClick={() => apply(c.code)} disabled={subtotal < c.minOrder} className="flex w-full items-center justify-between gap-2 rounded border border-dashed border-brand-300 px-3 py-2 text-left text-xs hover:bg-brand-50 disabled:opacity-50">
                <span><b className="font-mono text-brand-700">{c.code}</b><br />{c.description}</span>
                <span className="shrink-0 text-brand-600">{subtotal < c.minOrder ? "Chưa đủ ĐK" : "Dùng"}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="card space-y-2 p-4 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Tổng tiền hàng</span><span>{formatVND(subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Phí vận chuyển</span><span>{formatVND(fee)}</span></div>
          {discount > 0 && <div className="flex justify-between"><span className="text-gray-500">Giảm giá</span><span className="text-emerald-600">-{formatVND(discount)}</span></div>}
          <div className="flex items-end justify-between border-t pt-3"><span>Tổng thanh toán</span><span className="text-2xl font-semibold text-brand-600">{formatVND(total)}</span></div>
          {addr && <p className="text-xs text-gray-500">Giao đến: {addr.street}, {addr.district}, {addr.province}</p>}
          <button disabled={pending || !items.length} onClick={submit} className="btn-primary w-full py-3 text-base">{pending ? "Đang xử lý..." : pay === "COD" ? "Đặt hàng" : "Thanh toán qua VNPAY"}</button>
          <p className="text-center text-xs text-gray-400">Nhấn &quot;Đặt hàng&quot; đồng nghĩa với việc bạn đồng ý tuân theo Điều khoản VietMart</p>
        </section>
      </aside>
    </div>
  );
}
