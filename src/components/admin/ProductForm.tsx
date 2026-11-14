"use client";
import { useActionState } from "react";
import { saveProduct } from "@/app/actions/admin";

type P = { id?: number; name?: string; sku?: string; price?: number; comparePrice?: number | null; costPrice?: number | null; stock?: number; sold?: number; lowStockThreshold?: number; categoryId?: number; brand?: string; thumbnail?: string; images?: string; shortDesc?: string | null; description?: string; tags?: string; warranty?: string | null; specs?: string; isActive?: boolean; isFeatured?: boolean };
type Cat = { id: number; name: string; children: { id: number; name: string }[] };

export default function ProductForm({ p = {}, cats }: { p?: P; cats: Cat[] }) {
  const [state, action, pending] = useActionState(saveProduct, undefined);
  return (
    <form action={action} className="grid gap-4 lg:grid-cols-3">
      {p.id && <input type="hidden" name="id" value={p.id} />}
      <div className="card space-y-3 p-5 lg:col-span-2">
        <div><label className="label">Tên sản phẩm *</label><input name="name" defaultValue={p.name} className="input" required /></div>
        <div><label className="label">Mô tả ngắn</label><input name="shortDesc" defaultValue={p.shortDesc ?? ""} className="input" /></div>
        <div><label className="label">Mô tả chi tiết (HTML) *</label><textarea name="description" defaultValue={p.description} rows={8} className="input font-mono text-xs" /></div>
        <div><label className="label">Ảnh đại diện (URL) *</label><input name="thumbnail" defaultValue={p.thumbnail} className="input" /></div>
        <div><label className="label">Album ảnh (mỗi dòng 1 URL)</label><textarea name="images" defaultValue={p.images} rows={3} className="input text-xs" /></div>
        <div><label className="label">Thông số (mỗi dòng &quot;Tên: Giá trị&quot;)</label><textarea name="specs" defaultValue={p.specs} rows={5} className="input text-xs" /></div>
      </div>
      <div className="space-y-4">
        <div className="card space-y-3 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">SKU *</label><input name="sku" defaultValue={p.sku} className="input" /></div>
            <div><label className="label">Thương hiệu</label><input name="brand" defaultValue={p.brand} className="input" /></div>
          </div>
          <div>
            <label className="label">Danh mục *</label>
            <select name="categoryId" defaultValue={p.categoryId} className="input">
              {cats.map((c) => <optgroup key={c.id} label={c.name}>{c.children.map((ch) => <option key={ch.id} value={ch.id}>{ch.name}</option>)}</optgroup>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Giá bán *</label><input name="price" type="number" defaultValue={p.price} className="input" /></div>
            <div><label className="label">Giá gốc</label><input name="comparePrice" type="number" defaultValue={p.comparePrice ?? ""} className="input" /></div>
            <div><label className="label">Giá vốn</label><input name="costPrice" type="number" defaultValue={p.costPrice ?? ""} className="input" /></div>
            <div><label className="label">Bảo hành</label><input name="warranty" defaultValue={p.warranty ?? ""} className="input" /></div>
            <div><label className="label">Tồn kho</label><input name="stock" type="number" defaultValue={p.stock ?? 0} className="input" /></div>
            <div><label className="label">Ngưỡng cảnh báo</label><input name="lowStockThreshold" type="number" defaultValue={p.lowStockThreshold ?? 10} className="input" /></div>
            <div><label className="label">Đã bán</label><input name="sold" type="number" min={0} defaultValue={p.sold ?? 0} className="input" /></div>
          </div>
          <div><label className="label">Tags (phân tách dấu phẩy)</label><input name="tags" defaultValue={p.tags} className="input" /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={p.isActive ?? true} className="accent-brand-500" /> Đang bán</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isFeatured" defaultChecked={p.isFeatured} className="accent-brand-500" /> Sản phẩm nổi bật</label>
        </div>
        {state?.error && <p className="rounded bg-red-50 p-3 text-sm text-red-600">{state.error}</p>}
        <button disabled={pending} className="btn-primary w-full py-3">{pending ? "Đang lưu..." : "Lưu sản phẩm"}</button>
      </div>
    </form>
  );
}
