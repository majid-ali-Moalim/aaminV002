import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  isBookNowCase,
  isNonEmergencyCase,
  parseBookingDateTimeFromNotes,
} from '../common/booking-time';

@Injectable()
export class BookingReminderService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BookingReminderService.name);
  private timer: NodeJS.Timeout | null = null;
  private readonly notified = new Set<string>();

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.checkDueBookings(), 60_000);
    void this.checkDueBookings();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async checkDueBookings() {
    const now = Date.now();
    const pending = await this.prisma.emergencyRequest.findMany({
      where: {
        status: { in: ['PENDING', 'REVIEWING', 'ASSIGNED'] },
        OR: [
          { notes: { contains: 'Request Type: Non-Emergency', mode: 'insensitive' } },
          { patientCondition: { contains: 'Non-emergency', mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        trackingCode: true,
        notes: true,
        patientCondition: true,
        stationId: true,
      },
      take: 200,
    });

    for (const row of pending) {
      if (!isNonEmergencyCase(row.notes, row.patientCondition)) continue;
      if (isBookNowCase(row.notes)) continue;
      const booking = parseBookingDateTimeFromNotes(row.notes);
      if (!booking) continue;
      const dueKey = `${row.id}:${booking.toISOString().slice(0, 16)}`;
      if (this.notified.has(dueKey)) continue;
      const diff = booking.getTime() - now;
      if (diff > 60_000 || diff < -30 * 60_000) continue;

      this.notified.add(dueKey);
      try {
        await this.notifications.dispatchEvent({
          eventKey: 'MISSION_UPDATED',
          title: 'Non-emergency booking due',
          message: `Case ${row.trackingCode} booking time is now — ready for dispatch.`,
          type: 'EMERGENCY',
          category: 'MISSION',
          priority: 'HIGH',
          entityType: 'EmergencyRequest',
          entityId: row.id,
          redirectUrl: `/admin/emergency-requests/pending?id=${row.id}`,
          context: { stationId: row.stationId ?? undefined },
        });
      } catch (err) {
        this.logger.warn(`Booking reminder failed for ${row.trackingCode}: ${err}`);
        this.notified.delete(dueKey);
      }
    }
  }
}
