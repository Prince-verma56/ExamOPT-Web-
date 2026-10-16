import { LocationProvider, Coordinates, LocationResult } from '../interface';

/**
 * Mock Location Provider.
 */
export class MockLocationProvider implements LocationProvider {
  async geocode(address: string): Promise<LocationResult[]> {
    console.log(`[Location] Mock geocoding: ${address}`);
    return [{
      formattedAddress: address,
      coordinates: { lat: 37.7749, lng: -122.4194 }, // SF
      city: 'San Francisco',
      state: 'CA',
      country: 'USA'
    }];
  }

  async reverseGeocode(coordinates: Coordinates): Promise<LocationResult[]> {
    console.log(`[Location] Mock reverse geocoding: ${coordinates.lat}, ${coordinates.lng}`);
    return [{
      formattedAddress: 'San Francisco, CA',
      coordinates,
      city: 'San Francisco',
      state: 'CA',
      country: 'USA'
    }];
  }

  distance(a: Coordinates, b: Coordinates): number {
    // Simple mock Euclidean distance factor
    return Math.sqrt(Math.pow(a.lat - b.lat, 2) + Math.pow(a.lng - b.lng, 2)) * 111000;
  }
}
