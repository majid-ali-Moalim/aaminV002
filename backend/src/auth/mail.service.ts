import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type Transporter from 'nodemailer/lib/mailer';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private smtpFrom = '"Aamin Ambulance" <noreply@aamin.so>';

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const host = this.read('SMTP_HOST');
    const user = this.read('SMTP_USER');
    const pass = this.read('SMTP_PASS');
    const port = Number(this.read('SMTP_PORT') || '587');
    this.smtpFrom =
      this.read('SMTP_FROM') || `"Aamin Ambulance" <${user || 'noreply@aamin.so'}>`;

    if (!host || !user || !pass) {
      this.logger.warn(
        'SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in backend/.env then restart the server.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port === 587,
      auth: { user, pass },
    });

    void this.transporter
      .verify()
      .then(() => this.logger.log(`SMTP ready (${user} via ${host}:${port})`))
      .catch((err: Error) =>
        this.logger.error(`SMTP verification failed for ${user}: ${err.message}`),
      );
  }

  private read(key: string): string {
    const raw = this.config.get<string>(key) ?? process.env[key] ?? '';
    return String(raw).trim().replace(/^["']|["']$/g, '');
  }

  private isConfigured(): boolean {
    return Boolean(this.transporter);
  }

  async sendPasswordResetOtpEmail(to: string, otp: string): Promise<boolean> {
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

    return this.send({ to, subject, text, html, context: 'password reset OTP' });
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
    const subject = 'Reset your Aamin Ambulance password';
    const text = [
      'You requested a password reset for your Aamin Ambulance account.',
      '',
      'Open this link to choose a new password (valid for 1 hour):',
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

    return this.send({ to, subject, text, html, context: 'password reset link' });
  }

  async sendNotificationEmail(
    to: string,
    data: {
      title: string;
      message: string;
      priority?: string;
      actionUrl?: string;
      senderName?: string;
    },
  ): Promise<boolean> {
    const frontendBase = (this.read('FRONTEND_URL') || 'http://localhost:3000').replace(/\/$/, '');
    const actionHref = data.actionUrl?.startsWith('http')
      ? data.actionUrl
      : data.actionUrl
        ? `${frontendBase}${data.actionUrl.startsWith('/') ? '' : '/'}${data.actionUrl}`
        : `${frontendBase}/admin/notifications`;

    const subject = `[Aamin EMS] ${data.title}`;
    const text = [
      data.title,
      '',
      data.message,
      data.senderName ? `\nFrom: ${data.senderName}` : '',
      data.priority ? `Priority: ${data.priority}` : '',
      '',
      `Open in portal: ${actionHref}`,
    ]
      .filter(Boolean)
      .join('\n');

    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
        <div style="background:#dc2626;color:#fff;padding:16px 20px;border-radius:12px 12px 0 0;">
          <strong style="font-size:14px;letter-spacing:0.08em;text-transform:uppercase;">Aamin Ambulance EMS</strong>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:24px;background:#fff;">
          <h2 style="margin:0 0 12px;font-size:20px;color:#0f172a;">${data.title}</h2>
          <p style="margin:0 0 16px;color:#475569;line-height:1.6;white-space:pre-wrap;">${data.message}</p>
          ${data.senderName ? `<p style="margin:0 0 8px;color:#64748b;font-size:13px;"><strong>From:</strong> ${data.senderName}</p>` : ''}
          ${data.priority ? `<p style="margin:0 0 16px;color:#64748b;font-size:13px;"><strong>Priority:</strong> ${data.priority}</p>` : ''}
          <a href="${actionHref}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;font-size:14px;">
            View in portal
          </a>
        </div>
      </div>
    `;

    return this.send({ to, subject, text, html, context: `notification: ${data.title}` });
  }

  private async send(options: {
    to: string;
    subject: string;
    text: string;
    html: string;
    context: string;
  }): Promise<boolean> {
    if (!this.isConfigured() || !this.transporter) {
      this.logger.warn(`SMTP not configured — skipped ${options.context} for ${options.to}`);
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: this.smtpFrom,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      this.logger.log(`${options.context} sent to ${options.to}`);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send ${options.context} to ${options.to}: ${message}`);
      return false;
    }
  }
}
