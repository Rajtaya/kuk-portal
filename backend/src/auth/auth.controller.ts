import { Controller, Post, Get, Body, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const COOKIE_NAME = 'auth_token';

function cookieOpts(req: Request) {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: (isHttps ? 'none' : 'lax') as const,
    path: '/',
    maxAge: 24 * 60 * 60 * 1000,
  };
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    res.cookie(COOKIE_NAME, result.accessToken, cookieOpts(req));
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
}
