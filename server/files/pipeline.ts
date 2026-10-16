import { FileProcessor, FileMetadata } from '../processors/interface';
import { DocumentProcessor, RagDocumentProcessor, ImageProcessor } from '../processors/generic';

export class FileProcessingPipeline {
  private processors: FileProcessor[] = [];

  constructor() {
    this.registerProcessor(new DocumentProcessor());
    this.registerProcessor(new RagDocumentProcessor());
    this.registerProcessor(new ImageProcessor());
  }

  registerProcessor(processor: FileProcessor) {
    this.processors.push(processor);
  }

  async run(fileBuffer: Buffer, metadata: FileMetadata): Promise<FileMetadata> {
    let currentMetadata = metadata;
    
    // Run sequentially through all supporting processors
    for (const processor of this.processors) {
      if (processor.supports(currentMetadata.mimeType)) {
        currentMetadata = await processor.process(fileBuffer, currentMetadata);
      }
    }

    return currentMetadata;
  }
}

export const filePipeline = new FileProcessingPipeline();
