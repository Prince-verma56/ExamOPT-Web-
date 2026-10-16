export interface StorageProvider {
  upload(file: File | Blob | Buffer, filename: string, folder?: string): Promise<{ url: string; path: string; size: number }>;
  delete(path: string): Promise<boolean>;
  getUrl(path: string): string;
}
