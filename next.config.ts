import type { NextConfig } from 'next';
import { isProduction } from './src/lib/env';

const noIndex = { key: 'X-Robots-Tag', value: 'noindex, nofollow' };

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Lets the admin subdomain load dev assets locally (http://admin.localhost:3000).
  allowedDevOrigins: ['admin.localhost'],
  async headers() {
    return [
      {
        // The admin portal must never be indexed or framed — on any
        // deployment (admin.tapaway.today, admin.dev.tapaway.today, …).
        source: '/:path*',
        has: [{ type: 'host', value: 'admin\\..+' }],
        headers: [
          noIndex,
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'same-origin' },
        ],
      },
      // Only production belongs in search results: keep dev.tapaway.today and
      // preview URLs out, including their API responses and assets.
      ...(isProduction ? [] : [{ source: '/:path*', headers: [noIndex] }]),
    ];
  },
};

export default nextConfig;
