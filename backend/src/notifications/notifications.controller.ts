import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  NotificationCategory,
  NotificationPriority,
  NotificationStatus,
  NotificationType,
  Role,
} from '@prisma/client';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('inbox')
  async inbox(
    @CurrentUser() user: any,
    @Query('category') category?: NotificationCategory,
    @Query('type') type?: NotificationType,
    @Query('status') status?: NotificationStatus,
    @Query('priority') priority?: NotificationPriority,
    @Query('search') search?: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('criticalOnly') criticalOnly?: string,
    @Query('broadcastOnly') broadcastOnly?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.notificationsService.findInbox({
      userId: user.id,
      userRole: user.role as Role,
      category,
      type,
      status,
      priority,
      search,
      unreadOnly: unreadOnly === 'true',
      criticalOnly: criticalOnly === 'true',
      broadcastOnly: broadcastOnly === 'true',
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query('category') category?: NotificationCategory,
    @Query('type') type?: NotificationType,
    @Query('status') status?: NotificationStatus,
    @Query('priority') priority?: NotificationPriority,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.notificationsService.findAll({
      userId: user.id,
      userRole: user.role as Role,
      category,
      type,
      status,
      priority,
      search,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get('stats')
  async getStats(@CurrentUser() user: any) {
    return this.notificationsService.getStats(user.id, user.role as Role);
  }

  @Get('recent')
  async getRecent(@CurrentUser() user: any) {
    const result = await this.notificationsService.findInbox({
      userId: user.id,
      userRole: user.role as Role,
      limit: 15,
      offset: 0,
    });
    return result.items;
  }

  @Get('preferences')
  getPreferences(@CurrentUser() user: any) {
    return this.notificationsService.getPreferences(user.id);
  }

  @Patch('preferences')
  updatePreferences(
    @CurrentUser() user: any,
    @Body() body: { preferences: { category: NotificationCategory; channel: string; enabled: boolean }[] },
  ) {
    return this.notificationsService.updatePreferences(user.id, body.preferences ?? []);
  }

  @Post('preferences/test-email')
  sendTestEmail(@CurrentUser() user: any) {
    return this.notificationsService.sendTestNotificationEmail(user.id);
  }

  @Get('alerts')
  getAlerts(
    @Query('status') status?: string,
    @Query('priority') priority?: NotificationPriority,
  ) {
    return this.notificationsService.getAlerts({ status, priority });
  }

  @Post('alerts')
  createAlert(@Body() body: any) {
    return this.notificationsService.createAlert(body);
  }

  @Patch('alerts/:id/resolve')
  resolveAlert(@Param('id') id: string) {
    return this.notificationsService.resolveAlert(id);
  }

  @Get('broadcasts')
  getBroadcasts() {
    return this.notificationsService.getBroadcasts();
  }

  @Get('delivery-logs')
  getDeliveryLogs(@Query('notificationId') notificationId?: string) {
    return this.notificationsService.getDeliveryLogs(notificationId);
  }

  @Post('broadcast')
  broadcast(@Body() body: any) {
    return this.notificationsService.broadcast(body);
  }

  @Post('mark-all-read')
  markAllRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllAsRead(user.id, user.role as Role);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: any) {
    return this.notificationsService.markAsRead(id, user.id);
  }

  @Patch(':id/unread')
  markUnread(@Param('id') id: string) {
    return this.notificationsService.markAsUnread(id);
  }

  @Patch(':id/archive')
  archive(@Param('id') id: string) {
    return this.notificationsService.archive(id);
  }

  @Patch(':id/resolve')
  resolve(@Param('id') id: string) {
    return this.notificationsService.resolve(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.notificationsService.remove(id);
  }

  @Post('check-maintenance')
  async checkMaintenance() {
    await this.notificationsService.checkMaintenanceAlerts();
    return { success: true };
  }
}
