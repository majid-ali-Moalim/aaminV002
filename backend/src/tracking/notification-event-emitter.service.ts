import { Injectable } from '@nestjs/common';
import { EmergencyRequest } from '@prisma/client';

@Injectable()
export class NotificationEventEmitter {
  /**
   * Future architecture for external SMS/WhatsApp/Push notifications
   */
  async emitPatientUpdate(event: 'ASSIGNED' | 'ARRIVED_SCENE' | 'TRANSPORTING' | 'ARRIVED_HOSPITAL' | 'COMPLETED', request: EmergencyRequest) {
    // Scaffolded for future integration with actual providers (e.g. Twilio, Firebase)
    console.log(`[NotificationEventEmitter] Dispatching ${event} alert to patient ${request.patientId}`);
    
    // Stub: Push to SMS queue
    // Stub: Push to WhatsApp provider
  }
}
