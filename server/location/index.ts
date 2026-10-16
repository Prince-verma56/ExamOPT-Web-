import { isFeatureEnabled } from '@/config/features';
import { LocationProvider } from './interface';
import { MockLocationProvider } from './providers/mock';
import { GoogleMapsLocationProvider } from './providers/google';

let activeLocationProvider: LocationProvider | null = null;
let activeMockProvider: LocationProvider | null = null;

export function getLocationProvider(): LocationProvider {
  if (!isFeatureEnabled('location')) {
    if (!activeMockProvider) activeMockProvider = new MockLocationProvider();
    return activeMockProvider;
  }

  if (!activeLocationProvider) {
    if (process.env.GOOGLE_MAPS_API_KEY) {
      activeLocationProvider = new GoogleMapsLocationProvider();
    } else {
      console.warn('Location is enabled but GOOGLE_MAPS_API_KEY is missing. Falling back to MockLocationProvider.');
      activeLocationProvider = new MockLocationProvider();
    }
  }

  return activeLocationProvider;
}
