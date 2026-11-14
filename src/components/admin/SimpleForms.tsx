"use client";
import { useActionState, useRef, useEffect } from "react";
import { saveCategory, saveCoupon } from "@/app/actions/admin";

export function CategoryForm({ parents }: { parents: { id: number; name: string }[] }) {
  const [state, action, pending] = useActionState(saveCategory, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="flex flex-wrap items-end gap-2">
      <div><label className="label">Tên danh mục</label><input name="name" className="input" /></div>
      <div><label className="label">Icon</label><input name="icon" placeholder="📦" className="input w-20" /></div>
      <div>
        <label className="label">Thuộc nhóm</label>
        <select name="parentId" className="input"><option value="">(Danh mục gốc)</option>{parents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      </div>
      <button disabled={pending} className="btn-primary">Thêm</button>
      {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
      {state?.ok && <span className="text-sm text-emerald-600">{state.message}</span>}
    </form>
  );
}

export function CouponForm() {
  const [state, action, pending] = useActionState(saveCoupon, undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <div><label className="label">Mã</label><input name="code" className="input uppercase" /></div>
      <div className="sm:col-span-2"><label className="label">Mô tả</label><input name="description" className="input" /></div>
      <div><label className="label">Loại</label><select name="type" className="input"><option value="PERCENT">Giảm %</option><option value="FIXED">Giảm tiền</option><option value="FREESHIP">Miễn phí ship</option></select></div>
      <div><label className="label">Giá trị (% hoặc ₫)</label><input name="value" type="number" defaultValue={10} className="input" /></div>
      <div><label className="label">Giảm tối đa (₫)</label><input name="maxDiscount" type="number" className="input" /></div>
      <div><label className="label">Đơn tối thiểu (₫)</label><input name="minOrder" type="number" defaultValue={0} className="input" /></div>
      <div><label className="label">Tổng lượt dùng</label><input name="usageLimit" type="number" className="input" /></div>
      <div><label className="label">Lượt/khách</label><input name="perUserLimit" type="number" defaultValue={1} className="input" /></div>
      <div><label className="label">Hết hạn</label><input name="endsAt" type="date" className="input" /></div>
      <div className="flex items-end gap-3 sm:col-span-3 lg:col-span-5">
        <button disabled={pending} className="btn-primary">Lưu mã giảm giá</button>
        {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
        {state?.ok && <span className="text-sm text-emerald-600">{state.message}</span>}
      </div>
    </form>
  );
}
