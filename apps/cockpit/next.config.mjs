import { createRequire } from 'module';

const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict mode for catching bugs early
  reactStrictMode: true,

  // Transpile workspace packages
  transpilePackages: ["@leash/types", "@leash/crypto", "@leash/policy-engine"],

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID ?? "",
    NEXT_PUBLIC_GATEWAY_URL: process.env.LEASH_GATEWAY_URL ?? "",
  },

  // Production image optimization
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.paypalobjects.com" },
    ],
  },

  // Proper headers for security
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

