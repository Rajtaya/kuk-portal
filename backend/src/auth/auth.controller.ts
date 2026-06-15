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
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 24 * 60 * 60 * 1000,
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @Throttle({ short: { ttl: 10000, limit: 3 }, long: { ttl: 60000, limit: 5 } })
  @UseGuards(RecaptchaGuard)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    res.cookie(COOKIE_NAME, result.accessToken, COOKIE_OPTS);
    return { user: result.user };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
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
    const origin = req.get('origin') || `${req.protocol}://${req.get('host')}`;
    return this.authService.forgotPassword(dto, origin);
  }

  @Post('reset-password')
  @Throttle({ short: { ttl: 10000, limit: 3 }, long: { ttl: 60000, limit: 5 } })
  @UseGuards(RecaptchaGuard)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
