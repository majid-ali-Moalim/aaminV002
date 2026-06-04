import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  namespace: '/notifications',
  cors: { origin: '*', credentials: true },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private socketsByUser = new Map<string, Set<string>>();

  constructor(private jwtService: JwtService) {}

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

      const userId = payload.sub;
      client.data.userId = userId;
      client.join(`user:${userId}`);
      if (payload.role === 'ADMIN') client.join('role:ADMIN');
      if (payload.role === 'EMPLOYEE') client.join('role:EMPLOYEE');

      const set = this.socketsByUser.get(userId) ?? new Set();
      set.add(client.id);
      this.socketsByUser.set(userId, set);

      client.emit('connected', { userId, message: 'Notification channel connected' });
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId as string | undefined;
    if (!userId) return;
    const set = this.socketsByUser.get(userId);
    if (!set) return;
    set.delete(client.id);
    if (set.size === 0) this.socketsByUser.delete(userId);
  }

  emitNotification(userId: string | null | undefined, payload: unknown) {
    if (userId) {
      this.server.to(`user:${userId}`).emit('notification', payload);
      return;
    }
    this.server.to('role:ADMIN').emit('notification', payload);
  }

  emitStats(userId: string, stats: unknown) {
    this.server.to(`user:${userId}`).emit('notification_stats', stats);
  }
}
