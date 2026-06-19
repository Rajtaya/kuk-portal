import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma.service';
import { MailService } from '../mail/mail.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const RESET_TOKEN_EXPIRY_MS = 30 * 60 * 1000;
const BCRYPT_ROUNDS = 12;
// One identical message for every failed-auth branch so responses can't be used to
// tell a real-but-locked account apart from a wrong password or an unknown email.
const GENERIC_CREDENTIALS_ERROR = 'Invalid email or password.';
// Pre-computed hash used to spend comparable CPU on unknown accounts, removing the
// timing side-channel that would otherwise reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('uems-timing-equalizer', BCRYPT_ROUNDS);

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mail: MailService,
  ) {}

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true, email: true, name: true, role: true, password: true, isActive: true,
        loginAttempts: true, lockedUntil: true, tokenVersion: true,
        university: { select: { id: true, name: true, code: true } },
      },
    });

    // Locked account: respond identically to invalid credentials (no account-existence
    // oracle) and skip the password check so the lockout window is honoured.
    if (user?.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      throw new UnauthorizedException(GENERIC_CREDENTIALS_ERROR);
    }

    if (!user || !user.isActive) {
      // Spend comparable time on a bcrypt comparison so unknown emails aren't rejected faster.
      await bcrypt.compare(dto.password, DUMMY_HASH);
      throw new UnauthorizedException(GENERIC_CREDENTIALS_ERROR);
    }

    if (user.lockedUntil && user.lockedUntil.getTime() <= Date.now()) {
      await this.prisma.user.update({ where: { id: user.id }, data: { loginAttempts: 0, lockedUntil: null } });
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      const attempts = (user.loginAttempts || 0) + 1;
      const lockedUntil = attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS) : null;
      await this.prisma.user.update({ where: { id: user.id }, data: { loginAttempts: attempts, lockedUntil } });
      // Identical message whether or not this attempt tripped the lock.
      throw new UnauthorizedException(GENERIC_CREDENTIALS_ERROR);
    }

    if (user.loginAttempts > 0) {
      await this.prisma.user.update({ where: { id: user.id }, data: { loginAttempts: 0, lockedUntil: null } });
    }

    const token = this.jwtService.sign({ sub: user.id, role: user.role, tv: user.tokenVersion });

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

  async forgotPassword(dto: ForgotPasswordDto, baseUrl: string) {
    const email = dto.email.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return { message: 'If an account with that email exists, a reset link has been sent.' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetTokenExp: new Date(Date.now() + RESET_TOKEN_EXPIRY_MS),
      },
    });

    const resetUrl = `${baseUrl.replace(/\/+$/, '')}/reset-password?token=${token}`;
    await this.mail.sendPasswordReset(email, user.name, resetUrl);

    return { message: 'If an account with that email exists, a reset link has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const hashedToken = crypto.createHash('sha256').update(dto.token).digest('hex');

    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExp: { gt: new Date() },
      },
      select: { id: true },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashed = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        resetToken: null,
        resetTokenExp: null,
        loginAttempts: 0,
        lockedUntil: null,
        // Invalidate every JWT issued before this reset (e.g. an attacker's session).
        tokenVersion: { increment: 1 },
      },
    });

    return { message: 'Password has been reset successfully' };
  }

  // Server-side revocation: bumping tokenVersion makes the user's existing JWTs fail
  // validation immediately, so logout is a real revocation rather than a cookie wipe.
  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
    return { message: 'Logged out' };
  }
}
