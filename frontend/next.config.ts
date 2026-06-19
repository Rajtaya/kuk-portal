import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  ...(process.env.NEXT_BUILD_STANDALONE === '1' && { output: 'standalone' as const }),
  // Don't advertise the framework/version.
  poweredByHeader: false,
  async headers() {
    // Security headers applied to every response, in all environments.
    // CSP keeps scripts/styles permissive enough for Next.js + reCAPTCHA, but locks down
    // framing (clickjacking), base-uri, form-action and object/embed surfaces.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-src https://www.google.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; ');
    const securityHeaders = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      { key: 'Content-Security-Policy', value: csp },
    ];
    const base = [{ source: '/:path*', headers: securityHeaders }];

    // In dev, chunk filenames are NOT content-hashed (stable `page.js`), so caching
    // them as immutable makes the browser serve stale client code after every edit.
    // Only apply the long-lived cache headers in production builds.
    if (process.env.NODE_ENV !== 'production') return base;
    // Content-hashed bundles are safe to cache forever — the filename hash changes
    // on every rebuild, so a new deploy ships new URLs and never serves stale code.
    const immutable = 'public, max-age=31536000, immutable';
    // Fixed-name public images: cache a day, keep usable for a week while revalidating.
    const dayCache = 'public, max-age=86400, stale-while-revalidate=604800';
    return [
      ...base,
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
