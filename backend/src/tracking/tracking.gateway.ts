import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class TrackingGateway {
  @WebSocketServer()
  server: Server;

  // Broadcast tracking updates to a specific room based on trackingCode
  emitTrackingUpdate(trackingCode: string, payload: any) {
    this.server.to(trackingCode).emit('tracking-update', payload);
  }

  // Allow clients to join a room for a specific trackingCode
  @SubscribeMessage('join-tracking')
  handleJoinRoom(@MessageBody() trackingCode: string, @ConnectedSocket() client: Socket) {
    if (client && typeof client.join === 'function') {
      client.join(trackingCode);
      console.log(`Client joined tracking room: ${trackingCode}`);
    }
  }
}
