import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Nhật ký hoạt động" };

export default async function Logs() {
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { user: { select: { name: true } } } });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Nhật ký hoạt động</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500"><tr><th className="p-3">Thời gian</th><th>Người thực hiện</th><th>Hành động</th><th>Chi tiết</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-3 whitespace-nowrap text-gray-500">{formatDate(l.createdAt)}</td>
                <td>{l.user?.name ?? "Hệ thống"} {l.viaAI && <span className="ml-1 rounded bg-violet-100 px-1.5 text-xs text-violet-700">qua AI</span>}</td>
                <td className="font-medium">{l.action}</td><td className="text-gray-600">{l.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!logs.length && <p className="p-8 text-center text-gray-500">Chưa có hoạt động nào</p>}
      </div>
    </div>
  );
}
