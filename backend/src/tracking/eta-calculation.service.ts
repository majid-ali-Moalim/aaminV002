import { Injectable } from '@nestjs/common';
import { EmergencyRequest, EmergencyRequestStatus, Priority } from '@prisma/client';

@Injectable()
export class EtaCalculationService {
  /**
   * Calculates dynamic ETA based on current operational variables.
   * In the future, MapTrackingProvider will override this with GPS data.
   */
  calculateEta(
    request: Partial<EmergencyRequest> & { status: EmergencyRequestStatus; priority: Priority },
    districtAvgResponseMins: number = 15,
    trafficMultiplier: number = 1.0
  ): string | null {
    // If the case is completed or cancelled, no ETA
    if (request.status === 'COMPLETED' || request.status === 'CANCELLED') {
      return null;
    }

    let baseMinutes = 0;

    // Phase 1: Not yet assigned
    if (request.status === 'PENDING' || request.status === 'REVIEWING') {
      baseMinutes = districtAvgResponseMins + 5; // adding 5 mins for dispatcher processing
    }
    // Phase 2: Assigned, preparing to leave
    else if (request.status === 'ASSIGNED') {
      baseMinutes = districtAvgResponseMins + 2; 
    }
    // Phase 3: Moving to scene
    else if (request.status === 'DISPATCHED' || request.status === 'EN_ROUTE') {
      // If we had a dispatched time, we could subtract elapsed time.
      // For now, use the average response time adjusted by traffic
      baseMinutes = districtAvgResponseMins;
    }
    // Phase 4: At Scene
    else if (request.status === 'ARRIVED_SCENE' || request.status === 'PATIENT_STABILIZED') {
      // The ambulance is there. ETA to next destination (Hospital)
      baseMinutes = districtAvgResponseMins * 1.5; // Hospital trips often longer depending on traffic
    }
    // Phase 5: Transporting
    else if (request.status === 'TRANSPORTING') {
      baseMinutes = districtAvgResponseMins;
    }
    // Phase 6: Arrived
    else if (request.status === 'ARRIVED_HOSPITAL') {
      return 'Arrived';
    }

    // Apply modifiers based on priority
    if (request.priority === 'CRITICAL') {
      // Critical requests often get faster clearance (sirens, clear paths)
      baseMinutes = baseMinutes * 0.75;
    } else if (request.priority === 'LOW') {
      // Low priority might not use sirens, face normal traffic
      baseMinutes = baseMinutes * 1.2;
    }

    // Apply external traffic multiplier
    const finalMinutes = Math.max(1, Math.round(baseMinutes * trafficMultiplier));

    // Convert minutes to a human-readable ETA string (e.g., "12 mins")
    return `${finalMinutes} mins`;
  }
}
