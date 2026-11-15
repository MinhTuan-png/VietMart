"use client";
import { useActionState, useEffect } from "react";
import { saveAddress } from "@/app/actions/account";

type A = { id?: number; fullName?: string; phone?: string; province?: string; district?: string; ward?: string; street?: string; isDefault?: boolean };
const PROVINCES = ["TP. Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Hải Phòng", "Cần Thơ", "Bình Dương", "Đồng Nai", "Khánh Hòa", "Lâm Đồng", "Thừa Thiên Huế", "Quảng Ninh", "Nghệ An", "Bà Rịa - Vũng Tàu", "Long An", "An Giang", "Bắc Ninh"];

export default function AddressForm({ initial, onDone }: { initial?: A; onDone?: () => void }) {
  const [state, action, pending] = useActionState(saveAddress, undefined);
  useEffect(() => {
    if (state?.ok) onDone?.();
  }, [state, onDone]);
  const v = state?.values; const fe = state?.fieldErrors ?? {};
  const val = (k: keyof A) => (v ? v[k as string] : (initial?.[k] as string | undefined));
  const err = (k: string) => fe[k] && <p className="mt-1 text-xs text-red-600">{fe[k]}</p>;
  const cls = (k: string) => `input${fe[k] ? " border-red-500" : ""}`;
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <div><label className="label">Họ tên người nhận</label><input name="fullName" defaultValue={val("fullName")} required className={cls("fullName")} />{err("fullName")}</div>
      <div><label className="label">Số điện thoại</label><input name="phone" defaultValue={val("phone")} required className={cls("phone")} />{err("phone")}</div>
      <div>
        <label className="label">Tỉnh/Thành phố</label>
        <input name="province" list="vm-provinces" defaultValue={val("province")} required className={cls("province")} />{err("province")}
        <datalist id="vm-provinces">{PROVINCES.map((p) => <option key={p} value={p} />)}</datalist>
      </div>
      <div><label className="label">Quận/Huyện</label><input name="district" defaultValue={val("district")} required className={cls("district")} />{err("district")}</div>
      <div><label className="label">Phường/Xã</label><input name="ward" defaultValue={val("ward")} required className={cls("ward")} />{err("ward")}</div>
      <div><label className="label">Số nhà, tên đường</label><input name="street" defaultValue={val("street")} required className={cls("street")} />{err("street")}</div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="isDefault" defaultChecked={v ? v.isDefault === "on" : initial?.isDefault} className="accent-brand-500" /> Đặt làm địa chỉ mặc định</label>
      {state?.error && !state.fieldErrors && <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p>}
      <div className="sm:col-span-2"><button disabled={pending} className="btn-primary">{pending ? "Đang lưu..." : "Lưu địa chỉ"}</button></div>
    </form>
  );
}
