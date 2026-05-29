import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { DriversAppService } from './drivers-app.service';

@WebSocketGateway({
  namespace: '/driver',
  cors: { origin: '*', credentials: true },
})
export class DriversAppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedDrivers = new Map<string, string>(); // socketId -> userId

  constructor(
    private jwtService: JwtService,
    private driverService: DriversAppService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'your-secret-key',
      });

      if (payload.role !== 'EMPLOYEE') {
        client.disconnect();
        return;
      }

      this.connectedDrivers.set(client.id, payload.sub);
      client.join(`driver:${payload.sub}`);
      client.data.userId = payload.sub;

      console.log(`[DriverGateway] Driver connected: ${payload.sub} (${client.id})`);

      // Send active mission immediately on connect
      try {
        const activeMission = await this.driverService.getActiveMission(payload.sub);
        if (activeMission) {
          client.emit('active_mission', activeMission);
        }
      } catch (_) {}

      client.emit('connected', { message: 'Connected to Driver operational channel', userId: payload.sub });
    } catch (err) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.connectedDrivers.get(client.id);
    if (userId) {
      this.connectedDrivers.delete(client.id);
      console.log(`[DriverGateway] Driver disconnected: ${userId}`);
    }
  }

  @SubscribeMessage('update_mission_status')
  async handleMissionStatusUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { missionId: string; status: string; notes?: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    try {
      const updated = await this.driverService.updateMissionStatus(
        userId,
        data.missionId,
        data.status,
        data.notes,
      );

      // Emit to the driver themselves
      this.server.to(`driver:${userId}`).emit('mission_updated', updated);

      // Broadcast to admin/dispatcher channels
      this.server.emit('driver_mission_status_changed', {
        missionId: data.missionId,
        status: data.status,
        driverUserId: userId,
        mission: updated,
      });

      return { success: true, mission: updated };
    } catch (err) {
      client.emit('error', { message: err.message });
      return { success: false, error: err.message };
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { timestamp: new Date().toISOString() });
  }

  @SubscribeMessage('driver_location_update')
  handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { lat?: number; lng?: number; location?: string },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    // Broadcast location to admin/dispatcher
    this.server.emit('driver_location', {
      driverUserId: userId,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  // Called externally to push missions to a specific driver
  emitMissionToDriver(driverUserId: string, mission: any) {
    this.server.to(`driver:${driverUserId}`).emit('new_mission', mission);
  }

  emitMissionCancelled(driverUserId: string, missionId: string) {
    this.server.to(`driver:${driverUserId}`).emit('mission_cancelled', { missionId });
  }
}
