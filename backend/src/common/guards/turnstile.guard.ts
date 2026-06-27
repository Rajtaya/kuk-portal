import {
  Injectable, CanActivate, ExecutionContext,
  BadRequestException, ServiceUnavailableException,
} from '@nestjs/common';

// Cloudflare Turnstile server-side validation endpoint.
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

@Injectable()
export class TurnstileGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
      // Fail CLOSED in production: a missing key is a misconfiguration, not a reason
      // to silently drop bot protection on login/forgot-password/reset-password.
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException('CAPTCHA verification is temporarily unavailable.');
      }
      return true; // dev convenience only
    }

    const req = context.switchToHttp().getRequest();
    const token = req.body?.captchaToken;

    if (!token || typeof token !== 'string') {
      throw new BadRequestException('CAPTCHA verification is required');
    }

    let data: { success?: boolean };
    try {
      const params = new URLSearchParams({ secret, response: token });
      // Bind the solved challenge to the caller's IP when available (defence in depth).
      const remoteip = req.ip || req.socket?.remoteAddress;
      if (remoteip) params.set('remoteip', remoteip);
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch(VERIFY_URL, { method: 'POST', body: params, signal: ctrl.signal });
      clearTimeout(timer);
      data = await res.json();
    } catch {
      // Network/timeout against Cloudflare — fail closed rather than letting the request through.
      throw new ServiceUnavailableException('Could not verify CAPTCHA. Please try again.');
    }

    if (!data.success) {
      throw new BadRequestException('CAPTCHA verification failed. Please try again.');
    }

    return true;
  }
}
