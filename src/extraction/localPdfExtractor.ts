import { PDFParse } from 'pdf-parse';
import { extractFromText, emptyFields } from './parsing';
import { DocumentExtractor, ExtractionResult } from './types';

/** Extracteur de référence : lit le texte d'un PDF puis applique des règles. */
export class LocalPdfExtractor implements DocumentExtractor {
  async extract(input: Buffer, source: string): Promise<ExtractionResult> {
    const isPdf = input.subarray(0, 4).toString('latin1') === '%PDF';
    if (!isPdf) {
      // Images et scans : hors périmètre de US-02 (voir US-04 pour les documents illisibles).
      return { source, fields: emptyFields() };
    }
    const parser = new PDFParse({ data: new Uint8Array(input) });
    try {
      const { text } = await parser.getText();
      return extractFromText(text, source);
    } finally {
      await parser.destroy();
    }
  }
}
