import { StorageProvider } from '../interface';

export class MockStorageProvider implements StorageProvider {
  async upload(file: File | Blob | Buffer, filename: string, folder?: string) {
    console.log(`[MockStorage] Uploading ${filename} to ${folder || 'root'}`);
    const path = folder ? `${folder}/${filename}` : filename;
    return {
      url: `https://mock-storage.local/${path}`,
      path,
      size: 1024,
    };
  }

  async delete(path: string) {
    console.log(`[MockStorage] Deleting ${path}`);
    return true;
  }

  getUrl(path: string) {
    return `https://mock-storage.local/${path}`;
  }
}
