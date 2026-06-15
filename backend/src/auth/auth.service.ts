import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';
import { LoginDto } from './dto/login.dto';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true, email: true, name: true, role: true, password: true, isActive: true,
        loginAttempts: true, lockedUntil: true,
        university: { select: { id: true, name: true, code: true } },
      },
    });

    if (user?.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(`Account temporarily locked. Try again in ${mins} minute(s).`);
    }

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.lockedUntil && user.lockedUntil.getTime() <= Date.now()) {
      await this.prisma.user.update({ where: { id: user.id }, data: { loginAttempts: 0, lockedUntil: null } });
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      const attempts = (user.loginAttempts || 0) + 1;
      const lockedUntil = attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS) : null;
      await this.prisma.user.update({ where: { id: user.id }, data: { loginAttempts: attempts, lockedUntil } });
      if (lockedUntil) {
        throw new UnauthorizedException('Account temporarily locked. Try again later.');
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.loginAttempts > 0) {
      await this.prisma.user.update({ where: { id: user.id }, data: { loginAttempts: 0, lockedUntil: null } });
    }

    const token = this.jwtService.sign({ sub: user.id, role: user.role });

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        university: user.university,
      },
    };
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, university: true },
    });
  }
}
