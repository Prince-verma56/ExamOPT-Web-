export interface SearchQuery {
  term: string;
  filters?: Record<string, unknown>;
  sort?: { field: string; direction: 'asc' | 'desc' };
  pagination?: { limit: number; offset: number };
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}

export interface SearchProvider {
  /**
   * Search over a specific index/model with a term and filters.
   */
  search<T>(indexName: string, query: SearchQuery): Promise<SearchResult<T>>;
  
  /**
   * Index or re-index a document.
   */
  indexDocument(indexName: string, id: string, document: unknown): Promise<void>;
  
  /**
   * Remove a document from the index.
   */
  removeDocument(indexName: string, id: string): Promise<void>;
}
