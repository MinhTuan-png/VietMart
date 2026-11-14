"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";

export type FormState = { error?: string; ok?: boolean; message?: string } | undefined;

const safeNext = (n: FormDataEntryValue | null) => {
  const s = typeof n === "string" ? n : "/";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
};

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) return { error: "Email hoặc mật khẩu không đúng" };
  if (user.isLocked) return { error: "Tài khoản đã bị khóa. Vui lòng liên hệ CSKH." };
  await createSession(user);
  let next = safeNext(fd.get("next"));
  if (next === "/" && (user.role === "ADMIN" || user.role === "STAFF")) next = "/admin";
  redirect(next);
}

const RegisterSchema = z
  .object({
    name: z.string().trim().min(2, "Họ tên tối thiểu 2 ký tự"),
    email: z.string().trim().toLowerCase().email("Email không hợp lệ"),
    phone: z.string().trim().regex(/^0\d{9}$/, "Số điện thoại gồm 10 số, bắt đầu bằng 0"),
    password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "Mật khẩu nhập lại không khớp", path: ["confirm"] });

export async function registerAction(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = RegisterSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, phone, password } = parsed.data;
  if (await prisma.user.findUnique({ where: { email } })) return { error: "Email đã được sử dụng" };
  const user = await prisma.user.create({ data: { name, email, phone, password: await bcrypt.hash(password, 10) } });
  await createSession(user);
  // khách mới đăng ký không có quyền /admin: về đúng trang trước đó nếu không phải trang quản trị, còn lại về trang chủ
  const n = safeNext(fd.get("next"));
  redirect(n.startsWith("/admin") ? "/" : n);
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function logoutAdminAction() {
  await destroySession("admin");
  redirect("/login?next=/admin");
}
