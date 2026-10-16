import { SearchProvider, SearchQuery, SearchResult } from '../interface';

/**
 * Mock Search Provider.
 * Real implementation would use Prisma (e.g., PostgreSQL full-text search) 
 * or Elasticsearch/Algolia based on the indexName.
 */
export class MockSearchProvider implements SearchProvider {
  async search<T>(indexName: string, query: SearchQuery): Promise<SearchResult<T>> {
    console.log(`[Search] Mock searching ${indexName} for "${query.term}"`);
    return {
      items: [],
      total: 0,
      hasMore: false,
    };
  }

  async indexDocument(indexName: string, id: string, document: unknown): Promise<void> {
    console.log(`[Search] Mock indexing ${id} into ${indexName}`);
  }

  async removeDocument(indexName: string, id: string): Promise<void> {
    console.log(`[Search] Mock removing ${id} from ${indexName}`);
  }
}
