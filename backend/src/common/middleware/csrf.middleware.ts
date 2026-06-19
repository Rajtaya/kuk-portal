import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function refererOrigin(referer?: string): string {
  if (!referer) return '';
  try { return new URL(referer).origin; } catch { return ''; }
}

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private allowedOrigins(): string[] {
    const corsEnv = process.env.CORS_ORIGIN || process.env.CORS_ORIGINS || '';
    return corsEnv
      .split(',')
      .map((o) => { try { return new URL(o.trim()).origin; } catch { return o.trim(); } })
      .filter(Boolean);
  }

  use(req: Request, _res: Response, next: NextFunction) {
    if (SAFE_METHODS.has(req.method)) return next();

    // CSRF only matters for ambient cookie credentials. Bearer-token and unauthenticated
    // requests can't be forged cross-site (an attacker can't set the Authorization header,
    // and an unauthenticated request has nothing to abuse), so they pass through. This also
    // keeps login / forgot-password / reset-password — which run before any cookie exists —
    // reachable, and is independent of whether the Next.js proxy forwards Origin/Referer.
    if (!req.cookies?.auth_token) return next();

    // If the browser stated an origin, it must be same-origin or explicitly allowlisted.
    const stated = req.get('origin') || refererOrigin(req.get('referer'));
    if (stated) {
      const host = req.get('host');
      let sameOrigin = false;
      try { sameOrigin = !!host && new URL(stated).host === host; } catch { sameOrigin = false; }
      if (!sameOrigin && !this.allowedOrigins().includes(stated)) {
        throw new ForbiddenException('Cross-origin request blocked');
      }
    }

    // Require a custom header that only first-party JavaScript can attach. A cross-site
    // <form> cannot set it, and setting it cross-origin via fetch forces a CORS preflight
    // that the allowlist rejects — so this also closes the "no Origin/Referer" bypass.
    if (req.get('x-requested-with') !== 'XMLHttpRequest') {
      throw new ForbiddenException('Missing or invalid CSRF header');
    }

    next();
  }
}
