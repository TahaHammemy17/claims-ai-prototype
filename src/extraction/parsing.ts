import { ALL_FIELDS, ExtractedField, ExtractionResult, FieldName } from './types';

const AMOUNT = String.raw`(\d{1,3}(?:[ ]\d{3})*|\d+),(\d{2})`;

/** "1 234,50 €" -> 1234.5 */
export function parseAmount(raw: string): number | null {
  const m = raw.replace(/[\u00a0\u202f]/g, ' ').match(new RegExp(AMOUNT));
  if (!m) return null;
  return Number(`${m[1].replace(/ /g, '')}.${m[2]}`);
}

/** "12/03/2026" -> "2026-03-12" (null si le format n'est pas reconnu) */
export function parseDate(raw: string): string | null {
  const m = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  const [, d, mo, y] = m;
  if (Number(mo) < 1 || Number(mo) > 12 || Number(d) < 1 || Number(d) > 31) return null;
  return `${y}-${mo}-${d}`;
}

const missing = (): ExtractedField => ({ status: 'missing', value: null });
const found = (value: string | number): ExtractedField => ({ status: 'extracted', value });

export function emptyFields(): Record<FieldName, ExtractedField> {
  const out = {} as Record<FieldName, ExtractedField>;
  for (const f of ALL_FIELDS) out[f] = missing();
  return out;
}

function normalise(text: string): string[] {
  return text
    .replace(/[\u00a0\u202f]/g, ' ')
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 0);
}

/**
 * Extraction par règles à partir du texte d'un document.
 * Principe : un champ non trouvé reste "missing" (jamais deviné).
 */
export function extractFromText(text: string, source: string): ExtractionResult {
  const lines = normalise(text);
  const fields = emptyFields();

  // Bénéficiaire
  for (const l of lines) {
    const m = l.match(/^(?:Bénéficiaire|Beneficiaire)\s+(.+)$/i);
    if (m) { fields.beneficiaire = found(m[1].trim()); break; }
  }

  // Date des soins
  for (const l of lines) {
    const m = l.match(/^Date des soins\s+(.+)$/i);
    if (m) {
      const iso = parseDate(m[1]);
      if (iso) fields.date_soins = found(iso);
      break;
    }
  }

  // Montant facturé (facture)
  for (const l of lines) {
    const m = l.match(/^TOTAL À PAYER\s+(.+)$/i);
    if (m) {
      const amount = parseAmount(m[1]);
      if (amount !== null) fields.montant_facture = found(amount);
      break;
    }
  }

  // Facture : lignes entre "Désignation Montant" et "TOTAL À PAYER"
  const startFacture = lines.findIndex((l) => /^Désignation\b/i.test(l));
  if (startFacture >= 0) {
    const actes: string[] = [];
    for (let i = startFacture + 1; i < lines.length; i++) {
      if (/^TOTAL À PAYER/i.test(lines[i])) break;
      const m = lines[i].match(new RegExp(String.raw`^(.*?)\s+${AMOUNT}\s*€$`));
      if (m) actes.push(m[1].trim());
    }
    if (actes.length > 0) fields.type_acte = found(actes.join('; '));
  }

  // Décompte du régime obligatoire : acte, base, taux, montant versé
  const startDecompte = lines.findIndex((l) => /^Acte\b.*Base/i.test(l));
  if (startDecompte >= 0 && lines[startDecompte + 1]) {
    const m = lines[startDecompte + 1].match(
      new RegExp(String.raw`^(.*?)\s+${AMOUNT}\s*€\s+(\d{1,3})\s*%\s+${AMOUNT}\s*€$`),
    );
    if (m) {
      fields.type_acte = found(m[1].trim());
      fields.base_remboursement = found(parseAmount(`${m[2]},${m[3]}`) as number);
      fields.taux_RO = found(Number(m[4]));
      fields.montant_RO = found(parseAmount(`${m[5]},${m[6]}`) as number);
    }
  }

  return { source, fields };
}
