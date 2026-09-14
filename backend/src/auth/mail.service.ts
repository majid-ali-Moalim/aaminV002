import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type Transporter from 'nodemailer/lib/mailer';
import { isValidEmailAddress } from '../common/email-address';

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

  /** Structured hospital handover report with sectioned patient/clinical details. */
  async sendHandoverReportEmail(
    to: string,
    data: {
      subject: string;
      intro: string;
      sections: Array<{ title: string; rows: Array<{ label: string; value: string }> }>;
      senderName?: string;
      priority?: string;
    },
  ): Promise<boolean> {
    const escape = (s: string) =>
      s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const sectionHtml = data.sections
      .map((section) => {
        const rows = section.rows
          .map(
            (r) =>
              `<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;width:38%;vertical-align:top;"><strong>${escape(r.label)}</strong></td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px;white-space:pre-wrap;">${escape(r.value)}</td></tr>`,
          )
          .join('');
        return `
          <div style="margin-bottom:20px;">
            <h3 style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#0d9488;">${escape(section.title)}</h3>
            <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">${rows}</table>
          </div>`;
      })
      .join('');

    const textSections = data.sections
      .map((section) => {
        const body = section.rows.map((r) => `${r.label}: ${r.value}`).join('\n');
        return `${section.title.toUpperCase()}\n${body}`;
      })
      .join('\n\n');

    const subject = `[Aamin EMS] ${data.subject}`;
    const text = [data.intro, '', textSections, '', data.senderName ? `From: ${data.senderName}` : '', data.priority ? `Priority: ${data.priority}` : '']
      .filter(Boolean)
      .join('\n');

    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:680px;margin:0 auto;padding:24px;">
        <div style="background:linear-gradient(135deg,#0d9488,#0f766e);color:#fff;padding:18px 22px;border-radius:12px 12px 0 0;">
          <strong style="font-size:13px;letter-spacing:0.1em;text-transform:uppercase;">Aamin Ambulance EMS</strong>
          <h1 style="margin:8px 0 0;font-size:22px;font-weight:800;">Patient Handover Report</h1>
        </div>
        <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:24px;background:#fff;">
          <p style="margin:0 0 20px;color:#475569;line-height:1.6;font-size:14px;">${escape(data.intro)}</p>
          ${data.priority ? `<p style="margin:0 0 16px;color:#64748b;font-size:13px;"><strong>Priority:</strong> ${escape(data.priority)}</p>` : ''}
          ${sectionHtml}
          ${data.senderName ? `<p style="margin:16px 0 0;color:#64748b;font-size:13px;"><strong>Submitted by:</strong> ${escape(data.senderName)}</p>` : ''}
          <p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:11px;">Automated handover notification — please confirm receipt with the arriving crew.</p>
        </div>
      </div>
    `;

    return this.send({ to, subject, text, html, context: `handover report: ${data.subject}` });
  }

  private async send(options: {
    to: string;
    subject: string;
    text: string;
    html: string;
    context: string;
  }): Promise<boolean> {
    const to = options.to.trim();
    if (!isValidEmailAddress(to)) {
      this.logger.warn(
        `Skipped ${options.context}: invalid recipient address "${to}" (use a real email like name@domain.com)`,
      );
      return false;
    }

    if (!this.isConfigured() || !this.transporter) {
      this.logger.warn(`SMTP not configured — skipped ${options.context} for ${to}`);
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: this.smtpFrom,
        to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      this.logger.log(`${options.context} sent to ${to}`);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send ${options.context} to ${to}: ${message}`);
      return false;
    }
  }
}
