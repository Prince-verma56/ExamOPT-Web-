export interface ExportProvider {
  /**
   * Transform a generic array of records into a file buffer.
   */
  generate(records: unknown[], format: 'csv' | 'json'): Promise<Buffer>;
}

export class GenericExportProvider implements ExportProvider {
  async generate(records: unknown[], format: 'csv' | 'json'): Promise<Buffer> {
    if (format === 'json') {
      return Buffer.from(JSON.stringify(records, null, 2), 'utf-8');
    }
    // Future: generate CSV, PDF
    throw new Error(`Unsupported export format: ${format}`);
  }
}
