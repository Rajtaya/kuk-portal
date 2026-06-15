import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';
import { LoginDto } from './dto/login.dto';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

interface AttemptRecord { count: number; lockedUntil: number | null }

@Injectable()
export class AuthService {
  private attempts = new Map<string, AttemptRecord>();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private getAttempt(email: string): AttemptRecord {
    return this.attempts.get(email) || { count: 0, lockedUntil: null };
  }

  private checkLockout(email: string) {
    const rec = this.getAttempt(email);
    if (rec.lockedUntil) {
      if (Date.now() < rec.lockedUntil) {
        const mins = Math.ceil((rec.lockedUntil - Date.now()) / 60000);
        throw new UnauthorizedException(`Account temporarily locked. Try again in ${mins} minute(s).`);
      }
      this.attempts.delete(email);
    }
  }

  private recordFailure(email: string) {
    const rec = this.getAttempt(email);
    rec.count++;
    if (rec.count >= MAX_ATTEMPTS) {
      rec.lockedUntil = Date.now() + LOCKOUT_MS;
    }
    this.attempts.set(email, rec);
  }

  private clearAttempts(email: string) {
    this.attempts.delete(email);
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase();
    this.checkLockout(email);

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true, email: true, name: true, role: true, password: true, isActive: true,
        university: { select: { id: true, name: true, code: true } },
      },
    });
    if (!user || !user.isActive) {
      this.recordFailure(email);
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      this.recordFailure(email);
      const rec = this.getAttempt(email);
      if (rec.lockedUntil) {
        throw new UnauthorizedException('Account temporarily locked. Try again later.');
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    this.clearAttempts(email);
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
