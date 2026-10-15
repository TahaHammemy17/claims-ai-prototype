/** Champs que le prototype sait extraire d'un document de remboursement. */
export type FieldName =
  | 'beneficiaire'
  | 'date_soins'
  | 'type_acte'
  | 'montant_facture'
  | 'base_remboursement'
  | 'taux_RO'
  | 'montant_RO';

/** "missing" = non trouvé dans le document. On ne devine jamais une valeur. */
export type FieldStatus = 'extracted' | 'missing';

export interface ExtractedField {
  status: FieldStatus;
  value: string | number | null;
}

export interface ExtractionResult {
  source: string;
  fields: Record<FieldName, ExtractedField>;
}

/**
 * Interface commune à tous les extracteurs (règles locales, AWS Bedrock plus tard).
 * Le reste de l'application ne dépend que de cette interface (voir ADR-001).
 */
export interface DocumentExtractor {
  extract(input: Buffer, source: string): Promise<ExtractionResult>;
}

export const ALL_FIELDS: FieldName[] = [
  'beneficiaire',
  'date_soins',
  'type_acte',
  'montant_facture',
  'base_remboursement',
  'taux_RO',
  'montant_RO',
];
