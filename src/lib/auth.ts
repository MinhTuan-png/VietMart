import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? "dev-secret");
const COOKIE = "vm_session"; // khách hàng
const ADMIN_COOKIE = "vm_admin"; // quản trị / nhân viên (tách riêng để đăng nhập song song)
export type Scope = "shop" | "admin";
const cookieOf = (scope: Scope) => (scope === "admin" ? ADMIN_COOKIE : COOKIE);

export type Session = { uid: number; role: string; name: string };

export async function createSession(user: { id: number; role: string; name: string }) {
  const token = await new SignJWT({ uid: user.id, role: user.role, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(secret);
  const isAdmin = user.role === "ADMIN" || user.role === "STAFF";
  (await cookies()).set(cookieOf(isAdmin ? "admin" : "shop"), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession(scope: Scope = "shop") {
  const jar = await cookies();
  // Đăng xuất phía shop: xóa phiên khách; nếu không có phiên khách (đang dùng phiên admin) thì xóa phiên admin
  if (scope === "shop" && !jar.get(COOKIE)) jar.delete(ADMIN_COOKIE);
  else jar.delete(cookieOf(scope));
}

export async function verifyToken(token?: string): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as Session;
  } catch {
    return null;
  }
}

export async function getSession(scope: Scope = "shop") {
  const jar = await cookies();
  const own = await verifyToken(jar.get(cookieOf(scope))?.value);
  // Shop: ưu tiên phiên khách; không có thì dùng phiên admin để "Xem shop" vẫn giữ đăng nhập
  if (own || scope === "admin") return own;
  return verifyToken(jar.get(ADMIN_COOKIE)?.value);
}

/** Lấy user đầy đủ từ DB (kiểm tra cả trạng thái khóa). */
export async function getCurrentUser(scope: Scope = "shop") {
  const s = await getSession(scope);
  if (!s) return null;
  const user = await prisma.user.findUnique({
    where: { id: s.uid },
    select: { id: true, name: true, email: true, phone: true, role: true, avatar: true, isLocked: true },
  });
  if (!user || user.isLocked) return null;
  return user;
}

export async function requireUser(next = "/") {
  const u = await getCurrentUser();
  if (!u) redirect(`/login?next=${encodeURIComponent(next)}`);
  return u;
}

export async function requireAdmin() {
  const u = await getCurrentUser("admin");
  if (!u) redirect("/login?next=/admin");
  // đã đăng nhập nhưng không phải quản trị: về trang chủ (tránh vòng lặp /admin <-> /login)
  if (u.role !== "ADMIN" && u.role !== "STAFF") redirect("/");
  return u;
}

export const SESSION_COOKIE = COOKIE;
