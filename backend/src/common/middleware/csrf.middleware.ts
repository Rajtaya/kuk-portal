import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

    const origin = req.get('origin');
    const referer = req.get('referer');

    if (!origin && !referer) return next();

    const corsEnv = process.env.CORS_ORIGIN || process.env.CORS_ORIGINS;
    if (!corsEnv) return next();

    const allowed = corsEnv.split(',').map(o => {
      try { return new URL(o.trim()).origin; } catch { return o.trim(); }
    });

    const requestOrigin = origin || (() => {
      try { return new URL(referer!).origin; } catch { return ''; }
    })();

    if (requestOrigin && !allowed.includes(requestOrigin)) {
      throw new ForbiddenException('Cross-origin request blocked');
    }

    next();
  }
}
