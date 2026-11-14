"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAddress, setDefaultAddress } from "@/app/actions/account";
import AddressForm from "./AddressForm";

type Address = { id: number; fullName: string; phone: string; province: string; district: string; ward: string; street: string; isDefault: boolean };

export default function AddressList({ addresses }: { addresses: Address[] }) {
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  const [, start] = useTransition();
  const router = useRouter();
  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center justify-between border-b pb-4">
        <h1 className="text-lg font-semibold">Địa chỉ của tôi</h1>
        <button onClick={() => setEditing("new")} className="btn-primary">+ Thêm địa chỉ mới</button>
      </div>
      {editing && (
        <div className="mb-6 rounded-md border p-4">
          <AddressForm key={editing === "new" ? "new" : editing.id} initial={editing === "new" ? undefined : editing} onDone={() => { setEditing(null); router.refresh(); }} />
        </div>
      )}
      <div className="divide-y">
        {addresses.map((a) => (
          <div key={a.id} className="flex flex-wrap justify-between gap-3 py-4 text-sm">
            <div>
              <div><b>{a.fullName}</b> | <span className="text-gray-500">{a.phone}</span></div>
              <div className="text-gray-600">{a.street}</div>
              <div className="text-gray-600">{a.ward}, {a.district}, {a.province}</div>
              {a.isDefault && <span className="mt-1 inline-block rounded border border-brand-500 px-1.5 text-xs text-brand-600">Mặc định</span>}
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-3 text-brand-600">
                <button onClick={() => setEditing(a)}>Cập nhật</button>
                {!a.isDefault && <button onClick={() => start(async () => { await deleteAddress(a.id); router.refresh(); })}>Xóa</button>}
              </div>
              {!a.isDefault && <button onClick={() => start(async () => { await setDefaultAddress(a.id); router.refresh(); })} className="btn-ghost py-1 text-xs">Thiết lập mặc định</button>}
            </div>
          </div>
        ))}
        {!addresses.length && <p className="py-6 text-center text-gray-500">Bạn chưa có địa chỉ nào</p>}
      </div>
    </div>
  );
}
