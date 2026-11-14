"use client";
import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2 } from "lucide-react";
import { removeSelected, toggleCartSelect, updateCartQty } from "@/app/actions/cart";
import { formatVND } from "@/lib/utils";
import ProductImage from "./ProductImage";
import { toast } from "./Toaster";

type Item = { productId: number; quantity: number; selected: boolean; product: { name: string; slug: string; price: number; comparePrice: number | null; thumbnail: string; stock: number; isActive: boolean } };

export default function CartView({ items }: { items: Item[] }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok && r.error) toast(r.error, "error");
      router.refresh();
    });
  const selected = items.filter((i) => i.selected);
  const subtotal = selected.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const saved = selected.reduce((s, i) => s + Math.max(0, (i.product.comparePrice ?? i.product.price) - i.product.price) * i.quantity, 0);
  const allSelected = items.length > 0 && items.every((i) => i.selected);

  return (
    <div className={`space-y-3 ${pending ? "opacity-70" : ""}`}>
      <div className="card hidden grid-cols-[40px_1fr_140px_140px_140px_60px] items-center px-4 py-3 text-sm text-gray-500 md:grid">
        <input type="checkbox" checked={allSelected} onChange={(e) => run(() => toggleCartSelect("all", e.target.checked))} className="h-4 w-4 accent-brand-500" />
        <span>Sản phẩm</span><span className="text-center">Đơn giá</span><span className="text-center">Số lượng</span><span className="text-center">Số tiền</span><span />
      </div>
      <div className="card divide-y">
        {items.map((i) => {
          const out = !i.product.isActive || i.product.stock === 0;
          return (
            <div key={i.productId} className="grid grid-cols-[32px_1fr] items-center gap-3 px-4 py-4 md:grid-cols-[40px_1fr_140px_140px_140px_60px] md:gap-0">
              <input type="checkbox" disabled={out} checked={i.selected && !out} onChange={(e) => run(() => toggleCartSelect(i.productId, e.target.checked))} className="h-4 w-4 accent-brand-500" />
              <Link href={`/p/${i.product.slug}`} className="flex items-center gap-3">
                <ProductImage src={i.product.thumbnail} alt={i.product.name} className="h-20 w-20 shrink-0 rounded border" />
                <div>
                  <div className="line-clamp-2 text-sm">{i.product.name}</div>
                  {out && <div className="mt-1 text-xs font-medium text-red-500">Sản phẩm tạm hết hàng</div>}
                  {!out && i.product.stock <= 5 && <div className="mt-1 text-xs text-amber-600">Chỉ còn {i.product.stock} sản phẩm</div>}
                </div>
              </Link>
              <div className="col-start-2 flex items-center justify-between gap-2 md:contents">
                <div className="text-center text-sm">
                  {i.product.comparePrice && i.product.comparePrice > i.product.price && <div className="text-xs text-gray-400 line-through">{formatVND(i.product.comparePrice)}</div>}
                  {formatVND(i.product.price)}
                </div>
                <div className="flex justify-center">
                  <div className="flex items-center rounded border">
                    <button className="px-2 py-1 hover:bg-gray-50" onClick={() => run(() => updateCartQty(i.productId, i.quantity - 1))} aria-label="Giảm"><Minus size={14} /></button>
                    <span className="w-10 border-x py-1 text-center text-sm">{i.quantity}</span>
                    <button className="px-2 py-1 hover:bg-gray-50" onClick={() => run(() => updateCartQty(i.productId, i.quantity + 1))} aria-label="Tăng"><Plus size={14} /></button>
                  </div>
                </div>
                <div className="text-center font-medium text-brand-600">{formatVND(i.product.price * i.quantity)}</div>
                <button className="flex justify-center text-gray-400 hover:text-red-500" onClick={() => run(() => updateCartQty(i.productId, 0))} aria-label="Xóa"><Trash2 size={18} /></button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="card sticky bottom-0 flex flex-wrap items-center gap-4 px-4 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={allSelected} onChange={(e) => run(() => toggleCartSelect("all", e.target.checked))} className="h-4 w-4 accent-brand-500" /> Chọn tất cả ({items.length})
        </label>
        <button className="text-sm text-gray-600 hover:text-red-500" onClick={() => run(removeSelected)}>Xóa mục đã chọn</button>
        <div className="ml-auto text-right">
          <div className="text-sm">Tổng thanh toán ({selected.length} sản phẩm): <span className="text-2xl font-semibold text-brand-600">{formatVND(subtotal)}</span></div>
          {saved > 0 && <div className="text-xs text-gray-500">Tiết kiệm <span className="text-brand-600">{formatVND(saved)}</span></div>}
        </div>
        <button disabled={!selected.length} onClick={() => router.push("/checkout")} className="btn-primary px-12 py-3">Mua hàng</button>
      </div>
    </div>
  );
}
