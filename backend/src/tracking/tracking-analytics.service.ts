import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrackingAnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Retrieves high-level operational tracking analytics
   */
  async getMetrics() {
    const totalCases = await this.prisma.emergencyRequest.count();
    const completedCases = await this.prisma.emergencyRequest.count({ where: { status: 'COMPLETED' } });
    const cancelledCases = await this.prisma.emergencyRequest.count({ where: { status: 'CANCELLED' } });

    // Mock response time average until complex query is needed
    // Typically this would average the difference between createdAt and arrivedAtSceneAt
    const rawCompleted = await this.prisma.emergencyRequest.findMany({
      where: { status: 'COMPLETED', arrivedAtSceneAt: { not: null } },
      select: { createdAt: true, arrivedAtSceneAt: true }
    });

    let totalResponseTimeMs = 0;
    rawCompleted.forEach(c => {
      if (c.createdAt && c.arrivedAtSceneAt) {
        totalResponseTimeMs += (c.arrivedAtSceneAt.getTime() - c.createdAt.getTime());
      }
    });

    const averageResponseTimeMins = rawCompleted.length > 0 
      ? Math.round(totalResponseTimeMs / rawCompleted.length / 60000)
      : 0;

    return {
      totalCases,
      completionRate: totalCases > 0 ? (completedCases / totalCases) * 100 : 0,
      cancellationRate: totalCases > 0 ? (cancelledCases / totalCases) * 100 : 0,
      averageResponseTimeMins,
    };
  }
}
