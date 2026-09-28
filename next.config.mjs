/** @type {import('next').NextConfig} */
const nextConfig = {
  // dev 起動時に AGENTS.md / CLAUDE.md を自動生成しない
  agentRules: false,
  serverExternalPackages: ["@react-pdf/renderer"],
  // PDF ルートは実行時に日本語フォントを読むため、Vercel の関数バンドルに含める
  outputFileTracingIncludes: {
    "/estimates/[id]/pdf": ["./assets/fonts/**"],
  },
};

export default nextConfig;
