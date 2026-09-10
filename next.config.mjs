/** @type {import('next').NextConfig} */
const nextConfig = {
  // dev 起動時に AGENTS.md / CLAUDE.md を自動生成しない
  agentRules: false,
};

export default nextConfig;
