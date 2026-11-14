import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Không theo dõi file CSDL SQLite: nếu không, mỗi lần ghi DB (lượt xem, giỏ hàng...)
  // chế độ dev sẽ tưởng code thay đổi và tải lại trang liên tục.
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ["**/node_modules/**", "**/.git/**", "**/.next/**", "**/prisma/**", "**/*.db", "**/*.db-journal"],
      };
    }
    return config;
  },
};

export default nextConfig;
