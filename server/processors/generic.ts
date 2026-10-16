import { FileProcessor, FileMetadata } from './interface';

import { persistentRag } from '@/ai/rag/persistence';

/**
 * Generic mock document processor for text/PDF/CSV.
 */
export class DocumentProcessor implements FileProcessor {
  supports(mimeType: string): boolean {
    return ['text/plain', 'application/pdf', 'text/csv'].includes(mimeType);
  }

  async process(fileBuffer: Buffer, metadata: FileMetadata): Promise<FileMetadata> {
    const text = `Extracted content from ${metadata.filename}`;
    return {
      ...metadata,
      extractedText: text,
    };
  }
}

/**
 * Feeds extracted text directly into the RAG pipeline.
 */
export class RagDocumentProcessor implements FileProcessor {
  supports(mimeType: string): boolean {
    return ['text/plain', 'application/pdf'].includes(mimeType);
  }

  async process(fileBuffer: Buffer, metadata: FileMetadata): Promise<FileMetadata> {
    // Assuming previous processor extracted text, or extract here
    const text = metadata.extractedText || `Dummy text from ${metadata.filename}`;
    
    // Chunk & Embed using RAG pipeline
    await persistentRag.ingest([{
      id: metadata.filename,
      content: text,
      metadata: { filename: metadata.filename, source: 'upload' }
    }]);

    return metadata;
  }
}

/**
 * Generic mock image processor.
 */
export class ImageProcessor implements FileProcessor {
  supports(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  async process(fileBuffer: Buffer, metadata: FileMetadata): Promise<FileMetadata> {
    // Mock dimensions extraction
    return {
      ...metadata,
      width: 1024,
      height: 768,
    };
  }
}
