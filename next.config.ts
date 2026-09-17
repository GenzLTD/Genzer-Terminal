import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone 仅服务于自托管 Dockerfile（产出 .next/standalone + server.js）。
  // Vercel 有原生 Next.js 运行时，开启它会改变产物结构并导致部署异常，
  // 因此在 Vercel 构建环境（自动注入 VERCEL=1）下禁用，其余环境保持开启。
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
};

export default nextConfig;
