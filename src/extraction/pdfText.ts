import { PDFParse } from 'pdf-parse';

/** Lit le texte d'un PDF. Retourne null si le fichier n'est pas un PDF (image, scan...). */
export async function readPdfText(input: Buffer): Promise<string | null> {
  const isPdf = input.subarray(0, 4).toString('latin1') === '%PDF';
  if (!isPdf) return null;
  const parser = new PDFParse({ data: new Uint8Array(input) });
  try {
    const { text } = await parser.getText();
    return text;
  } finally {
    await parser.destroy();
  }
}