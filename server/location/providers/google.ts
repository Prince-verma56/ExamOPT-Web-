import { Coordinates, LocationProvider, LocationResult } from '../interface';

export class GoogleMapsLocationProvider implements LocationProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[GoogleMapsLocationProvider] Missing GOOGLE_MAPS_API_KEY');
    }
  }

  async geocode(address: string): Promise<LocationResult[]> {
    if (!this.apiKey) return [];
    
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('[GoogleMaps] Geocode error:', data.status, data.error_message);
      return [];
    }

    return data.results.map((r: any) => ({
      formattedAddress: r.formatted_address,
      coordinates: r.geometry.location,
      // mapping omitted for brevity, normally you'd parse address_components
    }));
  }

  async reverseGeocode(coordinates: Coordinates): Promise<LocationResult[]> {
    if (!this.apiKey) return [];

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coordinates.lat},${coordinates.lng}&key=${this.apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('[GoogleMaps] Reverse geocode error:', data.status, data.error_message);
      return [];
    }

    return data.results.map((r: any) => ({
      formattedAddress: r.formatted_address,
      coordinates: r.geometry.location,
    }));
  }

  distance(a: Coordinates, b: Coordinates): number {
    // Haversine formula
    const R = 6371e3; // metres
    const φ1 = (a.lat * Math.PI) / 180;
    const φ2 = (b.lat * Math.PI) / 180;
    const Δφ = ((b.lat - a.lat) * Math.PI) / 180;
    const Δλ = ((b.lng - a.lng) * Math.PI) / 180;

    const aCalc =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(aCalc), Math.sqrt(1 - aCalc));

    return R * c;
  }
}
