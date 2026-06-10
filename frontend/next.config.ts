import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  async headers() {
    // Content-hashed bundles are safe to cache forever — the filename hash changes
    // on every rebuild, so a new deploy ships new URLs and never serves stale code.
    const immutable = 'public, max-age=31536000, immutable';
    // Fixed-name public images: cache a day, keep usable for a week while revalidating.
    const dayCache = 'public, max-age=86400, stale-while-revalidate=604800';
    return [
      { source: '/_next/static/:path*', headers: [{ key: 'Cache-Control', value: immutable }] },
      { source: '/logos/:path*', headers: [{ key: 'Cache-Control', value: dayCache }] },
      { source: '/icons/:path*', headers: [{ key: 'Cache-Control', value: dayCache }] },
      { source: '/manifest.json', headers: [{ key: 'Cache-Control', value: 'public, max-age=3600' }] },
      // Service worker must always revalidate so SW updates ship immediately.
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
      // HTML pages and everything else: never cache, so new deploys are picked up at once.
      // (This is the anti-stale-deploy guard — it intentionally excludes the cached paths above.)
      {
        source: '/((?!_next/|logos/|icons/|manifest.json|sw.js).*)',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
      },
    ];
  },
  async rewrites() {
    if (process.env.NEXT_PUBLIC_API_URL) return [];
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:4000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
