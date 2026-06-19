import { Controller, Post, Get, Body, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RecaptchaGuard } from '../common/guards/recaptcha.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const COOKIE_NAME = 'auth_token';
// Keep in step with JWT_EXPIRATION (default 8h) so the cookie doesn't outlive the token.
const COOKIE_MAX_AGE_MS = 8 * 60 * 60 * 1000;
function cookieOpts(req: Request) {
  return {
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: COOKIE_MAX_AGE_MS,
    // Optional explicit scoping; defaults to host-only (the safest scope) when unset.
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  };
}

// The base URL for password-reset links must come from trusted configuration, never
// from the attacker-controllable Origin/Host headers (which would enable an open
// redirect that mails victims a reset link pointing at the attacker's site).
function resetBaseUrl(req: Request): string {
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
  const corsEnv = process.env.CORS_ORIGIN || process.env.CORS_ORIGINS;
  if (corsEnv) return corsEnv.split(',')[0].trim();
  // Dev convenience only — never reached in production once FRONTEND_URL/CORS is set.
  return `${req.protocol}://${req.get('host')}`;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @Throttle({ short: { ttl: 10000, limit: 3 }, long: { ttl: 60000, limit: 5 } })
  @UseGuards(RecaptchaGuard)
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    res.cookie(COOKIE_NAME, result.accessToken, cookieOpts(req));
    return { user: result.user };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async logout(@CurrentUser('id') userId: string, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(userId);
    res.clearCookie(COOKIE_NAME, { path: '/' });
    return { message: 'Logged out' };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @Post('forgot-password')
  @Throttle({ short: { ttl: 10000, limit: 1 }, long: { ttl: 60000, limit: 3 } })
  @UseGuards(RecaptchaGuard)
  forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    return this.authService.forgotPassword(dto, resetBaseUrl(req));
  }

  @Post('reset-password')
  @Throttle({ short: { ttl: 10000, limit: 3 }, long: { ttl: 60000, limit: 5 } })
  @UseGuards(RecaptchaGuard)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
