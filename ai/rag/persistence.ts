 
 
import { db } from '@/server/db';
import { RAGDocument, RAGFoundation } from './index';
import { getAIProvider } from '../core/factory';
import { AIContext } from '../context';
import { Prisma } from '@prisma/client';

export class PersistentRAG extends RAGFoundation {
  
  async ingest(documents: RAGDocument[], userId?: string, organizationId?: string) {
    const ai = getAIProvider();

    for (const doc of documents) {
      // Create Document Record
      const createdDoc = await db.document.create({
        data: {
          userId,
          organizationId,
          filename: doc.metadata?.filename || 'Untitled',
          mimeType: doc.metadata?.mimeType || 'text/plain',
          source: doc.metadata?.source || null,
          metadata: doc.metadata || {},
        }
      });

      const chunks = this.chunkText(doc.content);
      const { embeddings } = await ai.embed({ input: chunks });

      // Insert chunks with vector embeddings
      for (let i = 0; i < chunks.length; i++) {
        // Use raw SQL to insert the vector since Prisma doesn't natively support creating vectors via standard create
        await db.$executeRaw`
          INSERT INTO "document_chunks" ("id", "documentId", "content", "chunkIndex", "metadata", "embedding")
          VALUES (
            gen_random_uuid()::text,
            ${createdDoc.id}, 
            ${chunks[i]}, 
            ${i}, 
            '{}'::jsonb, 
            ${embeddings[i]}::vector
          )
        `;
      }
      console.log(`[PersistentRAG] Ingested document ${createdDoc.id} with ${chunks.length} chunks.`);
    }
  }

  async retrieve(query: string, topK: number = 3, context?: AIContext): Promise<string[]> {
    const ai = getAIProvider();
    const { embeddings } = await ai.embed({ input: [query] });
    const queryVector = embeddings[0];

    // Build raw SQL query for pgvector cosine distance (<=>)
    // Filter by userId if context dictates
    let rawQuery;
    if (context?.userId) {
      rawQuery = Prisma.sql`
        SELECT dc.content
        FROM document_chunks dc
        JOIN documents d ON dc."documentId" = d.id
        WHERE d."userId" = ${context.userId}
        ORDER BY dc.embedding <=> ${queryVector}::vector
        LIMIT ${topK}
      `;
    } else {
      rawQuery = Prisma.sql`
        SELECT dc.content
        FROM document_chunks dc
        ORDER BY dc.embedding <=> ${queryVector}::vector
        LIMIT ${topK}
      `;
    }

    const results = await db.$queryRaw<{content: string}[]>(rawQuery);
    return results.map(r => r.content);
  }
}

export const persistentRag = new PersistentRAG();

