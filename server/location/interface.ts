export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationResult {
  formattedAddress: string;
  coordinates: Coordinates;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface LocationProvider {
  /**
   * Convert an address into coordinates
   */
  geocode(address: string): Promise<LocationResult[]>;
  
  /**
   * Convert coordinates into an address
   */
  reverseGeocode(coordinates: Coordinates): Promise<LocationResult[]>;
  
  /**
   * Calculate distance between two coordinates in meters
   */
  distance(a: Coordinates, b: Coordinates): number;
}
