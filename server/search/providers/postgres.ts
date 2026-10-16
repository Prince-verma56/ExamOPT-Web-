/* eslint-disable @typescript-eslint/no-explicit-any */
import { SearchProvider, SearchQuery, SearchResult } from '../interface';
import { db } from '@/server/db/index';

/**
 * PostgreSQL Search Provider via Prisma.
 * Assumes proper indexes and optionally pg_trgm are set up in the schema.
 */
export class PostgresSearchProvider implements SearchProvider {
  async search<T>(indexName: string, query: SearchQuery): Promise<SearchResult<T>> {
    const page = query.pagination?.offset ? Math.floor(query.pagination.offset / (query.pagination.limit || 10)) + 1 : 1;
    const limit = query.pagination?.limit || 10;
    const skip = (page - 1) * limit;

    // A generic approach using Prisma $queryRawUnsafe or finding the model dynamically
    // For safety and typing, Prisma requires explicitly calling `db.modelName`.
    // In a generic search provider, we have to use Prisma's dynamic model access.
    
    const model = (db as any)[indexName];
    if (!model) {
      throw new Error(`[Search] Model ${indexName} not found in Prisma Client.`);
    }

    // Generic search over standard fields - requires models to support it
    // In a real generic implementation, we'd define which fields are searchable per model.
    // For this generic template, we'll try to search a 'title' or 'name' field if the term exists.
    const searchFilter = query.term ? {
      OR: [
        { title: { contains: query.term, mode: 'insensitive' } },
        { name: { contains: query.term, mode: 'insensitive' } },
        { content: { contains: query.term, mode: 'insensitive' } },
      ]
    } : {};

    const where = { ...searchFilter, ...query.filters };

    const [total, items] = await Promise.all([
      model.count({ where }),
      model.findMany({
        where,
        take: limit,
        skip,
        orderBy: query.sort ? { [query.sort.field]: query.sort.direction } : undefined,
      })
    ]);

    return {
      items,
      total,
      hasMore: skip + items.length < total,
    };
  }

  async indexDocument(indexName: string, id: string, document: any): Promise<void> {
    // Postgres manages its own indexes based on the Prisma schema.
    // Explicit indexing logic (like syncing to Algolia) is not needed for native Postgres.
  }

  async removeDocument(indexName: string, id: string): Promise<void> {
    // Similarly, native Postgres deletes handle this.
  }
}
