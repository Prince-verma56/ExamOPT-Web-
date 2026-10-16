import { isFeatureEnabled } from '@/config/features';
import { SearchProvider } from './interface';
import { MockSearchProvider } from './providers/mock';
import { PostgresSearchProvider } from './providers/postgres';

let activeSearchProvider: SearchProvider | null = null;

export function getSearchProvider(): SearchProvider {
  if (!isFeatureEnabled('search')) {
    if (!activeSearchProvider) activeSearchProvider = new MockSearchProvider();
    return activeSearchProvider;
  }

  if (!activeSearchProvider) {
    activeSearchProvider = new PostgresSearchProvider();
  }

  return activeSearchProvider;
}
