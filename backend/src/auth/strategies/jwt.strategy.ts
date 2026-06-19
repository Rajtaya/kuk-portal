import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '../../prisma.service';

function extractJwt(req: Request): string | null {
  const fromCookie = req?.cookies?.auth_token;
  if (fromCookie) return fromCookie;
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: extractJwt,
      secretOrKey: process.env.JWT_SECRET!,
      // Pin the algorithm so a forged token can't downgrade to "none" or swap to RS256.
      algorithms: ['HS256'],
    });
  }

  async validate(payload: { sub: string; tv?: number }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true, universityId: true, isActive: true, tokenVersion: true },
    });
    if (!user || !user.isActive) throw new UnauthorizedException();
    // Stateless revocation: a token whose version is behind the user's current
    // tokenVersion was issued before a logout/password-reset and is now rejected.
    if ((payload.tv ?? 0) !== user.tokenVersion) throw new UnauthorizedException('Session expired, please sign in again');
    const { tokenVersion, ...safeUser } = user;
    return safeUser;
  }
}
