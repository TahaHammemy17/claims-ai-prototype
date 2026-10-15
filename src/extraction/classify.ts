import { readPdfText } from './pdfText';

/** Types de documents reconnus (RG-05). */
export type DocumentType = 'facture' | 'decompte' | 'devis' | 'non_reconnu';

/** Minuscules, sans accents, espaces simplifiés : "DÉCOMPTE" -> "decompte". */
function normalise(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u00a0\u202f]/g, ' ')
    .toLowerCase();
}

/**
 * Classe un document à partir de son texte.
 * 1) Le titre (première ligne non vide) est le signal principal.
 *    On ne cherche pas le mot "facture" partout : un devis contient la phrase
 *    "ce devis n'est pas une facture".
 * 2) À défaut, des mentions spécifiques à chaque type servent de signal de secours.
 * Sans signal clair, le document est "non_reconnu" : on ne devine pas.
 */
export function classifyText(text: string): DocumentType {
  const clean = normalise(text);
  const lines = clean
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 0);
  const title = lines[0] ?? '';

  if (/^devis\b/.test(title)) return 'devis';
  if (/^facture\b/.test(title)) return 'facture';
  if (/^decompte\b/.test(title)) return 'decompte';

  if (clean.includes('total du devis')) return 'devis';
  if (clean.includes('montant rembourse par le regime obligatoire')) return 'decompte';
  if (clean.includes('total a payer')) return 'facture';

  return 'non_reconnu';
}

/** Un devis n'entre pas dans le calcul de remboursement ; un document non reconnu non plus. */
export function isEligibleForRefund(type: DocumentType): boolean {
  return type === 'facture' || type === 'decompte';
}

/** Classe un fichier (PDF). Une image ou un format inconnu est "non_reconnu" (voir US-04). */
export async function classifyDocument(input: Buffer): Promise<DocumentType> {
  const text = await readPdfText(input);
  if (text === null) return 'non_reconnu';
  return classifyText(text);
}