import type { NextConfig } from "next";
import withPWA from 'next-pwa'
import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev';

async function setup() {
  if (process.env.NODE_ENV === 'development') {
    await setupDevPlatform()
  }
}

setup()

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
  // Cloudflare Pages configuration
  experimental: {
    runtime: 'edge',
  },
  // Ensure proper asset handling for Cloudflare Pages
  assetPrefix: undefined,
  trailingSlash: false,
};

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  // @ts-expect-error "ignore the error"
})(nextConfig);
