export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface MapTrackingProvider {
  /**
   * Retrieves live coordinates for a given ambulance
   */
  getLiveCoordinates(ambulanceId: string): Promise<Coordinates | null>;

  /**
   * Retrieves estimated distance and duration between two points
   */
  getDistanceAndDuration(origin: Coordinates, destination: Coordinates): Promise<{ distanceKm: number; durationMins: number }>;
  
  /**
   * Fallback logic: get coordinates from landmark or text address
   */
  getCoordinatesFromLandmark(landmark: string, district?: string): Promise<Coordinates | null>;
}
