import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Lets the admin subdomain load dev assets locally (http://admin.localhost:3000).
  allowedDevOrigins: ['admin.localhost'],
  async headers() {
    return [
      {
        // The admin portal must never be indexed or framed.
        source: '/:path*',
        has: [{ type: 'host', value: 'admin.tapaway.today' }],
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
