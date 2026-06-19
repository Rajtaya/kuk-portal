import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const connections = new Map<string, { count: number; blocked: number }>();
const MAX_CONCURRENT = 50;
const BLOCK_DURATION_MS = 5 * 60 * 1000;

function clientIp(req: Request): string {
  // Use Express's proxy-aware resolution (honours `trust proxy`) instead of reading
  // X-Forwarded-For directly — otherwise a client could rotate the header per request
  // to mint a fresh identity and bypass the per-IP connection limit and block list.
  return req.ip || req.socket.remoteAddress || 'unknown';
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, state] of connections) {
    if (state.count <= 0 && (!state.blocked || state.blocked < now)) {
      connections.delete(ip);
    }
  }
}, 60_000);

@Injectable()
export class DdosMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (process.env.NODE_ENV !== 'production') return next();

    const ip = clientIp(req);
    let state = connections.get(ip);
    if (!state) {
      state = { count: 0, blocked: 0 };
      connections.set(ip, state);
    }

    if (state.blocked && state.blocked > Date.now()) {
      throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
    }
    state.blocked = 0;

    state.count++;
    if (state.count > MAX_CONCURRENT) {
      state.blocked = Date.now() + BLOCK_DURATION_MS;
      state.count = 0;
      throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
    }

    res.on('finish', () => { state!.count = Math.max(0, state!.count - 1); });
    res.on('close', () => { state!.count = Math.max(0, state!.count - 1); });

    next();
  }
}
