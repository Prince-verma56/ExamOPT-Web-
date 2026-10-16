export interface FileMetadata {
  filename: string;
  mimeType: string;
  size: number;
  url?: string;
  extractedText?: string;
  width?: number;
  height?: number;
}

export interface FileProcessor {
  /**
   * Identifies if this processor can handle the given file
   */
  supports(mimeType: string): boolean;

  /**
   * Processes the file and returns metadata/results
   */
  process(fileBuffer: Buffer, metadata: FileMetadata): Promise<FileMetadata>;
}
