import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

type WebPushModule = {
  setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void;
  sendNotification: (
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string | Buffer,
  ) => Promise<unknown>;
};

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private configured = false;
  private webpush: WebPushModule | null = null;

  constructor(private prisma: PrismaService) {
    void this.init();
  }

  private async init() {
    const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
    const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
    if (!publicKey || !privateKey) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const webpush = require('web-push') as WebPushModule;
      webpush.setVapidDetails(
        process.env.WEB_PUSH_SUBJECT || 'mailto:support@aamin.so',
        publicKey,
        privateKey,
      );
      this.webpush = webpush;
      this.configured = true;
    } catch (err) {
      this.logger.warn('Web Push module unavailable — install web-push and set VAPID keys');
    }
  }

  getPublicKey(): string | null {
    return process.env.WEB_PUSH_PUBLIC_KEY || null;
  }

  isConfigured(): boolean {
    return this.configured;
  }

  private get pushRepo() {
    return (this.prisma as PrismaService & { pushSubscription: any }).pushSubscription;
  }

  async saveSubscription(
    userId: string,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    userAgent?: string,
  ) {
    if (!this.pushRepo) {
      this.logger.warn('push_subscriptions table missing — run prisma migrate');
      return { ok: false };
    }

    return this.pushRepo.upsert({
      where: { endpoint: subscription.endpoint },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent,
      },
      update: {
        userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent,
      },
    });
  }

  async removeSubscription(userId: string, endpoint: string) {
    if (!this.pushRepo) return;
    await this.pushRepo.deleteMany({ where: { userId, endpoint } });
  }

  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    if (!this.configured || !this.webpush || !this.pushRepo) return;

    const subs = await this.pushRepo.findMany({ where: { userId } });
    if (!subs?.length) return;

    const body = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/',
      tag: payload.tag || `aamin-${userId}`,
    });

    await Promise.all(
      subs.map(async (sub: { id: string; endpoint: string; p256dh: string; auth: string }) => {
        try {
          await this.webpush!.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            body,
          );
        } catch (err: any) {
          const status = err?.statusCode || err?.status;
          if (status === 404 || status === 410) {
            await this.pushRepo.delete({ where: { id: sub.id } }).catch(() => {});
          } else {
            this.logger.warn(`Push failed for user ${userId}: ${err?.message || err}`);
          }
        }
      }),
    );
  }
}
