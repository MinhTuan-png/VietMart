"use client";
import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction } from "@/app/actions/auth";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? "/"} />
      <div>
        <label className="label">Email</label>
        <input name="email" type="email" required defaultValue={state?.values?.email} className="input" placeholder="email@example.com" />
      </div>
      <div>
        <label className="label">Mật khẩu</label>
        <input name="password" type="password" required className="input" />
      </div>
      {state?.error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      <button disabled={pending} className="btn-primary w-full py-2.5">{pending ? "Đang đăng nhập..." : "ĐĂNG NHẬP"}</button>
      <p className="text-center text-sm text-gray-500">
        {next?.startsWith("/admin") ? (
          <span>Khu vực dành cho quản trị viên. <Link href="/login" className="font-medium text-brand-600">Đăng nhập khách hàng</Link></span>
        ) : (
          <>Bạn mới biết đến VietMart? <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-brand-600">Đăng ký</Link></>
        )}
      </p>
      <div className="rounded-md bg-gray-50 p-3 text-xs text-gray-500">
        <b>Tài khoản demo:</b><br />Khách hàng: khach@vietmart.vn / 123456<br />Quản trị: admin@vietmart.vn / admin123
      </div>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(registerAction, undefined);
  const v = state?.values; const fe = state?.fieldErrors ?? {};
  const err = (k: string) => fe[k] && <p className="mt-1 text-xs text-red-600">{fe[k]}</p>;
  const cls = (k: string) => `input${fe[k] ? " border-red-500" : ""}`;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next ?? "/"} />
      <div><label className="label">Họ và tên</label><input name="name" required defaultValue={v?.name} className={cls("name")} />{err("name")}</div>
      <div><label className="label">Email</label><input name="email" type="email" required defaultValue={v?.email} className={cls("email")} />{err("email")}</div>
      <div><label className="label">Số điện thoại</label><input name="phone" required defaultValue={v?.phone} className={cls("phone")} placeholder="09xxxxxxxx" />{err("phone")}</div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Mật khẩu</label><input name="password" type="password" required className={cls("password")} />{err("password")}</div>
        <div><label className="label">Nhập lại</label><input name="confirm" type="password" required className={cls("confirm")} />{err("confirm")}</div>
      </div>
      {state?.error && !state.fieldErrors && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      <button disabled={pending} className="btn-primary w-full py-2.5">{pending ? "Đang tạo tài khoản..." : "ĐĂNG KÝ"}</button>
      <p className="text-center text-xs text-gray-500">Bằng việc đăng ký, bạn đồng ý với Điều khoản & Chính sách bảo mật của VietMart.</p>
      <p className="text-center text-sm text-gray-500">Đã có tài khoản? <Link href="/login" className="font-medium text-brand-600">Đăng nhập</Link></p>
    </form>
  );
}
