import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // Transpile the workspace package so Next can bundle it for the browser.
  transpilePackages: ['@rigormobile/rigor-core'],
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  // Server-side external packages (Node-only deps that shouldn't be bundled).
  serverExternalPackages: [
    '@noble/curves',
    '@noble/hashes',
    '@scure/base',
    '@scure/bip32',
    '@scure/bip39',
  ],
  // Empty turbopack config to silence the "no turbopack config" warning under
  // Next.js 16 (which defaults to Turbopack). The mining worker is loaded via
  // `new URL('./miner-worker/index.ts', import.meta.url)` which Next.js
  // handles automatically — no extra config needed.
  turbopack: {},
};

export default nextConfig;
