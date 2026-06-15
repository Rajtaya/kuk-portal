import { Injectable, CanActivate, ExecutionContext, BadRequestException } from '@nestjs/common';

const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

@Injectable()
export class RecaptchaGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const secret = process.env.RECAPTCHA_SECRET_KEY;
    if (!secret) return true;

    const req = context.switchToHttp().getRequest();
    const token = req.body?.captchaToken;

    if (!token) {
      throw new BadRequestException('CAPTCHA verification is required');
    }

    const params = new URLSearchParams({ secret, response: token });
    const res = await fetch(VERIFY_URL, { method: 'POST', body: params });
    const data = await res.json();

    if (!data.success) {
      throw new BadRequestException('CAPTCHA verification failed. Please try again.');
    }

    return true;
  }
}
