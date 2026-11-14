"use client";
import { useActionState } from "react";
import { changePassword, updateProfile } from "@/app/actions/account";

export function ProfileForm({ name, phone, email }: { name: string; phone: string | null; email: string }) {
  const [state, action, pending] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className="max-w-md space-y-3">
      <div><label className="label">Email</label><input value={email} disabled className="input bg-gray-50" /></div>
      <div><label className="label">Họ và tên</label><input name="name" defaultValue={name} className="input" /></div>
      <div><label className="label">Số điện thoại</label><input name="phone" defaultValue={phone ?? ""} className="input" /></div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-600">{state.message}</p>}
      <button disabled={pending} className="btn-primary">Lưu</button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="max-w-md space-y-3">
      <div><label className="label">Mật khẩu hiện tại</label><input type="password" name="current" className="input" /></div>
      <div><label className="label">Mật khẩu mới</label><input type="password" name="next" className="input" /></div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-600">{state.message}</p>}
      <button disabled={pending} className="btn-ghost">Đổi mật khẩu</button>
    </form>
  );
}
