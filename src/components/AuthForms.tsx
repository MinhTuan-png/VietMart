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
        <input name="email" type="email" required className="input" placeholder="email@example.com" />
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
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(registerAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next ?? "/"} />
      <div><label className="label">Họ và tên</label><input name="name" required className="input" /></div>
      <div><label className="label">Email</label><input name="email" type="email" required className="input" /></div>
      <div><label className="label">Số điện thoại</label><input name="phone" required className="input" placeholder="09xxxxxxxx" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Mật khẩu</label><input name="password" type="password" required className="input" /></div>
        <div><label className="label">Nhập lại</label><input name="confirm" type="password" required className="input" /></div>
      </div>
      {state?.error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      <button disabled={pending} className="btn-primary w-full py-2.5">{pending ? "Đang tạo tài khoản..." : "ĐĂNG KÝ"}</button>
      <p className="text-center text-xs text-gray-500">Bằng việc đăng ký, bạn đồng ý với Điều khoản & Chính sách bảo mật của VietMart.</p>
      <p className="text-center text-sm text-gray-500">Đã có tài khoản? <Link href="/login" className="font-medium text-brand-600">Đăng nhập</Link></p>
    </form>
  );
}
