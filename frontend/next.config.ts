import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  ...(process.env.NEXT_BUILD_STANDALONE === '1' && { output: 'standalone' as const }),
  async headers() {
    // In dev, chunk filenames are NOT content-hashed (stable `page.js`), so caching
    // them as immutable makes the browser serve stale client code after every edit.
    // Only apply the long-lived cache headers in production builds.
    if (process.env.NODE_ENV !== 'production') return [];
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
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
