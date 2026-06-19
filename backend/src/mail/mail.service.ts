import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    const host = process.env.SMTP_HOST;
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      this.logger.warn('SMTP not configured — emails will be logged to console');
    }
  }

  async sendPasswordReset(to: string, name: string, resetUrl: string) {
    const subject = 'UEMS — Password Reset Request';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e3a5f, #1e40af); padding: 24px; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">UEMS</h1>
          <p style="color: #93c5fd; margin: 4px 0 0; font-size: 14px;">University Employees Management System</p>
        </div>
        <div style="padding: 32px 24px; background: #fff;">
          <p style="font-size: 16px; color: #1f2937;">Hello <strong>${name}</strong>,</p>
          <p style="font-size: 14px; color: #4b5563; line-height: 1.6;">
            We received a request to reset your password. Click the button below to set a new password.
            This link will expire in <strong>30 minutes</strong>.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="background: #2563eb; color: #fff; padding: 12px 32px; text-decoration: none; font-size: 14px; font-weight: 600; letter-spacing: 0.05em;">
              RESET PASSWORD
            </a>
          </div>
          <p style="font-size: 13px; color: #6b7280; line-height: 1.5;">
            If you did not request this, you can safely ignore this email. Your password will not change.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="font-size: 12px; color: #9ca3af;">
            This email was sent by the UEMS portal. Do not reply to this email.
          </p>
        </div>
      </div>
    `;

    if (!this.transporter) {
      // Print the link in dev so resets are testable without SMTP, but never log the
      // token-bearing URL in production (logs may be shipped/retained).
      if (process.env.NODE_ENV === 'production') {
        this.logger.warn(`Password reset requested for ${to} but SMTP is not configured; no email sent.`);
      } else {
        this.logger.log(`[DEV] Password reset link for ${to}: ${resetUrl}`);
      }
      return;
    }

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || '"UEMS Portal" <noreply@uems.kuk.ac.in>',
      to,
      subject,
      html,
    });
  }
}
