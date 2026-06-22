import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  private isConfigured(): boolean {
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  }

  private createTransport() {
    const port = Number(process.env.SMTP_PORT || 587);
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendPasswordResetOtpEmail(to: string, otp: string): Promise<void> {
    const from =
      process.env.SMTP_FROM || `"Aamin Ambulance" <${process.env.SMTP_USER || 'noreply@aamin.so'}>`;
    const subject = 'Your Aamin Ambulance password reset code';
    const text = [
      'You requested to reset your Aamin Ambulance password.',
      '',
      `Your verification code is: ${otp}`,
      '',
      'This code expires in 10 minutes.',
      'If you did not request this, you can ignore this email.',
    ].join('\n');
    const html = `
      <p>You requested to reset your <strong>Aamin Ambulance</strong> password.</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:6px;">${otp}</p>
      <p>This code expires in <strong>10 minutes</strong>.</p>
      <p>If you did not request this, you can ignore this email.</p>
    `;

    if (!this.isConfigured()) {
      this.logger.warn(`SMTP not configured. Password reset OTP for ${to}: ${otp}`);
      return;
    }

    await this.createTransport().sendMail({ from, to, subject, text, html });
    this.logger.log(`Password reset OTP sent to ${to}`);
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    const from =
      process.env.SMTP_FROM || `"Aamin Ambulance" <${process.env.SMTP_USER || 'noreply@aamin.so'}>`;
    const subject = 'Reset your Aamin Ambulance password';
    const text = [
      'You requested a password reset for your Aamin Ambulance account.',
      '',
      `Open this link to choose a new password (valid for 1 hour):`,
      resetUrl,
      '',
      'If you did not request this, you can ignore this email.',
    ].join('\n');
    const html = `
      <p>You requested a password reset for your <strong>Aamin Ambulance</strong> account.</p>
      <p><a href="${resetUrl}">Reset your password</a></p>
      <p>This link expires in 1 hour.</p>
      <p>If you did not request this, you can ignore this email.</p>
    `;

    if (!this.isConfigured()) {
      this.logger.warn(`SMTP not configured. Password reset link for ${to}: ${resetUrl}`);
      return;
    }

    await this.createTransport().sendMail({ from, to, subject, text, html });
    this.logger.log(`Password reset email sent to ${to}`);
  }
}
