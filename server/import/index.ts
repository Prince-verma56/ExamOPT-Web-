import { parse as csvParse } from 'csv-parse/sync';
import { stringify as csvStringify } from 'csv-stringify/sync';

export interface ImportProvider {
  /**
   * Parse a file buffer into an array of generic records.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parse(fileBuffer: Buffer, mimeType: string): Promise<any[]>;
  
  /**
   * Validate generic records and return valid/invalid sets.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validate(records: any[], schema: any): Promise<{ valid: any[], errors: any[] }>;
}

export interface ExportProvider {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export(records: any[], mimeType: string): Promise<Buffer>;
}

export class GenericImportExportProvider implements ImportProvider, ExportProvider {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async parse(fileBuffer: Buffer, mimeType: string): Promise<any[]> {
    if (mimeType === 'application/json') {
      return JSON.parse(fileBuffer.toString('utf-8'));
    }
    
    if (mimeType === 'text/csv' || mimeType === 'application/csv') {
      return csvParse(fileBuffer.toString('utf-8'), {
        columns: true,
        skip_empty_lines: true,
      });
    }

    throw new Error(`Unsupported import format: ${mimeType}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async validate(records: any[], schema: any): Promise<{ valid: any[], errors: any[] }> {
    const valid = [];
    const errors = [];
    let rowIndex = 0;
    for (const record of records) {
      rowIndex++;
      const res = schema.safeParse(record);
      if (res.success) {
        valid.push(res.data);
      } else {
        errors.push({ rowIndex, record, error: res.error.errors });
      }
    }
    return { valid, errors };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async export(records: any[], mimeType: string): Promise<Buffer> {
    if (mimeType === 'application/json') {
      return Buffer.from(JSON.stringify(records, null, 2));
    }

    if (mimeType === 'text/csv' || mimeType === 'application/csv') {
      const csvStr = csvStringify(records, { header: true });
      return Buffer.from(csvStr);
    }

    throw new Error(`Unsupported export format: ${mimeType}`);
  }
}

export const importExportProvider = new GenericImportExportProvider();
